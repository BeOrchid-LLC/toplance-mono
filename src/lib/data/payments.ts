import "server-only";

import { and, desc, eq, gt, gte, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, organisations, payments } from "@/lib/db/schema";
import { activeRateCard } from "@/lib/data/billing";
import { quote, type RateCard } from "@/lib/domain/pricing";
import {
  clientFeesByMonth,
  collapseClientRevenue,
  recentCycles,
  statusFor,
  type ClientFee,
  type ClientFeePoint,
  type ClientRevenue,
  type Invoice,
  type Settlement,
} from "@/lib/domain/payments";
import type { PaymentKind, PaymentStatus } from "@/lib/payments/provider";

export type Payment = typeof payments.$inferSelect;

/**
 * Reading and writing the one record that anybody paid for anything.
 *
 * There is no `subscription_status` on `organisations` and no `paid`
 * flag on `applications`, deliberately. Entitlement is derived here,
 * from rows that are never edited after they settle: a status column in
 * two places is a status column that disagrees with itself the first
 * time a payment lands and the second write does not.
 *
 * Both reads below are on the path of every gated request — the agency's
 * on every console page, the client's on every `/app` page — which is
 * why `payments` carries an index for each.
 */

export type RecordPaymentInput = {
  kind: PaymentKind;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  /** Set on a subscription, and never together with `applicationId`. */
  orgId?: string | null;
  /** Set on a client payment, and never together with `orgId`. */
  applicationId?: string | null;
  payerId: string;
  rateCardId?: string | null;
  provider: string;
  providerRef?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
};

/**
 * Write one payment.
 *
 * `paid_at` is stamped here rather than passed in, so the time a payment
 * settled is the database's answer and not a caller's. The shape check
 * on the table is what stops a subscription that names an application,
 * so this function does not re-litigate it — a malformed call raises,
 * loudly, at the place that wrote it.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const [row] = await db
    .insert(payments)
    .values({
      kind: input.kind,
      status: input.status,
      amountMinor: input.amountMinor,
      currency: input.currency,
      orgId: input.orgId ?? null,
      applicationId: input.applicationId ?? null,
      payerId: input.payerId,
      rateCardId: input.rateCardId ?? null,
      provider: input.provider,
      providerRef: input.providerRef ?? null,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      paidAt: input.status === "paid" ? new Date() : null,
    })
    .returning();

  return row;
}

/**
 * The agency's live subscription, or `null`.
 *
 * "Live" is three conditions and all of them matter: paid rather than
 * pending or failed, a subscription rather than a client's fee, and an
 * end date still ahead of us. A row that has lapsed is history, not
 * entitlement — nothing renews, by design, so an agency that stops
 * paying stops passing this.
 */
export async function activeSubscription(
  orgId: string,
  at: Date = new Date()
): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.orgId, orgId),
        eq(payments.kind, "agency_subscription"),
        eq(payments.status, "paid"),
        isNotNull(payments.periodEnd),
        gt(payments.periodEnd, at)
      )
    )
    .orderBy(desc(payments.periodEnd))
    .limit(1);

  return row ?? null;
}

export async function hasActiveSubscription(
  orgId: string,
  at: Date = new Date()
): Promise<boolean> {
  return (await activeSubscription(orgId, at)) !== null;
}

/**
 * Whether this application has been paid for.
 *
 * Any paid row settles it, including the zero-amount `backfill` rows the
 * migration writes for every application that predates the paywall.
 * That is intended: those travellers were sponsored under the old model
 * and must not meet a payment screen in the middle of their own case.
 */
export async function isApplicationPaid(applicationId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.applicationId, applicationId),
        eq(payments.kind, "client_application"),
        eq(payments.status, "paid")
      )
    )
    .limit(1);

  return !!row;
}

/** An agency's own payment history, newest first — what `/agency/billing` lists. */
export async function listPaymentsForOrg(orgId: string): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.orgId, orgId))
    .orderBy(desc(payments.createdAt));
}

/**
 * How much history the director's dashboard charts. Six cycles is two
 * quarters — enough to see a trend, few enough that the read below stays
 * three queries whatever the client count.
 */
export const INVOICE_HISTORY_CYCLES = 6;

/**
 * One invoice per client per billing cycle, newest cycle first.
 *
 * An invoice is not stored. A client is billed for every cycle since it
 * signed up, including the quiet ones — the model is a monthly fee per
 * business *plus* a fee per application, so a month with no completed
 * applications is still a month of service and still carries the base
 * fee. That is arithmetic over rows the database already holds, and
 * materialising it would be a second copy of the pricing rules to keep
 * in step with `quote`.
 *
 * Settlement comes from `payments`, and only from `payments`. A cycle
 * with no paid row against it reads `open`, never `paid` — see
 * `statusFor`. On a product that has taken no payments yet this makes
 * the whole Collected column $0, which is the point: the alternative is
 * a plausible number in a board pack.
 *
 * Reads organisations, billable applications and subscription payments
 * in three queries and does the grouping here rather than in SQL. The
 * alternative is a `generate_series` join against each organisation's
 * own anniversary, which would push the anniversary clamp documented in
 * `cycleFor` into a second implementation written in SQL — and two
 * implementations of a billing boundary is how a business gets charged
 * twice for February.
 *
 * `orgId` narrows all three reads to one agency, which is what the
 * agency console's own bill panel asks for. It is a `where` rather than
 * a filter over the result for the same reason: without it, a page
 * rendered per request for one agency reads every organisation, every
 * billable application and every subscription on the platform in order
 * to throw all but one away. The arithmetic below is untouched by it —
 * narrowing the input must never become a second way of pricing a
 * cycle, which is the failure the paragraph above is about.
 */
export async function listInvoices(
  options: { now?: Date; cycles?: number; orgId?: string } = {}
): Promise<Invoice[]> {
  const now = options.now ?? new Date();
  const historyLength = options.cycles ?? INVOICE_HISTORY_CYCLES;
  const only = options.orgId;

  const [orgs, billable, settlements, card] = await Promise.all([
    db
      .select({
        id: organisations.id,
        name: organisations.name,
        createdAt: organisations.createdAt,
      })
      .from(organisations)
      .where(only ? eq(organisations.id, only) : undefined),
    db
      .select({
        orgId: applications.orgId,
        billableAt: applications.billableAt,
      })
      .from(applications)
      .where(
        only
          ? and(isNotNull(applications.billableAt), eq(applications.orgId, only))
          : isNotNull(applications.billableAt)
      ),
    // Subscriptions only. A client's own per-application fee is money
    // between a traveller and Toplance; it settles nothing on the
    // agency's monthly bill, and counting it here would report an
    // agency as having paid a cycle its travellers paid for.
    db
      .select({
        orgId: payments.orgId,
        status: payments.status,
        paidAt: payments.paidAt,
        periodStart: payments.periodStart,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(
        only
          ? and(
              eq(payments.kind, "agency_subscription"),
              eq(payments.orgId, only)
            )
          : eq(payments.kind, "agency_subscription")
      ),
    activeRateCard(now),
  ]);

  // Grouped once rather than filtered per cycle: with six cycles a
  // client, the naive form walks the whole application list 6n times.
  const billedByOrg = new Map<string, number[]>();
  for (const row of billable) {
    if (!row.orgId || !row.billableAt) continue;
    const stamps = billedByOrg.get(row.orgId);
    const at = row.billableAt.getTime();
    if (stamps) stamps.push(at);
    else billedByOrg.set(row.orgId, [at]);
  }

  const paidByOrg = new Map<string, { at: number; row: Settlement }[]>();
  for (const row of settlements) {
    if (!row.orgId) continue;
    // `period_start` is what the payment was *for*; `created_at` is when
    // it was taken. The first is the truthful key and is set on every
    // subscription the checkout writes, but it is nullable in the
    // schema, so a row without one falls back to when it landed rather
    // than being dropped from the books.
    const at = (row.periodStart ?? row.createdAt).getTime();
    const entry = { at, row: { status: row.status, paidAt: row.paidAt } };
    const rows = paidByOrg.get(row.orgId);
    if (rows) rows.push(entry);
    else paidByOrg.set(row.orgId, [entry]);
  }

  const invoices: Invoice[] = [];

  for (const org of orgs) {
    const stamps = billedByOrg.get(org.id) ?? [];
    const paid = paidByOrg.get(org.id) ?? [];

    for (const cycle of recentCycles(org.createdAt, now, historyLength)) {
      const start = cycle.start.getTime();
      // `end` is exclusive, matching `cycleFor` — an application
      // completed at the instant the next cycle opens belongs to that
      // one, so no application is billed in two cycles or in none.
      const end = cycle.end.getTime();
      const count = stamps.filter((at) => at >= start && at < end).length;
      const settled = paid.filter((p) => p.at >= start && p.at < end).map((p) => p.row);

      invoices.push(invoiceFor(org, cycle, count, settled, card, now));
    }
  }

  return invoices;
}

/** One client, one cycle, priced from the rate card and settled from `payments`. */
function invoiceFor(
  org: { id: string; name: string },
  cycle: { start: Date; end: Date },
  applicationCount: number,
  settlements: Settlement[],
  card: RateCard,
  now: Date
): Invoice {
  const priced = quote(applicationCount, card);
  const { status, paidAt } = statusFor(cycle.end, settlements, now);

  return {
    id: `inv_${org.id}_${cycle.start.toISOString().slice(0, 10)}`,
    orgId: org.id,
    orgName: org.name,
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    applications: applicationCount,
    baseFeeMinor: priced.baseFeeMinor,
    amountMinor: priced.totalMinor,
    currency: priced.currency,
    status,
    paidAt,
  };
}


/**
 * What this agency's clients have actually paid, settled only.
 *
 * Joined through `applications` rather than filtered on `payments.org_id`,
 * because a client fee does not have one: `payment_shape_matches_kind`
 * requires a `client_application` row to name an application and *not*
 * an organisation, on the reasoning that the traveller is the payer and
 * the agency is not. So the agency is reached the only way it can be —
 * through the case the fee was paid for.
 *
 * `status = 'paid'` and nothing else. `pending` is the window before the
 * provider has confirmed, and counting it would put money on a
 * director's screen that may never arrive; `failed` is money that
 * definitively did not.
 *
 * Grouped by currency and collapsed by `collapseClientRevenue`, which is
 * where the reasoning about mixed currencies lives.
 */
export async function clientRevenueForOrgs(
  orgIds: readonly string[],
  fallbackCurrency = "USD"
): Promise<ClientRevenue> {
  // Same rule as every other agency-scoped read on this page: no
  // membership means no `where` to read by, and an unfiltered sum here
  // would total every agency's client fees onto one dashboard.
  if (orgIds.length === 0) {
    return collapseClientRevenue([], fallbackCurrency);
  }

  const rows = await db
    .select({
      currency: payments.currency,
      totalMinor: sql<number>`coalesce(sum(${payments.amountMinor}), 0)::int`,
      // Distinct applications, not rows: a case that was charged twice
      // (a retry after a failure, say) is still one client who paid.
      cases: sql<number>`count(distinct ${payments.applicationId})::int`,
    })
    .from(payments)
    .innerJoin(applications, eq(applications.id, payments.applicationId))
    .where(
      and(
        eq(payments.kind, "client_application"),
        eq(payments.status, "paid"),
        inArray(applications.orgId, [...orgIds])
      )
    )
    .groupBy(payments.currency);

  return collapseClientRevenue(rows, fallbackCurrency);
}


/**
 * How many months of settled client fees the director's chart plots.
 *
 * Six, matching `INVOICE_HISTORY_CYCLES` above — the two charts sit side
 * by side on one screen, and one showing half a year while the other
 * showed a quarter would invite a comparison that is not being made.
 */
export const CLIENT_FEE_HISTORY_MONTHS = 6;

/** What the director's client-fee chart plots, in one currency. */
export type ClientFeeSeries = {
  currency: string;
  /**
   * True when settled fees exist in a currency this series leaves out —
   * the same flag and the same reasoning as `ClientRevenue`.
   */
  mixedCurrency: boolean;
  /** One point per month, oldest first, empty months included. */
  points: ClientFeePoint[];
  /** The window's total, so a caller can tell "no fees yet" from "a quiet month". */
  totalMinor: number;
};

/**
 * The last few months of settled client fees, for this agency's cases.
 *
 * The time series behind `clientRevenueForOrgs`, and it reaches the
 * agency the same way and for the same reason: `payment_shape_matches_kind`
 * keeps `org_id` off a `client_application` row, so the only route from
 * a fee to the agency is through the case it was paid for. Both reads
 * therefore join `applications` and filter on its `org_id`, and neither
 * may become a second way of deciding whose money this is.
 *
 * The tile and this chart answer different questions on purpose — the
 * tile is every fee ever settled, this is the last six months — so they
 * are not expected to agree, and the chart is labelled with its window.
 * What they must agree on is the *rule*: `status = 'paid'` only, and
 * cases counted distinctly.
 *
 * Bounded on `coalesce(paid_at, created_at)` rather than on `paid_at`
 * alone. The column is nullable, so a settled row that never had one
 * written would be dropped from the books by a `paid_at >= …` filter —
 * the same fallback, for the same reason, that `listInvoices` applies to
 * a subscription's `period_start`.
 */
export async function clientFeesForOrgs(
  orgIds: readonly string[],
  options: { now?: Date; months?: number; fallbackCurrency?: string } = {}
): Promise<ClientFeeSeries> {
  const now = options.now ?? new Date();
  const months = options.months ?? CLIENT_FEE_HISTORY_MONTHS;
  const fallbackCurrency = options.fallbackCurrency ?? "USD";

  const empty = (currency: string): ClientFeeSeries => ({
    currency,
    mixedCurrency: false,
    // Still a full window rather than an empty array: the chart's own
    // "nothing yet" state is decided by `totalMinor`, and a caller that
    // wanted to draw the axis anyway should be able to.
    points: clientFeesByMonth([], months, now),
    totalMinor: 0,
  });

  // Same rule as every other agency-scoped read on this page: no
  // membership means no `where` to read by, and an unfiltered sum would
  // total every agency's client fees onto one dashboard.
  if (orgIds.length === 0) return empty(fallbackCurrency);

  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1)
  );

  const rows = await db
    .select({
      currency: payments.currency,
      amountMinor: payments.amountMinor,
      applicationId: payments.applicationId,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .innerJoin(applications, eq(applications.id, payments.applicationId))
    .where(
      and(
        eq(payments.kind, "client_application"),
        eq(payments.status, "paid"),
        inArray(applications.orgId, [...orgIds]),
        gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, windowStart)
      )
    );

  if (rows.length === 0) return empty(fallbackCurrency);

  // Which currency the chart is in is decided by `collapseClientRevenue`
  // rather than by a rule written again here: minor units are not
  // comparable across currencies, the tile already picks the dominant
  // one, and a chart that picked differently would sit under a tile
  // denominated in something else.
  const byCurrency = new Map<string, { totalMinor: number; cases: Set<string> }>();
  for (const row of rows) {
    const entry = byCurrency.get(row.currency) ?? {
      totalMinor: 0,
      cases: new Set<string>(),
    };
    entry.totalMinor += row.amountMinor;
    if (row.applicationId) entry.cases.add(row.applicationId);
    byCurrency.set(row.currency, entry);
  }

  const { currency, mixedCurrency } = collapseClientRevenue(
    [...byCurrency.entries()].map(([code, entry]) => ({
      currency: code,
      totalMinor: entry.totalMinor,
      cases: entry.cases.size,
    })),
    fallbackCurrency
  );

  const fees: ClientFee[] = rows
    .filter((row) => row.currency === currency && row.applicationId)
    .map((row) => ({
      // `paid_at` is what the money is dated by; `created_at` is the
      // fallback the bound above already allows for.
      paidAt: row.paidAt ?? row.createdAt,
      amountMinor: row.amountMinor,
      applicationId: row.applicationId as string,
    }));

  const points = clientFeesByMonth(fees, months, now);

  return {
    currency,
    mixedCurrency,
    points,
    // Summed from the points rather than from `rows`, so the figure the
    // caller tests for emptiness is the one the chart actually draws —
    // a fee outside the window must not make an empty chart claim to
    // have something in it.
    totalMinor: points.reduce((sum, point) => sum + point.totalMinor, 0),
  };
}
