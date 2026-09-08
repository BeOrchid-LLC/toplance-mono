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
  const { applications, organisations, payments, profiles } = await import(
    "@/lib/db/schema"
  );
  const {
    activeSubscription,
    cancelSubscription,
    hasActiveSubscription,
    isApplicationPaid,
    latestSubscription,
    listInvoices,
    listPaymentsForOrg,
    recordPayment,
  } = await import("@/lib/data/payments");

  // Fixed ids no other suite uses, so two files running against the same
  // database cannot delete each other's rows.
  //
  // Moved off the `…e000n` block, which `organisations.test.ts` claims
  // too. Vitest runs the files in parallel against one database, so the
  // two suites raced: this one holds an application against `ORG` while
  // that one drops the organisation, and the loser dies on
  // `applications_org_id_organisations_id_fk`. It surfaced when this
  // file grew, which is the only reason a collision that was always
  // there had not bitten yet.
  const ORG = "00000000-0000-4000-8000-0000000e1001";
  const OTHER_ORG = "00000000-0000-4000-8000-0000000e1002";
  const APP = "00000000-0000-4000-8000-0000000e1003";
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

  /**
   * The director's dashboard reads these. `statusFor` is unit tested
   * without a database; what needs one is the join — that a cycle finds
   * the payment rows that actually fall inside it, and finds no others.
   *
   * The claim these exist for is the negative one: an unpaid cycle must
   * come back `open`, never `paid`. An earlier draft of this screen
   * generated settlement from a hash because there was no `payments`
   * table to read, and the fixtures below are what stops that returning
   * as a plausible figure in a board pack.
   */
  describe("invoices for the dashboard", () => {
    // Both fixture agencies are created by `beforeEach`, so their first
    // cycle is open right now and every invoice is theirs alone.
    const invoicesForOrg = async (now = new Date()) =>
      (await listInvoices({ now })).filter((i) => i.orgId === ORG);

    it("bills an open cycle as a draft, with nothing collected", async () => {
      const [current] = await invoicesForOrg();
      expect(current.status).toBe("draft");
      expect(current.paidAt).toBeNull();
      // The base fee is running up whether or not anybody has applied.
      expect(current.amountMinor).toBeGreaterThan(0);
    });

    it("settles the cycle a paid subscription falls inside", async () => {
      const [current] = await invoicesForOrg();
      const paidOn = new Date(current.cycleStart.getTime() + 60_000);

      await subscription({ status: "paid", periodStart: paidOn });

      const [settled] = await invoicesForOrg();
      expect(settled.status).toBe("paid");
    });

    it("leaves a cycle alone when the payment belongs to a different one", async () => {
      const [current] = await invoicesForOrg();
      // A millisecond before this cycle opened, which is the previous
      // cycle's business. `cycleFor` is half-open, so an off-by-one here
      // would settle the wrong month.
      const before = new Date(current.cycleStart.getTime() - 1);

      await subscription({ status: "paid", periodStart: before });

      const [unsettled] = await invoicesForOrg();
      expect(unsettled.status).toBe("draft");
    });

    it("ignores a client's own application fee", async () => {
      // A traveller paying for their case settles nothing on the
      // agency's monthly bill — different payer, different thing bought.
      // No `period_start`, so it falls back to `created_at` and lands
      // squarely inside the open cycle: `kind` is the only thing keeping
      // it out of the books.
      await recordPayment({
        kind: "client_application",
        status: "paid",
        amountMinor: 50_00,
        currency: "USD",
        applicationId: APP,
        payerId: TRAVELER,
        provider: "mock",
      });

      const [after] = await invoicesForOrg();
      expect(after.status).toBe("draft");
    });

    it("never invoices a client for a cycle that closed before it existed", async () => {
      // Six cycles asked for, one organisation a few moments old.
      const invoices = await invoicesForOrg();
      expect(invoices).toHaveLength(1);
    });

    describe("narrowed to one agency", () => {
      // What the agency console's own bill panel reads. The claim worth
      // pinning is that narrowing the *input* did not become a second
      // way of pricing a cycle: same agency, same figures, whoever asked.
      it("returns exactly what filtering the whole platform would", async () => {
        const now = new Date();
        await subscription({
          status: "paid",
          periodStart: new Date(now.getTime() - 60_000),
        });

        const narrowed = await listInvoices({ now, orgId: ORG });
        const filtered = (await listInvoices({ now })).filter(
          (i) => i.orgId === ORG
        );

        expect(narrowed).toEqual(filtered);
        expect(narrowed.length).toBeGreaterThan(0);
      });

      it("never returns another agency's cycles", async () => {
        // `OTHER_ORG` is a live fixture agency with its own open cycle,
        // so an unfiltered read here would come back with rows.
        const invoices = await listInvoices({ orgId: ORG });
        expect(invoices.every((i) => i.orgId === ORG)).toBe(true);
      });

      it("is empty for an agency that does not exist", async () => {
        const invoices = await listInvoices({
          orgId: "00000000-0000-4000-8000-0000000e0009",
        });
        expect(invoices).toEqual([]);
      });
    });
  });

  /**
   * Cancellation, which in a product where nothing renews can only mean
   * one thing: ending the period the agency has already paid for.
   *
   * The stamp is `cancelled_at` rather than a payment status, and the
   * last claim below is why. `listInvoices` settles a cycle from
   * `status`, so a month that was genuinely collected has to go on
   * reading paid after the agency walks out of it. Entitlement stops;
   * the books do not move.
   */
  describe("cancelSubscription", () => {
    it("ends the entitlement the moment it is stamped", async () => {
      await subscription();
      expect(await hasActiveSubscription(ORG)).toBe(true);

      await cancelSubscription(ORG);

      expect(await hasActiveSubscription(ORG)).toBe(false);
    });

    it("ends every period that was still running, not just the furthest", async () => {
      // `purchaseSubscription` refuses to sell a second month while one
      // is live, so two overlapping rows are a race rather than a normal
      // state. Stamping only the row `activeSubscription` happens to
      // return would leave the console open while the director has been
      // told it is shut.
      await subscription({ periodEnd: future(24) });
      await subscription({ periodEnd: future(24 * 60) });

      const ended = await cancelSubscription(ORG);

      expect(ended).toHaveLength(2);
      expect(await hasActiveSubscription(ORG)).toBe(false);
    });

    it("leaves a period that already lapsed alone", async () => {
      // History. Stamping it would rewrite a month that ran its full
      // course as one the agency walked out of.
      await subscription({ periodStart: past(48), periodEnd: past(1) });

      expect(await cancelSubscription(ORG)).toHaveLength(0);
    });

    it("stamps nothing the second time", async () => {
      await subscription();
      await cancelSubscription(ORG);

      // What makes the action idempotent: a double-clicked button cannot
      // move the date the agency ended its plan.
      expect(await cancelSubscription(ORG)).toHaveLength(0);
    });

    it("leaves another agency's live plan running", async () => {
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

      await cancelSubscription(ORG);

      expect(await hasActiveSubscription(OTHER_ORG)).toBe(true);
    });

    it("keeps the cancelled payment in the agency's history", async () => {
      await subscription();
      await cancelSubscription(ORG);

      const rows = await listPaymentsForOrg(ORG);
      expect(rows).toHaveLength(1);
      expect(rows[0].cancelledAt).toBeInstanceOf(Date);
    });

    it("still settles the cycle the cancelled payment was made in", async () => {
      // The money moved. A board pack that un-collects it the day an
      // agency leaves is a board pack that disagrees with the bank.
      const forOrg = async () => (await listInvoices({})).filter((i) => i.orgId === ORG);
      const [current] = await forOrg();
      await subscription({
        periodStart: new Date(current.cycleStart.getTime() + 60_000),
      });

      await cancelSubscription(ORG);

      const [settled] = await forOrg();
      expect(settled.status).toBe("paid");
    });
  });

  /**
   * What the billing screen says when nothing is running.
   *
   * "Your plan ended" and "you ended your plan" are different sentences,
   * and `activeSubscription` can tell neither apart: it answers `null`
   * for a lapsed plan, a cancelled one and an agency that never paid
   * alike.
   */
  describe("latestSubscription", () => {
    it("is null for an agency that never paid", async () => {
      expect(await latestSubscription(ORG)).toBeNull();
    });

    it("returns a lapsed plan, still carrying the date it ran out", async () => {
      await subscription({ periodStart: past(48), periodEnd: past(1) });

      const last = await latestSubscription(ORG);
      expect(last?.periodEnd?.getTime()).toBeLessThan(Date.now());
      expect(last?.cancelledAt).toBeNull();
    });

    it("returns a cancelled plan carrying the date it was ended", async () => {
      await subscription();
      await cancelSubscription(ORG);

      const last = await latestSubscription(ORG);
      expect(last?.cancelledAt).toBeInstanceOf(Date);
    });

    it("ignores a payment that never went through", async () => {
      // A failed card is not a plan the agency once held, and a screen
      // telling them theirs "ended" would be a receipt for nothing.
      await subscription({ status: "failed" });
      expect(await latestSubscription(ORG)).toBeNull();
    });

    it("prefers the plan that reached furthest ahead", async () => {
      await subscription({ periodEnd: past(1) });
      await subscription({ periodEnd: future(24) });

      const last = await latestSubscription(ORG);
      expect(last?.periodEnd?.getTime()).toBeGreaterThan(Date.now());
    });

    it("is not satisfied by another agency's plan", async () => {
      await subscription();
      expect(await latestSubscription(OTHER_ORG)).toBeNull();
    });
  });
});
