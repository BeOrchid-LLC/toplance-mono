import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decideStaffGate, requireStaffAction } from "@/lib/auth/staff-gate";
import type { Actor } from "@/lib/auth/policy";

/**
 * The one seam: `twoFactorEnabled` is a fact only Clerk's backend holds,
 * and no test process has a Clerk session. Everything else below —
 * the decision, the seam, the messages — is the real module.
 */
let twoFactorEnabled = false;

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: async () => ({ twoFactorEnabled }),
  auth: async () => ({ userId: null }),
}));

/**
 * The pure decision `requireStaffConsole` is built around: given who
 * someone is and whether Clerk says they have a second factor enrolled,
 * which of the three screens do they see. No Clerk network call, no
 * database — plain objects in, one of three strings out.
 */
describe("decideStaffGate", () => {
  it("refuses a non-staff account, whatever its 2FA state", () => {
    expect(decideStaffGate({ isStaff: false, twoFactorEnabled: false })).toBe(
      "refuse"
    );
    expect(decideStaffGate({ isStaff: false, twoFactorEnabled: true })).toBe(
      "refuse"
    );
  });

  it("blocks a staff account with no second factor enrolled", () => {
    expect(decideStaffGate({ isStaff: true, twoFactorEnabled: false })).toBe(
      "enroll"
    );
  });

  it("lets a staff account with a second factor through", () => {
    expect(decideStaffGate({ isStaff: true, twoFactorEnabled: true })).toBe(
      "ok"
    );
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
