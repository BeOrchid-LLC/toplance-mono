/**
 * Invoices and what they add up to, as pure functions.
 *
 * An invoice is not a table. What the database holds is an organisation,
 * its billable applications, and — since the paywall — the `payments`
 * rows recording that somebody actually paid. An invoice is those three
 * folded into one billing cycle, and `@/lib/data/payments` does the
 * folding. This module owns the shape and the arithmetic.
 *
 * Nothing here invents settlement. An earlier draft of this screen
 * simulated it from a hash of the invoice id, because there was no
 * `payments` table to ask; there is one now, so a cycle is paid when a
 * paid row says so and unpaid otherwise. A dashboard that reads $0 in
 * front of a director is telling the truth about a product that has not
 * taken a payment yet, which is worth considerably more than a plausible
 * figure.
 *
 * `@/lib/payments/provider` is the seam a processor arrives through, in
 * the arrangement `AGENTS.md` prescribes for analytics — "adopting one is
 * a second implementation behind `track()`, not a change at every call
 * site". Nothing in this file changes when Stripe lands; it will simply
 * be reading rows the mock provider did not write.
 *
 * Money is in **minor units** throughout, the same rule
 * `@/lib/domain/pricing` sets. `300_00` is three hundred dollars. Floats
 * never touch a bill, or a figure derived from one.
 */

import { cycleFor, type BillingCycle } from "@/lib/domain/pricing";

/**
 * Where one billing cycle got to.
 *
 * - `draft` — the cycle is still open. Applications are still landing in
 *   it and nothing has been charged, so this is money accruing, not
 *   money owed.
 * - `open` — the cycle has closed with nothing paid against it. This is
 *   what "outstanding" means.
 * - `paid` — a paid `payments` row covers it.
 * - `failed` — a charge was attempted and declined. Outstanding too, but
 *   it needs a person, which is why it is not folded into `open`.
 *
 * Named `InvoiceStatus`, not `PaymentStatus`, because
 * `@/lib/payments/provider` already owns that name for a different thing
 * — the state of one `payments` row (`pending | paid | failed`). This is
 * the state of a whole cycle, derived from however many of those rows
 * fall inside it, and two types sharing a name is how an import goes
 * quietly to the wrong one.
 *
 * Stripe's `void`, `uncollectible` and `refunded` are all absent for the
 * same reason: no code path in this product can produce them — the
 * `payment_status` enum has three values and a refund is not among them
 * — and a status nothing can reach is a branch that rots untested.
 */
export type InvoiceStatus = "draft" | "open" | "paid" | "failed";

/** One organisation's charge for one billing cycle. */
export type Invoice = {
  /**
   * Stable across renders and across deploys — `inv_<orgId>_<cycle
   * start>`. Nothing is keyed on it in the database; it exists so React
   * has a stable key and so a director reading a row can quote it.
   */
  id: string;
  orgId: string;
  orgName: string;
  cycleStart: Date;
  /** Exclusive, matching `BillingCycle` — the instant the next one opens. */
  cycleEnd: Date;
  /** Applications that became billable inside this cycle. */
  applications: number;
  /** The recurring part of the charge, kept separate so MRR can read it. */
  baseFeeMinor: number;
  /** Base fee plus the layered per-application fee, from `quote`. */
  amountMinor: number;
  currency: string;
  status: InvoiceStatus;
  /**
   * When the cycle settled — the `paid_at` of the row that settled it,
   * not the close of the cycle. `null` on anything not `paid`.
   */
  paidAt: Date | null;
};

/**
 * How long after a cycle closes an unpaid invoice is merely unpaid
 * rather than a problem. Net 14, which is what the pricing document
 * assumes; a settings row when somebody needs to change it, not a
 * constant to be edited under pressure.
 */
export const OVERDUE_AFTER_DAYS = 14;

/**
 * One `payments` row, narrowed to the two columns settlement turns on.
 *
 * Structural rather than `typeof payments.$inferSelect`, so this module
 * stays free of Drizzle and of `server-only` and can be tested without a
 * database. `@/lib/data/payments` passes real rows in.
 */
export type Settlement = {
  /** `payment_status` — `pending`, `paid` or `failed`. */
  status: "pending" | "paid" | "failed";
  paidAt: Date | null;
};

/** What `statusFor` concluded, and the date behind it. */
export type Settled = { status: InvoiceStatus; paidAt: Date | null };

/**
 * Where a cycle stands, given whatever was paid against it.
 *
 * Four rules, in this order:
 *
 * 1. A paid row settles the cycle. Any paid row — not a row matching the
 *    amount. Partial payment is not a thing this product can take (there
 *    is one button and it charges the whole quote), so requiring the
 *    figures to agree would only turn a rounding difference into a
 *    cycle that says it was never paid.
 * 2. Otherwise a failed row makes it `failed`, which is outstanding
 *    money that additionally needs a person.
 * 3. Otherwise an open cycle is `draft` — nothing has been charged yet,
 *    so no settled status is true of it. This rule is above `open`
 *    deliberately: without it the dashboard reports money owed for work
 *    still in progress.
 * 4. Otherwise `open`: the cycle closed and nothing was paid.
 *
 * A `pending` row is not a status of its own. It means a checkout was
 * started and never came back, which for a cycle that has closed is
 * indistinguishable from not paying — and `checkout_started` is already
 * the event that measures abandonment.
 */
export function statusFor(
  cycleEnd: Date,
  settlements: readonly Settlement[],
  now: Date = new Date()
): Settled {
  const paid = settlements.find((s) => s.status === "paid");
  if (paid) return { status: "paid", paidAt: paid.paidAt };

  if (settlements.some((s) => s.status === "failed")) {
    return { status: "failed", paidAt: null };
  }

  if (cycleEnd.getTime() > now.getTime()) return { status: "draft", paidAt: null };
  return { status: "open", paidAt: null };
}

/**
 * The billing cycles a client has been through, newest first.
 *
 * Walks `cycleFor` backwards a millisecond at a time rather than
 * subtracting months, so the anniversary clamp documented on that
 * function applies here unchanged — a client anchored on the 31st gets
 * February's cycle starting on the 28th, and no day belongs to two
 * cycles or to none.
 *
 * Stops at the signup: a cycle that closed before a client existed is
 * revenue that never happened, and putting it on a chart would invent
 * history. `limit` is therefore an upper bound, not a promise.
 */
export function recentCycles(
  anchor: Date,
  now: Date,
  limit: number
): BillingCycle[] {
  const cycles: BillingCycle[] = [];
  let cursor = now;

  for (let i = 0; i < limit; i++) {
    const cycle = cycleFor(anchor, cursor);
    // The cycle containing the signup is the client's first, and is
    // kept — it is the one they were actually billed for. Anything
    // wholly before it is not theirs.
    if (cycle.end.getTime() <= anchor.getTime()) break;

    cycles.push(cycle);
    cursor = new Date(cycle.start.getTime() - 1);
  }

  return cycles;
}

export type RevenuePoint = {
  /** The calendar month as `YYYY-MM` — the chart's x value. */
  cycle: string;
  collectedMinor: number;
  outstandingMinor: number;
  accruingMinor: number;
  applications: number;
};

/**
 * Invoices folded into one point per calendar month, oldest first.
 *
 * Across every client, not per client: the chart's question is how the
 * business is doing month to month. Sorted here rather than left in
 * query order, because a chart plotted in whatever order Postgres
 * returned would draw time backwards.
 *
 * **Grouped on the month, not on the cycle's start date.** Every client
 * is billed on its own signup anniversary, so their cycles begin on
 * different days — one on the 3rd, the next on the 17th. Keying on the
 * exact start gives one point per anniversary instead of one per month:
 * a hundred clients draw a hundred bars, every one of them labelled with
 * the same month name. A cycle belongs to the month it opens in.
 *
 * Every invoice lands in exactly one series, so the three stacked
 * together are the month's whole book and the chart cannot disagree with
 * the tiles above it.
 */
export function revenueByCycle(invoices: readonly Invoice[]): RevenuePoint[] {
  const points = new Map<string, RevenuePoint>();

  for (const invoice of invoices) {
    const cycle = invoice.cycleStart.toISOString().slice(0, 7);

    const point = points.get(cycle) ?? {
      cycle,
      collectedMinor: 0,
      outstandingMinor: 0,
      accruingMinor: 0,
      applications: 0,
    };

    if (invoice.status === "paid") point.collectedMinor += invoice.amountMinor;
    else if (invoice.status === "draft") point.accruingMinor += invoice.amountMinor;
    else if (invoice.status === "open" || invoice.status === "failed") {
      point.outstandingMinor += invoice.amountMinor;
    }

    point.applications += invoice.applications;
    points.set(cycle, point);
  }

  return [...points.values()].sort((a, b) => a.cycle.localeCompare(b.cycle));
}

export type PaymentSummary = {
  currency: string;
  /** Settled — the sum of every cycle a paid row covers. */
  collectedMinor: number;
  /** Closed and not settled — `open` and `failed` together. */
  outstandingMinor: number;
  /** The part of outstanding that is past `OVERDUE_AFTER_DAYS`. */
  overdueMinor: number;
  /** Running up in cycles that have not closed. Not yet owed. */
  accruingMinor: number;
  failedCount: number;
  failedMinor: number;
  /**
   * The recurring part of revenue: each active client's base fee, once.
   *
   * Not a subscription MRR — nothing in this schema records a
   * subscription. It is the sum of base fees across clients with an open
   * cycle, which is the nearest true thing, and the dashboard labels it
   * as such rather than letting the acronym imply more.
   */
  mrrMinor: number;
  /** Average revenue per billed account, rounded to whole minor units. */
  arpaMinor: number;
  /** Distinct clients with an invoice that has left draft. */
  payingClients: number;
};

const EMPTY: Omit<PaymentSummary, "currency"> = {
  collectedMinor: 0,
  outstandingMinor: 0,
  overdueMinor: 0,
  accruingMinor: 0,
  failedCount: 0,
  failedMinor: 0,
  mrrMinor: 0,
  arpaMinor: 0,
  payingClients: 0,
};

/**
 * Fold a list of invoices into the figures the dashboard's money tiles
 * show.
 *
 * Pure and I/O-free so it can be tested without a database, and so the
 * arithmetic that produces a number on a director's screen is pinned
 * somewhere rather than living inside a JSX expression.
 *
 * Two subtleties worth the reading time. A client is counted once
 * towards MRR however many invoices it has in the open cycle — summing
 * rows would double a business that somehow ended up with two. And ARPA
 * divides by the clients actually billed, not by every organisation on
 * file: an empty database must produce `0`, not `NaN`, because `NaN`
 * reaches the screen as "$NaN".
 */
export function summarise(
  invoices: readonly Invoice[],
  now: Date = new Date()
): PaymentSummary {
  const currency = invoices[0]?.currency ?? "USD";
  if (invoices.length === 0) return { currency, ...EMPTY };

  const overdueBefore = now.getTime() - OVERDUE_AFTER_DAYS * 86_400_000;

  const totals = { ...EMPTY };
  const mrrByOrg = new Map<string, number>();
  const billedOrgs = new Set<string>();
  let billedMinor = 0;

  for (const invoice of invoices) {
    switch (invoice.status) {
      case "draft":
        totals.accruingMinor += invoice.amountMinor;
        // Last write wins, and every invoice for one client in one open
        // cycle carries the same base fee — the point is the key, not
        // the value.
        mrrByOrg.set(invoice.orgId, invoice.baseFeeMinor);
        continue;

      case "paid":
        totals.collectedMinor += invoice.amountMinor;
        break;

      case "failed":
        totals.failedCount += 1;
        totals.failedMinor += invoice.amountMinor;
      // falls through — a declined charge is still money owed
      case "open":
        totals.outstandingMinor += invoice.amountMinor;
        if (invoice.cycleEnd.getTime() < overdueBefore) {
          totals.overdueMinor += invoice.amountMinor;
        }
        break;
    }

    billedOrgs.add(invoice.orgId);
    billedMinor += invoice.amountMinor;
  }

  totals.mrrMinor = [...mrrByOrg.values()].reduce((sum, fee) => sum + fee, 0);
  totals.payingClients = billedOrgs.size;
  totals.arpaMinor = billedOrgs.size
    ? Math.round(billedMinor / billedOrgs.size)
    : 0;

  return { currency, ...totals };
}

/** One currency's worth of settled client fees, as the database groups them. */
export type ClientRevenueRow = {
  currency: string;
  totalMinor: number;
  /** Distinct applications that have a paid fee against them. */
  cases: number;
};

/** What the director's "paid by clients" tile shows. */
export type ClientRevenue = {
  currency: string;
  totalMinor: number;
  cases: number;
  /**
   * True when settled fees exist in a currency other than the one
   * reported. See `collapseClientRevenue` for why those are left out.
   */
  mixedCurrency: boolean;
};

/**
 * Collapse per-currency totals into the single figure a tile can show.
 *
 * Minor units are not comparable across currencies — ₦100 and $100 are
 * both `100_00`, and adding them produces a number that is not money in
 * any currency. So this picks the largest single currency rather than
 * summing, and sets `mixedCurrency` when it had to leave something out,
 * so the screen can say so instead of quietly under-reporting.
 *
 * In practice there is one: client fees are priced from
 * `billing_rate_cards.client_fee_minor`, and a card carries one
 * `currency`. A second currency here means rows priced under an older
 * card in a different unit, which is a real thing that can happen once
 * and must not silently corrupt the total when it does.
 *
 * Ties break on the currency name so the figure is stable between
 * renders rather than depending on the order Postgres grouped in.
 */
export function collapseClientRevenue(
  rows: readonly ClientRevenueRow[],
  fallbackCurrency = "USD"
): ClientRevenue {
  if (rows.length === 0) {
    return { currency: fallbackCurrency, totalMinor: 0, cases: 0, mixedCurrency: false };
  }

  const [top] = [...rows].sort(
    (a, b) => b.totalMinor - a.totalMinor || a.currency.localeCompare(b.currency)
  );

  return {
    currency: top.currency,
    totalMinor: top.totalMinor,
    cases: top.cases,
    mixedCurrency: rows.length > 1,
  };
}


/**
 * One settled client fee, narrowed to the three fields the fold turns
 * on.
 *
 * Structural rather than `typeof payments.$inferSelect`, for the same
 * reason `Settlement` is: this module stays free of Drizzle and of
 * `server-only`, so the arithmetic behind a figure on a director's
 * screen can be tested without a database.
 */
export type ClientFee = {
  /** When the money actually landed, not when the cycle closed. */
  paidAt: Date;
  amountMinor: number;
  /** Distinct-counted, so a case charged twice is still one case. */
  applicationId: string;
};

/** One month of settled client fees — a bar on the director's chart. */
export type ClientFeePoint = {
  /** `YYYY-MM` in UTC. The chart's x value. */
  month: string;
  totalMinor: number;
  /** Distinct applications settled in this month, not rows. */
  cases: number;
};

/** `2026-09-08T…` → `2026-09`, in UTC. */
function monthKey(at: Date): string {
  return at.toISOString().slice(0, 7);
}

/**
 * Settled client fees folded into one point per calendar month, oldest
 * first, across a fixed window ending in the current month.
 *
 * **Every month in the window comes back, including the empty ones.** A
 * bar chart's category axis draws exactly what it is handed, so dropping
 * a quiet month does not leave a gap in the row — it closes it, and
 * August ends up drawn next to June as though they were consecutive. A
 * month in which nobody paid is a fact about the business, and it
 * belongs on the chart as a zero rather than as a month that never
 * happened.
 *
 * Grouped on the calendar month rather than on the agency's billing
 * cycle, and the reason is stronger here than the one `revenueByCycle`
 * gives for the same choice: a client fee is not billed on a cycle at
 * all. `payment_shape_matches_kind` keeps `org_id` off these rows —
 * the traveller pays at checkout, on whatever day they get to it — so
 * the agency's anniversary is not a period this money belongs to. The
 * month it settled in is.
 *
 * Cases are distinct applications, matching `clientRevenueForOrgs`
 * exactly: a case charged twice after a failed attempt is one client who
 * paid, and the tile above this chart must not disagree with it.
 */
export function clientFeesByMonth(
  fees: readonly ClientFee[],
  months: number,
  now: Date = new Date()
): ClientFeePoint[] {
  const points = new Map<string, { totalMinor: number; cases: Set<string> }>();

  // The window is laid down first, so the empty months exist as keys
  // before anything is bucketed into them — and so the order this
  // returns in is the order time runs in, rather than the order the
  // rows happened to arrive.
  for (let back = months - 1; back >= 0; back--) {
    // `Date.UTC` normalises a negative month index into the previous
    // year, so a six-month window in February reaches back into the one
    // before it without any arithmetic here.
    const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    points.set(monthKey(at), { totalMinor: 0, cases: new Set() });
  }

  for (const fee of fees) {
    // Anything outside the window is not this chart's business. The read
    // that produces these rows is already bounded, so this is the second
    // line of defence rather than the first.
    const point = points.get(monthKey(fee.paidAt));
    if (!point) continue;

    point.totalMinor += fee.amountMinor;
    point.cases.add(fee.applicationId);
  }

  return [...points.entries()].map(([month, point]) => ({
    month,
    totalMinor: point.totalMinor,
    cases: point.cases.size,
  }));
}
