import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

import type { Actor } from "@/lib/auth/policy";

/**
 * Starting and ending a plan, from the POST to the row.
 *
 * Both actions are public endpoints like every other server action: the
 * buttons that post to them are rendered only for a director, and that
 * is not a check. So the claims worth pinning are the refusals — a
 * reviewer can neither close their colleagues' console nor charge their
 * employer, and a member of one agency cannot close another's — and they
 * are asserted against the real database rather than a mocked guard,
 * because a mocked guard would only prove the mock says no.
 *
 * The Clerk session is the one seam. `revalidatePath` is stubbed because
 * it needs a request store that no test has.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

let actor: Actor | null = null;

vi.mock("@/lib/data/applications", () => ({
  getActor: async () => actor,
  getProfile: async () => null,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Both read the request — the locale off the URL, the cache off the
// render — and neither exists outside one.
vi.mock("@/lib/i18n/server", () => ({
  getLocale: async () => "en",
  getActionLocale: async () => "en",
}));

const DIRECTOR = "test_cancel_director";
const REVIEWER = "test_cancel_reviewer";
const OUTSIDER = "test_cancel_outsider";
const USER_IDS = [DIRECTOR, REVIEWER, OUTSIDER];

const ORG = "00000000-0000-4000-8000-00000000d001";
const OTHER_ORG = "00000000-0000-4000-8000-00000000d002";
const ORG_IDS = [ORG, OTHER_ORG];

describe.skipIf(!hasDb)("agency plan actions", async () => {
  const { db } = await import("@/lib/db/client");
  const { auditLog, analyticsEvents, orgMembers, organisations, payments, profiles } =
    await import("@/lib/db/schema");
  const { hasActiveSubscription, recordPayment } = await import(
    "@/lib/data/payments"
  );
  const { cancelSubscription, purchaseSubscription } = await import("./actions");

  /** Signs in as one of the fixtures, at the rank they hold in `ORG`. */
  function signIn(userId: string, orgs: { orgId: string; role: "owner" | "reviewer" }[]) {
    actor = {
      userId,
      role: "org_member",
      staffRole: null,
      orgIds: orgs.map((o) => o.orgId),
      orgs,
    };
  }

  /** A month bought a minute ago and running for another thirty days. */
  const buyMonth = (orgId = ORG, payerId = DIRECTOR) =>
    recordPayment({
      kind: "agency_subscription",
      status: "paid",
      amountMinor: 300_00,
      currency: "USD",
      orgId,
      payerId,
      provider: "mock",
      periodStart: new Date(Date.now() - 60_000),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

  beforeEach(async () => {
    // The audit trail first, and every run rather than only at the end:
    // `actor_id` is `on delete set null`, so a row left behind by the
    // previous test survives the profile it names and would be read here
    // as this test's entry, written by nobody.
    await db.delete(auditLog).where(inArray(auditLog.subjectId, ORG_IDS));
    await db.delete(analyticsEvents).where(inArray(analyticsEvents.userId, USER_IDS));
    await db.delete(payments).where(inArray(payments.orgId, ORG_IDS));
    await db.delete(orgMembers).where(inArray(orgMembers.orgId, ORG_IDS));
    await db.delete(profiles).where(inArray(profiles.id, USER_IDS));
    await db.delete(organisations).where(inArray(organisations.id, ORG_IDS));

    await db.insert(organisations).values([
      { id: ORG, name: "Leaving Agency" },
      { id: OTHER_ORG, name: "Staying Agency" },
    ]);

    await db.insert(profiles).values([
      {
        id: DIRECTOR,
        email: "director@cancel.test.invalid",
        fullName: "Dele Director",
        role: "org_member",
      },
      {
        id: REVIEWER,
        email: "reviewer@cancel.test.invalid",
        fullName: "Remi Reviewer",
        role: "org_member",
      },
      {
        id: OUTSIDER,
        email: "outsider@cancel.test.invalid",
        fullName: "Ola Outsider",
        role: "org_member",
      },
    ]);

    await db.insert(orgMembers).values([
      { orgId: ORG, userId: DIRECTOR, role: "owner" },
      { orgId: ORG, userId: REVIEWER, role: "reviewer" },
      { orgId: OTHER_ORG, userId: OUTSIDER, role: "owner" },
    ]);
  });

  afterAll(async () => {
    await db.delete(auditLog).where(inArray(auditLog.subjectId, ORG_IDS));
    await db.delete(analyticsEvents).where(inArray(analyticsEvents.userId, USER_IDS));
    await db.delete(payments).where(inArray(payments.orgId, ORG_IDS));
    await db.delete(orgMembers).where(inArray(orgMembers.orgId, ORG_IDS));
    await db.delete(profiles).where(inArray(profiles.id, USER_IDS));
    await db.delete(organisations).where(inArray(organisations.id, ORG_IDS));
    actor = null;
  });

  it("closes the console the director had paid for", async () => {
    await buyMonth();
    signIn(DIRECTOR, [{ orgId: ORG, role: "owner" }]);

    expect(await cancelSubscription()).toEqual({ ok: true, alreadyEnded: false });
    expect(await hasActiveSubscription(ORG)).toBe(false);
  });

  it("takes nothing the second time, and says so", async () => {
    await buyMonth();
    signIn(DIRECTOR, [{ orgId: ORG, role: "owner" }]);
    await cancelSubscription();

    // The same shape `purchaseSubscription` uses for a double-click:
    // succeeded, changed nothing. An error here would tell a director
    // whose first click landed that their agency is still open.
    expect(await cancelSubscription()).toEqual({ ok: true, alreadyEnded: true });
  });

  it("refuses a reviewer, and leaves the plan running", async () => {
    // The whole reason this action asks for rank rather than membership:
    // ending a plan shuts the director's own console, and everybody
    // else's with it.
    await buyMonth();
    signIn(REVIEWER, [{ orgId: ORG, role: "reviewer" }]);

    expect(await cancelSubscription()).toEqual({
      error: "You do not have access to that.",
    });
    expect(await hasActiveSubscription(ORG)).toBe(true);
  });

  /**
   * The other end of the same plan, and the check it was missing until
   * 8 September.
   *
   * `purchaseSubscription` asked `requireOrgAccess` — do you belong to
   * this agency — and stopped there, so any travel agent could charge
   * their employer for a month by posting to an endpoint whose button
   * they were never shown. An earlier note in this file argued that
   * buying was any colleague's to do because it only ever restores
   * access; the client's answer on 8 September was that what the agency
   * pays is the director's, and spending somebody else's money is not
   * made harmless by the thing it buys.
   *
   * A reviewer locked out by a lapsed plan is not stranded by this: the
   * billing page tells them the plan has ended and that a director can
   * start it again.
   */
  it("refuses a reviewer, and charges the agency nothing", async () => {
    signIn(REVIEWER, [{ orgId: ORG, role: "reviewer" }]);

    expect(await purchaseSubscription()).toEqual({
      error: "You do not have access to that.",
    });

    // The refusal lands before the rate card is read, so there is no
    // provider call to have half-happened and no row to roll back.
    expect(await hasActiveSubscription(ORG)).toBe(false);
    const rows = await db.select().from(payments).where(eq(payments.orgId, ORG));
    expect(rows).toEqual([]);
  });

  it("refuses a buyer with no agency at all", async () => {
    signIn(REVIEWER, []);

    expect(await purchaseSubscription()).toEqual({
      error: "You do not have access to that.",
    });
  });

  it("refuses a director of a different agency", async () => {
    // `orgIds[0]` is the caller's own agency, so this cannot reach ORG
    // at all — the assertion is that it does not, and that being an
    // owner somewhere else buys nothing here.
    await buyMonth();
    signIn(OUTSIDER, [{ orgId: OTHER_ORG, role: "owner" }]);

    await cancelSubscription();

    expect(await hasActiveSubscription(ORG)).toBe(true);
  });

  it("refuses a session with no agency at all", async () => {
    signIn(DIRECTOR, []);

    expect(await cancelSubscription()).toEqual({
      error: "You do not have access to that.",
    });
  });

  it("records who ended the plan and when it was due to run to", async () => {
    // The audit trail is the only place this is answerable afterwards:
    // the payment row says the agency left, not which director decided.
    const month = await buyMonth();
    signIn(DIRECTOR, [{ orgId: ORG, role: "owner" }]);

    await cancelSubscription();

    const [entry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.subjectId, ORG));

    expect(entry).toMatchObject({
      actorId: DIRECTOR,
      action: "subscription.cancelled",
      subjectType: "organisation",
    });
    expect(entry.meta).toMatchObject({
      periodEnd: month.periodEnd?.toISOString(),
    });
  });
});
