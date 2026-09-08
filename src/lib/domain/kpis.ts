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

/**
 * The middle duration, or `null` with no samples.
 *
 * The median rather than the mean, deliberately. One case abandoned in
 * `under_review` for a year pulls an average past every real duration on
 * the queue, and the resulting figure describes no application that
 * exists. The median stays where the work is.
 */
export function medianMs(values: readonly number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
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
  seatsPurchased: number;
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
  /** Seats used over seats bought; `null` when they bought none. */
  seatUtilisation: number | null;
};

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
  orgs: readonly { id: string; name: string; seatsPurchased: number }[];
  invitations: readonly ClientInvitation[];
  applications: readonly ClientApplication[];
}): ClientRow[] {
  const rows = new Map<string, ClientRow>(
    input.orgs.map((org) => [
      org.id,
      {
        orgId: org.id,
        name: org.name,
        seatsPurchased: org.seatsPurchased,
        invited: 0,
        accepted: 0,
        applicants: 0,
        stalled: 0,
        approved: 0,
        rejected: 0,
        approvalRate: null,
        seatUtilisation: null,
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
      seatUtilisation: rate(row.applicants, row.seatsPurchased),
    }))
    .sort((a, b) => b.applicants - a.applicants || a.name.localeCompare(b.name));
}

/** What the queue panel needs on top of the funnel's columns. */
export type QueueFacts = ApplicationFacts & {
  slaDueAt: Date | null;
  assigneeId: string | null;
};

export type OperationsKpis = {
  openCases: number;
  unassigned: number;
  /** Open, past `sla_due_at`, and still without a decision. */
  overdueSla: number;
  byStatus: { status: ApplicationStatus; count: number }[];
  medianDaysToDecision: number | null;
  /** From a full checklist to pressing Submit. */
  medianDaysToSubmit: number | null;
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
 */
export const OPEN_STATUSES: readonly ApplicationStatus[] = [
  "collecting_documents",
  "submitted",
  "under_review",
  "processing",
  "additional_documents",
];

const DAY = 86_400_000;

/**
 * The state of the review desk.
 *
 * Pure, and separated from the query that feeds it, because the figures
 * here are the ones most easily computed off the wrong column. Time to
 * decision measured from `created_at` rather than `submitted_at` folds
 * in however long a traveller took to gather their documents — it still
 * produces a plausible number of days, on a tile labelled as though it
 * described the review desk. Only an exact test catches that, and an
 * exact test needs a fixture the rest of the database cannot perturb.
 */
export function operationsOf(
  rows: readonly QueueFacts[],
  now: Date
): OperationsKpis {
  const open = rows.filter((r) => OPEN_STATUSES.includes(r.status));
  // Decided by status, which is the authoritative state. `decided_at` is
  // a timestamp some terminal rows never got, so counting the rate by
  // status and its denominator by timestamp puts "100% over 1 decided"
  // beside "Approved 2" — two tiles on one screen disagreeing about the
  // same fact. The durations below still need the timestamp and skip the
  // rows that lack one; the count does not.
  const decided = rows.filter((r) => TERMINAL_STATUSES.includes(r.status));
  const timestamped = decided.filter((r) => r.decidedAt !== null);

  const byStatus = new Map<ApplicationStatus, number>();
  for (const row of rows) byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);

  const days = (values: (number | null)[]) => {
    const ms = medianMs(values.filter((v): v is number => v !== null));
    return ms === null ? null : Math.round(ms / DAY);
  };

  const approved = rows.filter((r) => r.status === "approved").length;
  const rejected = rows.filter((r) => r.status === "rejected").length;

  return {
    openCases: open.length,
    unassigned: open.filter((r) => !r.assigneeId).length,
    // Filtered to open cases first, so a case decided after its SLA
    // expired is not reported as work somebody can still go and do.
    overdueSla: open.filter(
      (r) => r.slaDueAt !== null && r.slaDueAt.getTime() < now.getTime()
    ).length,
    byStatus: [...byStatus.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    medianDaysToDecision: days(
      timestamped.map((r) => elapsed(r.submittedAt, r.decidedAt))
    ),
    medianDaysToSubmit: days(
      rows.map((r) => elapsed(r.checklistCompleteAt, r.submittedAt))
    ),
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
