/**
 * The arithmetic behind the director's dashboard, as pure functions.
 *
 * Nothing here does I/O. `@/lib/data/dashboard` fetches the rows and
 * hands them over; this file turns them into the figures on the screen.
 * The split is the one `@/lib/domain/pricing` already has with
 * `@/lib/data/billing`, and it exists for the same reason: a number a
 * director reads off a screen and repeats in a meeting deserves a test,
 * and a test that needs a seeded Postgres to run is a test that gets
 * skipped.
 *
 * The recurring theme below is the empty database. Every rate on this
 * dashboard divides by a count that is zero before the first traveller
 * arrives, and JavaScript's answer to `0/0` renders as "NaN%". So the
 * empty case is a first-class return value here, not an afterthought.
 */

import {
  TERMINAL_STATUSES,
  type ApplicationStatus,
  type InvitationStatus,
} from "@/lib/domain/status";

/** The columns the funnel reads, and nothing else. */
export type ApplicationFacts = {
  intakeComplete: boolean;
  checklistCompleteAt: Date | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
  status: ApplicationStatus;
};

/**
 * A proportion, or `null` when there is nothing to be a proportion of.
 *
 * Returns a fraction of one rather than a percentage, so the caller
 * decides how to render it and the value can be fed to a formatter
 * rather than pre-multiplied and rounded twice.
 */
export function rate(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return part / whole;
}

/**
 * The stages an application passes through, in order, each with the test
 * for having reached it.
 *
 * Ordered from widest to narrowest — `funnelOf` relies on that, and so
 * does anyone reading the rendered chart.
 */
export const FUNNEL_STAGES: readonly {
  key: string;
  label: string;
  reached: (a: ApplicationFacts) => boolean;
}[] = [
  { key: "started", label: "Started", reached: () => true },
  { key: "intake", label: "Finished intake", reached: (a) => a.intakeComplete },
  {
    key: "collected",
    label: "Documents complete",
    reached: (a) => a.checklistCompleteAt !== null,
  },
  { key: "submitted", label: "Submitted", reached: (a) => a.submittedAt !== null },
  { key: "decided", label: "Decided", reached: (a) => a.decidedAt !== null },
];

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  /** This stage as a share of the one before it; `null` for the first. */
  ofPrevious: number | null;
};

/**
 * How far applications get, and where they stop.
 *
 * A stage counts everyone who reached it **or anything after it**, which
 * is what keeps the funnel monotonic. Counting stages independently
 * looks equivalent and is not: an application decided before
 * `intake_complete` existed as a column would be counted at "Decided"
 * and not at "Finished intake", and the chart would show more people
 * finishing than starting. A funnel that widens reads as a broken
 * dashboard, and nobody trusts the rest of the screen after that.
 */
export function funnelOf(rows: readonly ApplicationFacts[]): FunnelStage[] {
  const counts = FUNNEL_STAGES.map((_, i) =>
    rows.filter((row) =>
      // Reached this stage, or any later one.
      FUNNEL_STAGES.slice(i).some((stage) => stage.reached(row))
    ).length
  );

  return FUNNEL_STAGES.map((stage, i) => ({
    key: stage.key,
    label: stage.label,
    count: counts[i],
    ofPrevious: i === 0 ? null : rate(counts[i], counts[i - 1]),
  }));
}

/**
 * People who uploaded everything and never pressed Submit.
 *
 * The schema comment on `checklist_complete_at` names this case
 * exactly — "that person is precisely who this exists to make visible" —
 * and until this dashboard nothing surfaced it in aggregate. It is the
 * one funnel gap a person can actually go and fix, by picking up the
 * phone.
 */
export function stalledAtChecklist(rows: readonly ApplicationFacts[]): number {
  return rows.filter((r) => r.checklistCompleteAt !== null && r.submittedAt === null)
    .length;
}

/** Milliseconds between two instants, or `null` if either is missing. */
export function elapsed(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  return to.getTime() - from.getTime();
}

/** An application as the client rollup sees it: whose it is, and how it went. */
export type ClientApplication = ApplicationFacts & { orgId: string | null };

/** An invitation as the client rollup sees it. */
export type ClientInvitation = { orgId: string; status: InvitationStatus };

export type ClientRow = {
  orgId: string;
  name: string;
  /** People this client has invited, whatever became of the invitation. */
  invited: number;
  accepted: number;
  /** People who actually have an application. Never the same as `invited`. */
  applicants: number;
  /** Applicants whose checklist is complete but who have not submitted. */
  stalled: number;
  approved: number;
  rejected: number;
  /** Approved over decided; `null` until this client has a decision. */
  approvalRate: number | null;
};

/*
 * No `seatsPurchased`, and no `seatUtilisation`.
 *
 * The ratio divided *applicants* by seats — a throughput figure over a
 * headcount cap, which is two units in one number and read as neither.
 * The cap itself is a billing field, set and shown on `/ops/tenants`,
 * and the client's instruction on 8 September was that this product
 * bills per application. `applicants` is the number the removed column
 * was standing in for, and it was already on the row beside it.
 */

/**
 * One row per client for the dashboard's Clients tab.
 *
 * Keyed off the organisations, not off the applications — a client who
 * bought ten seats and has used none produces a row of zeros rather than
 * no row at all, and that row is the most useful one on the table.
 *
 * `invited` and `applicants` are deliberately two columns. They come
 * from different tables and mean different things: an invitation that
 * was never accepted is a person who does not exist in
 * `applications`. The gap between the two is a client's activation
 * problem, and collapsing them into one figure would hide it.
 *
 * An application with no `org_id` belongs to nobody here. The schema is
 * explicit that "a traveller who signed up directly is nobody's client",
 * and attributing them would credit a business with somebody it never
 * sponsored.
 */
export function rollupClients(input: {
  orgs: readonly { id: string; name: string }[];
  invitations: readonly ClientInvitation[];
  applications: readonly ClientApplication[];
}): ClientRow[] {
  const rows = new Map<string, ClientRow>(
    input.orgs.map((org) => [
      org.id,
      {
        orgId: org.id,
        name: org.name,
        invited: 0,
        accepted: 0,
        applicants: 0,
        stalled: 0,
        approved: 0,
        rejected: 0,
        approvalRate: null,
      },
    ])
  );

  for (const invitation of input.invitations) {
    const row = rows.get(invitation.orgId);
    if (!row) continue;
    row.invited += 1;
    if (invitation.status === "accepted") row.accepted += 1;
  }

  for (const application of input.applications) {
    if (!application.orgId) continue;
    const row = rows.get(application.orgId);
    if (!row) continue;

    row.applicants += 1;
    if (application.status === "approved") row.approved += 1;
    if (application.status === "rejected") row.rejected += 1;
    if (application.checklistCompleteAt && !application.submittedAt) {
      row.stalled += 1;
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      // Decided applications only. Counting everyone in flight as a
      // non-approval would show a client's rate dropping every time they
      // sent somebody new, which is the opposite of what happened.
      approvalRate: rate(row.approved, row.approved + row.rejected),
    }))
    .sort((a, b) => b.applicants - a.applicants || a.name.localeCompare(b.name));
}

/** What the queue panel needs on top of the funnel's columns. */
export type QueueFacts = ApplicationFacts & {
  /**
   * The first time this case was submitted. `submittedAt` is the latest
   * submission and moves on every resubmission; this one never does.
   * `null` on a row that predates the column and was never backfilled,
   * in which case the timeline falls back to `submittedAt`.
   */
  firstSubmittedAt: Date | null;
  assigneeId: string | null;
};

export type OperationsKpis = {
  /** Every open case, the traveller's turn included — see `OPEN_STATUSES`. */
  openCases: number;
  /** In review (`REVIEW_STATUSES`) with nobody assigned. */
  unassigned: number;
  /** In review for more than `OVERDUE_AFTER_DAYS` since the last submission. */
  overdue: number;
  byStatus: { status: ApplicationStatus; count: number }[];
  /**
   * Mean days from first submission to decision, approved cases only.
   * Unrounded — `formatTimelineDays` decides how it reads.
   */
  meanDaysToApproval: number | null;
  approvalRate: number | null;
  decided: number;
};

/**
 * The statuses that mean somebody still has work to do.
 *
 * `processing` counts. Nobody at the agency is reading the file while a
 * mission decides, but the case is open, the traveller is waiting, and
 * dropping it would make the desk's open count fall every time a
 * reviewer did their job and lodged one.
 *
 * The interview leg counts for the same reason, and more plainly still:
 * a case with an interview booked is the most open a case ever gets —
 * there is a date, somebody has to keep it, and it can still go either
 * way. Leaving either status out would have closed the case on every
 * tile here the moment the appointment was made.
 */
export const OPEN_STATUSES: readonly ApplicationStatus[] = [
  "collecting_documents",
  "submitted",
  "under_review",
  "processing",
  "interview_scheduled",
  "awaiting_decision",
  "additional_documents",
];

/**
 * Open cases that are waiting on the review side rather than on the
 * traveller: `OPEN_STATUSES` without `collecting_documents` and
 * `additional_documents`, where the next move is the traveller's.
 *
 * What the ops dashboard means by "Open applications — still in review"
 * (decision D5, 2026-09-17, pending the client's confirmation). A new
 * set rather than a change to `OPEN_STATUSES`, which other screens read
 * as "not finished".
 */
export const REVIEW_STATUSES: readonly ApplicationStatus[] = OPEN_STATUSES.filter(
  (status) => status !== "collecting_documents" && status !== "additional_documents"
);

/**
 * How long a case may sit in review, counted from its latest submission,
 * before the dashboard calls it overdue.
 *
 * Decision D3, 2026-09-17, pending the client's confirmation. Replaces
 * `sla_due_at`, which nothing ever wrote, so the old card read 0 forever.
 */
export const OVERDUE_AFTER_DAYS = 5;

const DAY = 86_400_000;

/** The headline counters above the ops dashboard's tabs. */
export type DashboardTotals = {
  /** Every application, whatever its status — drafts included. */
  applicationsProcessed: number;
  /** Applications that ended in an approved visa. */
  travellers: number;
  /** Applications waiting on a reviewer — see `REVIEW_STATUSES`. */
  openCases: number;
};

/**
 * The three application counts at the top of the ops dashboard.
 *
 * Decisions D5 and D10, 2026-09-17, pending the client's confirmation:
 * "Travellers" is approved applications, not traveller accounts — the
 * old figure counted invited clients who never started and removed
 * staff. Every traveller is therefore also an application, and the
 * test pins `travellers <= applicationsProcessed`.
 */
export function dashboardTotals(rows: readonly { status: ApplicationStatus }[]): DashboardTotals {
  return {
    applicationsProcessed: rows.length,
    travellers: rows.filter((r) => r.status === "approved").length,
    openCases: rows.filter((r) => REVIEW_STATUSES.includes(r.status)).length,
  };
}

/**
 * A timeline in days: one decimal under ten, so a fast desk reads
 * "0.4d" rather than "0d"; whole days from ten up; an em dash before
 * the first approval.
 */
export function formatTimelineDays(days: number | null): string {
  if (days === null) return "—";
  const tenths = Math.round(days * 10) / 10;
  return tenths < 10 ? `${tenths.toFixed(1)}d` : `${Math.round(days)}d`;
}

/**
 * The state of the review desk.
 *
 * Pure, and separated from the query that feeds it, because the figures
 * here are the ones most easily computed off the wrong column. Time to
 * decision measured from `created_at` rather than a submission folds in
 * however long a traveller took to gather their documents — it still
 * produces a plausible number of days, on a tile labelled as though it
 * described the review desk. Only an exact test catches that, and an
 * exact test needs a fixture the rest of the database cannot perturb.
 */
export function operationsOf(
  rows: readonly QueueFacts[],
  now: Date
): OperationsKpis {
  const open = rows.filter((r) => OPEN_STATUSES.includes(r.status));
  const inReview = rows.filter((r) => REVIEW_STATUSES.includes(r.status));
  // Decided by status, which is the authoritative state. `decided_at` is
  // a timestamp some terminal rows never got, so counting the rate by
  // status and its denominator by timestamp puts "100% over 1 decided"
  // beside "Approved 2" — two tiles on one screen disagreeing about the
  // same fact. The duration below still needs the timestamps and skips
  // the rows that lack them; the count does not.
  const decided = rows.filter((r) => TERMINAL_STATUSES.includes(r.status));

  const byStatus = new Map<ApplicationStatus, number>();
  for (const row of rows) byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);

  const approvedRows = rows.filter((r) => r.status === "approved");
  const approved = approvedRows.length;
  const rejected = rows.filter((r) => r.status === "rejected").length;

  // The mean, not the median, and approved cases only — decision D4,
  // 2026-09-17, pending the client's confirmation: the figure is "how
  // long from submission to an approved visa". From the first
  // submission, so a case sent back for more documents does not have
  // its clock reset by the resubmission.
  const approvalDurations = approvedRows
    .map((r) => elapsed(r.firstSubmittedAt ?? r.submittedAt, r.decidedAt))
    .filter((v): v is number => v !== null);
  const meanDaysToApproval =
    approvalDurations.length === 0
      ? null
      : approvalDurations.reduce((sum, v) => sum + v, 0) / approvalDurations.length / DAY;

  const overdueBefore = now.getTime() - OVERDUE_AFTER_DAYS * DAY;

  return {
    openCases: open.length,
    // In review rather than open, so this card counts from the same set
    // as "Open applications" and can never read higher than it.
    unassigned: inReview.filter((r) => !r.assigneeId).length,
    // In review only, so a case decided late, or one waiting on the
    // traveller, is not reported as work the desk can still go and do.
    overdue: inReview.filter(
      (r) => r.submittedAt !== null && r.submittedAt.getTime() < overdueBefore
    ).length,
    byStatus: [...byStatus.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    meanDaysToApproval,
    approvalRate: rate(approved, approved + rejected),
    decided: decided.length,
  };
}

export type TopCount = { key: string; count: number };

/**
 * The most frequent values, most frequent first.
 *
 * Ties break on the key so the order is a function of the data alone.
 * Left to `Map` insertion order, two destinations with one application
 * each would swap places whenever the underlying query returned rows in
 * a different order — which Postgres is free to do — and a page nobody
 * had changed would look like it had.
 */
export function topCounts(
  values: readonly (string | null | undefined)[],
  limit: number
): TopCount[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}
