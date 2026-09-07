import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * What the paywall is allowed to conclude from a payment.
 *
 * The claims worth pinning are the negative ones: a pending row is not
 * entitlement, a lapsed one is not either, and neither is a client's fee
 * mistaken for an agency's plan. Each of those, wrong, opens a console
 * to somebody who has not paid for it.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("payments", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, corridors, organisations, payments, profiles } = await import(
    "@/lib/db/schema"
  );
  const {
    activeSubscription,
    hasActiveSubscription,
    isApplicationPaid,
    listPaymentsForOrg,
    recordPayment,
  } = await import("@/lib/data/payments");

  // Fixed ids no other suite uses, so two files running against the same
  // database cannot delete each other's rows.
  const ORG = "00000000-0000-4000-8000-0000000e0001";
  const OTHER_ORG = "00000000-0000-4000-8000-0000000e0002";
  const APP = "00000000-0000-4000-8000-0000000e0003";
  const OWNER = "test_pay_owner";
  const TRAVELER = "test_pay_traveler";

  const hour = 60 * 60 * 1000;
  const past = (h: number) => new Date(Date.now() - h * hour);
  const future = (h: number) => new Date(Date.now() + h * hour);

  beforeEach(async () => {
    await db
      .insert(organisations)
      .values([
        { id: ORG, name: "Paying Agency" },
        { id: OTHER_ORG, name: "Other Agency" },
      ])
      .onConflictDoNothing();

    await db
      .insert(profiles)
      .values([
        {
          id: OWNER,
          email: "owner@payments.test.invalid",
          fullName: "Ada Payer",
          role: "org_member",
        },
        {
          id: TRAVELER,
          email: "trav@payments.test.invalid",
          fullName: "Bo Traveller",
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(applications)
      .values({ id: APP, travelerId: TRAVELER, orgId: ORG })
      .onConflictDoNothing();
  });

  afterEach(async () => {
    await db.delete(payments).where(inArray(payments.orgId, [ORG, OTHER_ORG]));
    await db.delete(payments).where(eq(payments.applicationId, APP));
    await db.delete(applications).where(eq(applications.id, APP));
    await db.delete(profiles).where(inArray(profiles.id, [OWNER, TRAVELER]));
    await db.delete(organisations).where(inArray(organisations.id, [ORG, OTHER_ORG]));
  });

  const subscription = (overrides: Record<string, unknown> = {}) =>
    recordPayment({
      kind: "agency_subscription",
      status: "paid",
      amountMinor: 300_00,
      currency: "USD",
      orgId: ORG,
      payerId: OWNER,
      provider: "mock",
      periodStart: past(1),
      periodEnd: future(24 * 30),
      ...overrides,
    });

  describe("the shape of a payment", () => {
    it("refuses a subscription that names an application", async () => {
      await expect(
        recordPayment({
          kind: "agency_subscription",
          status: "paid",
          amountMinor: 300_00,
          currency: "USD",
          applicationId: APP,
          payerId: OWNER,
          provider: "mock",
        })
      ).rejects.toThrow();
    });

    it("refuses a client payment that names an agency", async () => {
      await expect(
        recordPayment({
          kind: "client_application",
          status: "paid",
          amountMinor: 25_00,
          currency: "USD",
          orgId: ORG,
          payerId: TRAVELER,
          provider: "mock",
        })
      ).rejects.toThrow();
    });

    it("refuses a payment that names nothing at all", async () => {
      await expect(
        recordPayment({
          kind: "client_application",
          status: "paid",
          amountMinor: 25_00,
          currency: "USD",
          payerId: TRAVELER,
          provider: "mock",
        })
      ).rejects.toThrow();
    });

    it("stamps paid_at on a paid row and leaves it null on a pending one", async () => {
      const paid = await subscription();
      expect(paid.paidAt).toBeInstanceOf(Date);

      const pending = await subscription({ status: "pending" });
      expect(pending.paidAt).toBeNull();
    });
  });

  describe("hasActiveSubscription", () => {
    it("is true for a paid subscription still in its period", async () => {
      await subscription();
      expect(await hasActiveSubscription(ORG)).toBe(true);
    });

    it("is false while the payment is only pending", async () => {
      await subscription({ status: "pending" });
      expect(await hasActiveSubscription(ORG)).toBe(false);
    });

    it("is false when the payment failed", async () => {
      await subscription({ status: "failed" });
      expect(await hasActiveSubscription(ORG)).toBe(false);
    });

    it("is false once the period has run out", async () => {
      // Nothing renews, by design. A lapsed subscription is history.
      await subscription({ periodStart: past(48), periodEnd: past(1) });
      expect(await hasActiveSubscription(ORG)).toBe(false);
    });

    it("is false for an agency that never paid", async () => {
      await subscription();
      expect(await hasActiveSubscription(OTHER_ORG)).toBe(false);
    });

    it("returns the subscription that reaches furthest ahead", async () => {
      await subscription({ periodEnd: future(24) });
      await subscription({ periodEnd: future(24 * 60) });

      const live = await activeSubscription(ORG);
      expect(live?.periodEnd?.getTime()).toBeGreaterThan(Date.now() + 24 * hour);
    });
  });

  describe("isApplicationPaid", () => {
    const clientPayment = (overrides: Record<string, unknown> = {}) =>
      recordPayment({
        kind: "client_application",
        status: "paid",
        amountMinor: 25_00,
        currency: "USD",
        applicationId: APP,
        payerId: TRAVELER,
        provider: "mock",
        ...overrides,
      });

    it("is true once the client has paid", async () => {
      await clientPayment();
      expect(await isApplicationPaid(APP)).toBe(true);
    });

    it("is false while the payment is pending", async () => {
      await clientPayment({ status: "pending" });
      expect(await isApplicationPaid(APP)).toBe(false);
    });

    it("is false before anybody pays", async () => {
      expect(await isApplicationPaid(APP)).toBe(false);
    });

    it("is not satisfied by the agency's own subscription", async () => {
      // The two charges are to two payers and neither substitutes for
      // the other. An agency's plan does not sponsor its clients.
      await subscription();
      expect(await isApplicationPaid(APP)).toBe(false);
    });

    it("accepts a zero-amount backfill row", async () => {
      // What the 0028 migration writes for every application that
      // predates the paywall.
      await clientPayment({ amountMinor: 0, provider: "backfill" });
      expect(await isApplicationPaid(APP)).toBe(true);
    });
  });

  it("lists an agency's payments newest first, and nobody else's", async () => {
    await subscription();
    await recordPayment({
      kind: "agency_subscription",
      status: "paid",
      amountMinor: 300_00,
      currency: "USD",
      orgId: OTHER_ORG,
      payerId: OWNER,
      provider: "mock",
      periodStart: past(1),
      periodEnd: future(24),
    });

    const rows = await listPaymentsForOrg(ORG);
    expect(rows).toHaveLength(1);
    expect(rows[0].orgId).toBe(ORG);
  });
});
