import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decideStaffGate, requireStaffAction } from "@/lib/auth/staff-gate";
import type { Actor } from "@/lib/auth/policy";

/**
 * Two seams, and only two. `twoFactorEnabled` is a fact only Clerk's
 * backend holds and no test process has a Clerk session; `suspendedAt`
 * is a column, and no test process has a database. Everything else below
 * — the decision, the ordering, the messages — is the real module.
 */
let twoFactorEnabled = false;
let suspended = false;

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: async () => ({ twoFactorEnabled }),
  auth: async () => ({ userId: null }),
}));

vi.mock("@/lib/data/staff", () => ({
  isSuspendedColleague: async () => suspended,
}));

/**
 * The pure decision `requireStaffConsole` is built around: given who
 * someone is, whether a director has closed their account, and whether
 * Clerk says they have a second factor enrolled, which screen do they
 * see. No Clerk network call, no database — plain objects in, one of
 * five strings out.
 */
describe("decideStaffGate", () => {
  it("refuses a non-staff account, whatever its 2FA state", () => {
    expect(decideStaffGate({ isStaff: false, suspended: false, twoFactorEnabled: false })).toBe(
      "refuse"
    );
    expect(decideStaffGate({ isStaff: false, suspended: false, twoFactorEnabled: true })).toBe(
      "refuse"
    );
  });

  it("blocks a staff account with no second factor enrolled", () => {
    expect(decideStaffGate({ isStaff: true, suspended: false, twoFactorEnabled: false })).toBe(
      "enroll"
    );
  });

  it("lets a staff account with a second factor through", () => {
    expect(decideStaffGate({ isStaff: true, suspended: false, twoFactorEnabled: true })).toBe(
      "ok"
    );
  });

  /**
   * A suspension outranks both checks below it. Neither of them is the
   * answer a suspended colleague needs, and one of them would send them
   * off to enrol an authenticator app that changes nothing.
   */
  describe("on a suspended account", () => {
    it("says so, rather than reporting a missing second factor", () => {
      expect(
        decideStaffGate({ isStaff: true, suspended: true, twoFactorEnabled: false })
      ).toBe("suspended");
    });

    it("says so even where the rank would also have refused", () => {
      expect(
        decideStaffGate({
          isStaff: true,
          suspended: true,
          twoFactorEnabled: true,
          staffRole: "reviewer",
          requireRole: "owner",
        })
      ).toBe("suspended");
    });

    it("still refuses a non-staff account as not staff", () => {
      // Suspension is a staff column; a traveller carrying one is a row
      // the check constraint forbids, and the honest answer is the one
      // about their role.
      expect(
        decideStaffGate({ isStaff: false, suspended: true, twoFactorEnabled: true })
      ).toBe("refuse");
    });
  });

  /**
   * The director's dashboard carries revenue, and `staff_role` already
   * distinguishes an owner from a reviewer. Until this, nothing did
   * anything with that distinction — both ops screens gate on staff-ness
   * alone.
   */
  describe("on a screen that asks for a specific staff role", () => {
    it("turns a reviewer away from an owner-only screen", () => {
      expect(
        decideStaffGate({
          isStaff: true,
          suspended: false,
          twoFactorEnabled: true,
          staffRole: "reviewer",
          requireRole: "owner",
        })
      ).toBe("refuse-role");
    });

    it("lets an owner through", () => {
      expect(
        decideStaffGate({
          isStaff: true,
          suspended: false,
          twoFactorEnabled: true,
          staffRole: "owner",
          requireRole: "owner",
        })
      ).toBe("ok");
    });

    it("refuses a reviewer outright rather than sending them to enrol first", () => {
      // Enrolling an authenticator app would not get them in, so asking
      // for one is a walk to a door that stays shut.
      expect(
        decideStaffGate({
          isStaff: true,
          suspended: false,
          twoFactorEnabled: false,
          staffRole: "reviewer",
          requireRole: "owner",
        })
      ).toBe("refuse-role");
    });

    it("leaves screens that ask for no particular role exactly as they were", () => {
      expect(
        decideStaffGate({
          isStaff: true,
          suspended: false,
          twoFactorEnabled: true,
          staffRole: "reviewer",
        })
      ).toBe("ok");
    });
  });
});

/**
 * The same decision applied to the writes rather than the screens. Ops
 * server actions are POST endpoints with public ids — gating the console
 * on a second factor and its actions on the role alone would leave every
 * staff write reachable from a session that never enrolled one.
 */
describe("requireStaffAction", () => {
  const staff: Actor = {
    userId: "staff_1",
    role: "staff",
    staffRole: "reviewer",
    orgIds: [],
    orgs: [],
  };
  const traveller: Actor = { ...staff, userId: "trav_1", role: "traveler", staffRole: null };

  // A developer's own `.env.local` may well carry the e2e seam — it is
  // what lets a local ops console be opened without an authenticator
  // app. Cleared here so these assert the gate, not the machine.
  beforeEach(() => {
    vi.stubEnv("E2E_SKIP_STAFF_2FA", "");
  });

  afterEach(() => {
    twoFactorEnabled = false;
    suspended = false;
    vi.unstubAllEnvs();
  });

  it("refuses a traveller, whatever Clerk says about their second factor", async () => {
    twoFactorEnabled = true;
    expect(await requireStaffAction(traveller)).toEqual({
      error: "You do not have access to that.",
    });
  });

  it("refuses a session with no actor at all", async () => {
    expect(await requireStaffAction(null)).toHaveProperty("error");
  });

  it("turns a staff account with nothing enrolled away from the write", async () => {
    twoFactorEnabled = false;
    const result = await requireStaffAction(staff);
    expect(result).toHaveProperty("error");
    expect("error" in result && result.error).toMatch(/two-step verification/);
  });

  it("lets a staff account with a second factor act", async () => {
    twoFactorEnabled = true;
    expect(await requireStaffAction(staff)).toEqual({ actor: staff });
  });

  /**
   * The half of a suspension that closes the writes. The console
   * redirect handles somebody who reloads; this handles the tab they
   * already had open, whose buttons still post.
   */
  it("closes every ops write to a suspended colleague", async () => {
    twoFactorEnabled = true;
    suspended = true;
    const result = await requireStaffAction(staff);
    expect(result).toHaveProperty("error");
    expect("error" in result && result.error).toMatch(/suspended/);
  });

  it("does not cost a traveller the suspension read", async () => {
    // Nothing to assert about the query itself; what matters is that a
    // suspended flag on a non-staff account cannot change the answer.
    suspended = true;
    expect(await requireStaffAction(traveller)).toEqual({
      error: "You do not have access to that.",
    });
  });

  it("keeps the e2e seam from standing a suspension down", async () => {
    // The seam exists so the suite need not enrol an authenticator app.
    // A suspension is not a second factor, and skipping it would make
    // the e2e environment the one place this act does nothing.
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("E2E_SKIP_STAFF_2FA", "1");
    suspended = true;
    expect(await requireStaffAction(staff)).toHaveProperty("error");
  });

  it("honours the e2e seam outside production — the suite cannot enrol an app", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("E2E_SKIP_STAFF_2FA", "1");
    expect(await requireStaffAction(staff)).toEqual({ actor: staff });
  });

  it("ignores the e2e seam in production, however it got set there", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_SKIP_STAFF_2FA", "1");
    expect(await requireStaffAction(staff)).toHaveProperty("error");
  });
});
