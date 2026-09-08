import "server-only";

import { and, desc, eq, gt, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, organisations, payments } from "@/lib/db/schema";
import { activeRateCard } from "@/lib/data/billing";
import { quote, type RateCard } from "@/lib/domain/pricing";
import {
  recentCycles,
  statusFor,
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
 */
export async function listInvoices(
  options: { now?: Date; cycles?: number } = {}
): Promise<Invoice[]> {
  const now = options.now ?? new Date();
  const historyLength = options.cycles ?? INVOICE_HISTORY_CYCLES;

  const [orgs, billable, settlements, card] = await Promise.all([
    db
      .select({
        id: organisations.id,
        name: organisations.name,
        createdAt: organisations.createdAt,
      })
      .from(organisations),
    db
      .select({
        orgId: applications.orgId,
        billableAt: applications.billableAt,
      })
      .from(applications)
      .where(isNotNull(applications.billableAt)),
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
      .where(eq(payments.kind, "agency_subscription")),
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
