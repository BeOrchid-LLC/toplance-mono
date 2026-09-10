import "server-only";

import { inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  casesAwaitingInterviewOutcome,
  type StaleInterview,
} from "@/lib/data/interviews";
import { applications } from "@/lib/db/schema";
import {
  clientFeesForOrgs,
  clientRevenueForOrgs,
  listInvoices,
  type ClientFeeSeries,
} from "@/lib/data/payments";
import {
  funnelOf,
  stalledAtChecklist,
  type FunnelStage,
} from "@/lib/domain/kpis";
import type { ClientRevenue, Invoice } from "@/lib/domain/payments";

/**
 * What one agency's own dashboard shows, in one pass.
 *
 * The sibling of `@/lib/data/dashboard`, and deliberately not a
 * parameterised version of it: that file answers "how is the platform
 * doing" for BeOrchid staff and reads every organisation, every
 * traveller and every document on it. This one answers "how is my
 * agency doing" for a director who is allowed to know about their own
 * clients and nobody else's, so the two have different reads, different
 * costs, and — the part that matters — different blast radii if the
 * `where` is ever wrong.
 *
 * Like its sibling, the arithmetic is not here. `funnelOf` and
 * `stalledAtChecklist` are pure and already unit-tested in
 * `@/lib/domain/kpis`; they take rows and do not care whose. This file
 * is the wiring that hands them one agency's.
 */

/** Six cycles — two quarters, matching `INVOICE_HISTORY_CYCLES`. */
export type AgencyDashboardData = {
  /** How far this agency's cases get, and where they stop. */
  funnel: FunnelStage[];
  /**
   * Clients who uploaded every document and never pressed Submit.
   *
   * The one figure on this page a director can act on the same
   * afternoon, by picking up the phone — which is why it is lifted out
   * of the funnel rather than left to be inferred from the gap between
   * two of its bars.
   */
  stalled: number;
  /**
   * Cases interviewed with no outcome recorded — see
   * `casesAwaitingInterviewOutcome`.
   *
   * The rows themselves rather than a count, because unlike `stalled`
   * there is nothing to infer: a director acts on this by opening a
   * named case, so the name and the date are the figure. Oldest first,
   * which is the order the work should be done in.
   */
  staleInterviews: StaleInterview[];
  /** This agency's own bill, newest cycle last. Empty before its first. */
  invoices: Invoice[];
  /**
   * What this agency's clients have paid for their own applications.
   *
   * Not the inverse of `invoices` and not comparable to it: `invoices`
   * is what Toplance charges the agency, this is what travellers paid
   * for their cases. The schema keeps them as separate `payment_kind`s
   * charged to separate payers, and the dashboard must not let them
   * read as two views of one ledger.
   */
  clientRevenue: ClientRevenue;
  /**
   * The last six months of those same settled fees, month by month.
   *
   * The tile above it is every fee ever paid and this is a window, so
   * the two are not expected to agree on a total — see
   * `clientFeesForOrgs` on why they nonetheless share one rule about
   * what counts as paid, and one currency, which the tile chooses.
   */
  clientFees: ClientFeeSeries;
};

/**
 * `orgIds` and `orgId` are both taken, and they are not the same
 * question.
 *
 * The funnel counts cases across every agency this person belongs to,
 * because that is what `countOrgClients(actor.orgIds)` already does for
 * the cards above it — a funnel that disagreed with the "Clients" card
 * sitting directly on top of it would read as a broken screen.
 *
 * The bill is one organisation's, because a bill *is* one
 * organisation's: `payments.org_id` names a single agency, cycles run
 * from that agency's own anniversary, and there is no such thing as a
 * combined invoice. Summing two agencies' cycles into one chart would
 * be inventing a document nobody issues.
 */
export async function agencyDashboard(
  orgIds: readonly string[],
  orgId: string | null,
  options: { now?: Date } = {}
): Promise<AgencyDashboardData> {
  const now = options.now ?? new Date();

  // The tile's read, started here rather than inline below because the
  // series underneath it has to be denominated in whatever currency
  // this one picks. Only the fees wait on it; everything else in the
  // `Promise.all` still goes out at once.
  const clientRevenuePromise = clientRevenueForOrgs(orgIds);

  const [rows, staleInterviews, invoices, clientRevenue, clientFees] = await Promise.all([
    // One row per traveller by constraint, so this is a small read even
    // for a busy agency, and both figures below come out of the one
    // pass. Only the five columns the funnel turns on — a dashboard has
    // no business selecting a case's contents.
    orgIds.length
      ? db
          .select({
            status: applications.status,
            intakeComplete: applications.intakeComplete,
            checklistCompleteAt: applications.checklistCompleteAt,
            submittedAt: applications.submittedAt,
            decidedAt: applications.decidedAt,
          })
          .from(applications)
          .where(inArray(applications.orgId, [...orgIds]))
      : // No membership, no filter to read by. Returning early rather
        // than running an unfiltered select is the same rule the roster
        // follows: the failure mode of a missing `where` here is one
        // agency's caseload rendered on another's dashboard.
        Promise.resolve([]),

    // `orgIds`, matching the funnel: a director managing two agencies
    // has forgotten interviews at both, and this list is work rather
    // than money — there is no cycle or invoice to scope it to one.
    casesAwaitingInterviewOutcome(orgIds, now),

    orgId ? listInvoices({ orgId, now }) : Promise.resolve([]),

    // Across every agency this person belongs to, matching the funnel
    // above rather than the bill below: it counts the same cases the
    // funnel counts, so scoping the two differently would let a
    // director read a fee total against a caseload it does not cover.
    clientRevenuePromise,
    // `orgIds`, matching the tile rather than the bill: a client fee is
    // not billed on an agency's cycle at all, so there is no single
    // organisation this money belongs to the way an invoice does.
    //
    // The currency comes from the tile rather than from this window.
    // Both would otherwise run the same collapse over different rows —
    // all-time against six months — which is not the same as agreeing,
    // and an agency whose older money is in another currency would read
    // a chart denominated differently from the figure directly above
    // it. See `clientFeesForOrgs`.
    clientRevenuePromise.then((revenue) =>
      clientFeesForOrgs(orgIds, { now, currency: revenue.currency })
    ),
  ]);

  return {
    funnel: funnelOf(rows),
    stalled: stalledAtChecklist(rows),
    staleInterviews,
    // Oldest first: `listInvoices` walks cycles newest-first per
    // organisation, and a chart's x-axis reads left to right in time.
    // Sorted here rather than in the component so the chart renders
    // whatever it is handed, and so the order is a property of the data
    // rather than of a `.reverse()` somebody may drop later.
    invoices: [...invoices].sort(
      (a, b) => a.cycleStart.getTime() - b.cycleStart.getTime()
    ),
    clientRevenue,
    clientFees,
  };
}
