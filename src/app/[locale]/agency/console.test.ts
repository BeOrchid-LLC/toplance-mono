import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";

import type { Actor } from "@/lib/auth/policy";
import type { Profile } from "@/lib/db/schema";

/**
 * The console's preamble, against the real database.
 *
 * One claim, and it is about a redirect that must not happen. A member
 * of a suspended agency holds an `org_members` row and no live `orgId`
 * — `liveMembershipsFor` drops the membership, which is how suspension
 * is enforced everywhere at once. The paywall added in `cd6e81c` read
 * the membership row instead, decided the agency owed money, and sent
 * the visitor to `/agency/billing`; that page cannot open without an
 * `orgId` and sends them back. The browser gives up with
 * ERR_TOO_MANY_REDIRECTS.
 *
 * Skipped without a database rather than mocked — mocking the two
 * queries that disagreed would test the mock, and the disagreement was
 * the bug.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

/** The Clerk session is the one seam; everything below it is real. */
let profile: Profile | null = null;
let actor: Actor | null = null;

vi.mock("@/lib/data/applications", () => ({
  getProfile: async () => profile,
  getActor: async () => actor,
}));

/**
 * `redirect()` throws in Next so the caller never continues. Throwing a
 * marker keeps that shape and makes the destination assertable.
 */
class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect(${to})`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
  notFound: () => {
    throw new Error("notFound()");
  },
}));

const SUSPENDED_MEMBER = "test_console_suspended";
const LIVE_MEMBER = "test_console_live";
const CANCELLED_MEMBER = "test_console_cancelled";
const PENDING_MEMBER = "test_console_pending";
const TWO_ORG_MEMBER = "test_console_two_orgs";
const USER_IDS = [
  SUSPENDED_MEMBER,
  LIVE_MEMBER,
  CANCELLED_MEMBER,
  PENDING_MEMBER,
  TWO_ORG_MEMBER,
];

const SUSPENDED_ORG = "00000000-0000-4000-8000-00000000c001";
const LIVE_ORG = "00000000-0000-4000-8000-00000000c002";
const CANCELLED_ORG = "00000000-0000-4000-8000-00000000c003";
const PENDING_ORG = "00000000-0000-4000-8000-00000000c004";
/** Inserted first, so an uncorrelated `limit(1)` is likely to find it. */
const STALE_ORG = "00000000-0000-4000-8000-00000000c005";
const SECOND_ORG = "00000000-0000-4000-8000-00000000c006";
const ORG_IDS = [
  STALE_ORG,
  SUSPENDED_ORG,
  LIVE_ORG,
  CANCELLED_ORG,
  PENDING_ORG,
  SECOND_ORG,
];

describe.skipIf(!hasDb)("resolveAgencyConsole", async () => {
  const { db } = await import("@/lib/db/client");
  const { orgMembers, organisations, payments, profiles } = await import(
    "@/lib/db/schema"
  );
  const { cancelSubscription, recordPayment } = await import(
    "@/lib/data/payments"
  );
  const { resolveAgencyConsole } = await import(
    "@/app/[locale]/agency/console"
  );

  beforeAll(async () => {
    // Three of these are activated, because they are fixtures about the
    // *paywall* — an agency BeOrchid has not let in never reaches the
    // question of whether it has paid, so leaving `activated_at` null
    // here would test the KYB gate three times and the paywall never.
    // `PENDING_ORG` is the one that has not been let in.
    await db.insert(organisations).values([
      // First in, so a `limit(1)` that does not say which agency it
      // means is likely to return this one — see the two-org test.
      // Suspended and never activated: the worst row to decide a KYB
      // redirect from.
      { id: STALE_ORG, name: "Stale Agency", suspendedAt: new Date() },
      { id: SECOND_ORG, name: "Second Agency", activatedAt: new Date() },
      {
        id: SUSPENDED_ORG,
        name: "Suspended Agency",
        suspendedAt: new Date(),
        activatedAt: new Date(),
      },
      { id: LIVE_ORG, name: "Live Agency", activatedAt: new Date() },
      { id: CANCELLED_ORG, name: "Departed Agency", activatedAt: new Date() },
      { id: PENDING_ORG, name: "Unverified Agency" },
    ]);

    await db.insert(profiles).values([
      {
        id: SUSPENDED_MEMBER,
        email: "suspended@test.invalid",
        fullName: "Suspended Owner",
        role: "org_member",
      },
      {
        id: LIVE_MEMBER,
        email: "live@test.invalid",
        fullName: "Live Owner",
        role: "org_member",
      },
      {
        id: CANCELLED_MEMBER,
        email: "cancelled@test.invalid",
        fullName: "Departed Owner",
        role: "org_member",
      },
      {
        id: PENDING_MEMBER,
        email: "pending@test.invalid",
        fullName: "Waiting Owner",
        role: "org_member",
      },
      {
        id: TWO_ORG_MEMBER,
        email: "two@test.invalid",
        fullName: "Two Orgs Owner",
        role: "org_member",
      },
    ]);

    await db.insert(orgMembers).values([
      { orgId: SUSPENDED_ORG, userId: SUSPENDED_MEMBER, role: "owner" },
      { orgId: LIVE_ORG, userId: LIVE_MEMBER, role: "owner" },
      { orgId: CANCELLED_ORG, userId: CANCELLED_MEMBER, role: "owner" },
      { orgId: PENDING_ORG, userId: PENDING_MEMBER, role: "owner" },
      { orgId: STALE_ORG, userId: TWO_ORG_MEMBER, role: "owner" },
      { orgId: SECOND_ORG, userId: TWO_ORG_MEMBER, role: "owner" },
    ]);

    // A month bought and then given up: paid, still inside its period,
    // and cancelled. Every column the paywall used to read says this
    // agency is entitled, so only the `cancelled_at` filter inside
    // `activeSubscription` keeps it out of the console.
    await recordPayment({
      kind: "agency_subscription",
      status: "paid",
      amountMinor: 300_00,
      currency: "USD",
      orgId: CANCELLED_ORG,
      payerId: CANCELLED_MEMBER,
      provider: "mock",
      periodStart: new Date(Date.now() - 60_000),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await cancelSubscription(CANCELLED_ORG);
  });

  afterAll(async () => {
    await db.delete(payments).where(inArray(payments.orgId, ORG_IDS));
    await db.delete(orgMembers).where(inArray(orgMembers.orgId, ORG_IDS));
    await db.delete(organisations).where(inArray(organisations.id, ORG_IDS));
    await db.delete(profiles).where(inArray(profiles.id, USER_IDS));
  });

  /** Signs the given fixture in, with the `orgIds` suspension leaves them. */
  async function signIn(userId: string, orgIds: string[]) {
    const [row] = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.id, [userId]));

    profile = row;
    actor = {
      userId,
      role: "org_member",
      staffRole: null,
      orgIds,
      orgs: orgIds.map((orgId) => ({ orgId, role: "owner" as const })),
    };
  }

  it("does not send a suspended agency's member to the paywall", async () => {
    // The loop. `liveMembershipsFor` has already dropped the membership,
    // so there is no agency to buy a plan for — and `/agency/billing`
    // would bounce them straight back here.
    await signIn(SUSPENDED_MEMBER, []);

    const console_ = await resolveAgencyConsole();

    expect(console_.orgId).toBeNull();
    expect(console_.subscriptionActive).toBe(false);
    // The bar still names the agency, which is the one thing the
    // membership row is read for.
    expect(console_.membership?.name).toBe("Suspended Agency");
  });

  it("still sends a live, unpaid agency to the paywall", async () => {
    // The other half: the fix must not be a hole in the paywall.
    await signIn(LIVE_MEMBER, [LIVE_ORG]);

    await expect(resolveAgencyConsole()).rejects.toThrow(
      "redirect(/agency/billing)"
    );
  });

  it("lets the billing page itself resolve without redirecting", async () => {
    await signIn(LIVE_MEMBER, [LIVE_ORG]);

    const console_ = await resolveAgencyConsole({ allowUnpaid: true });

    expect(console_.orgId).toBe(LIVE_ORG);
    expect(console_.subscriptionActive).toBe(false);
  });

  it("closes the console on an agency that ended its own plan", async () => {
    // The cancelled agency holds a paid subscription whose period has
    // not run out. Before `cancelled_at`, this member walked straight
    // into the console.
    await signIn(CANCELLED_MEMBER, [CANCELLED_ORG]);

    await expect(resolveAgencyConsole()).rejects.toThrow(
      "redirect(/agency/billing)"
    );
  });

  it("reads the KYB state of the agency the visitor is actually in", async () => {
    // Two memberships: a stale one in a suspended, never-activated
    // agency, and a live one in an activated agency. `actor.orgIds`
    // carries only the live one, so that is the agency every other part
    // of the decision is about.
    //
    // The membership select used to be `where(userId)` with a bare
    // `limit(1)` — an unordered pick. That was survivable while the row
    // only put a name in the bar; with `activated_at` in the select it
    // decides a redirect, and picking the stale row parks this director
    // on the holding screen forever for an agency that *is* activated.
    await signIn(TWO_ORG_MEMBER, [SECOND_ORG]);

    const console_ = await resolveAgencyConsole({ allowUnpaid: true });

    expect(console_.orgId).toBe(SECOND_ORG);
    expect(console_.kybActivated).toBe(true);
    expect(console_.membership?.name).toBe("Second Agency");
  });

  it("holds an unverified agency short of the paywall", async () => {
    // KYB before money, the order `decideAgencyBilling` puts them in.
    // An agency BeOrchid has not let in has nothing to buy yet.
    await signIn(PENDING_MEMBER, [PENDING_ORG]);

    await expect(resolveAgencyConsole()).rejects.toThrow(
      "redirect(/agency/verification)"
    );
  });

  it("does not let the paywall's own exemption open the KYB gate", async () => {
    // The one that matters. `/agency/billing` passes `allowUnpaid` so it
    // can render for an agency that owes money — and if the KYB check
    // sat inside that exemption, typing the billing URL would hand an
    // unverified business a Pay button. The two flags are independent
    // checks for exactly this reason.
    await signIn(PENDING_MEMBER, [PENDING_ORG]);

    await expect(
      resolveAgencyConsole({ allowUnpaid: true })
    ).rejects.toThrow("redirect(/agency/verification)");
  });

  it("lets the holding screen itself resolve without redirecting", async () => {
    await signIn(PENDING_MEMBER, [PENDING_ORG]);

    const console_ = await resolveAgencyConsole({ allowPending: true });

    expect(console_.orgId).toBe(PENDING_ORG);
    expect(console_.kybActivated).toBe(false);
    expect(console_.membership?.name).toBe("Unverified Agency");
  });

  it("still applies the paywall on the holding screen", async () => {
    // `/agency/verification` passes `allowPending` and not `allowUnpaid`,
    // so an agency that gets activated while sitting on that screen is
    // walked to the till rather than left waiting on a page about a
    // decision that has already been taken.
    await signIn(LIVE_MEMBER, [LIVE_ORG]);

    await expect(
      resolveAgencyConsole({ allowPending: true })
    ).rejects.toThrow("redirect(/agency/billing)");
  });

  it("lets that agency open the till it was just sent to", async () => {
    // The #77 shape, for the state cancellation adds. The loop was two
    // guards disagreeing about one person; cancellation is enforced
    // inside `activeSubscription`, which both of them read, so a
    // cancelled agency is an unpaid one to each of them at once — it
    // gets the paywall and the paywall opens.
    await signIn(CANCELLED_MEMBER, [CANCELLED_ORG]);

    const console_ = await resolveAgencyConsole({ allowUnpaid: true });

    expect(console_.orgId).toBe(CANCELLED_ORG);
    expect(console_.subscriptionActive).toBe(false);
    expect(console_.membership?.name).toBe("Departed Agency");
  });
});
