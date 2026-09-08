import { describe, expect, it } from "vitest";

import {
  FUNNEL_STAGES,
  funnelOf,
  medianMs,
  operationsOf,
  rate,
  rollupClients,
  stalledAtChecklist,
  topCounts,
  type ApplicationFacts,
  type QueueFacts,
} from "@/lib/domain/kpis";

const DAY = 86_400_000;
const T0 = new Date("2026-08-01T00:00:00Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY);

function application(over: Partial<ApplicationFacts> = {}): ApplicationFacts {
  return {
    intakeComplete: false,
    checklistCompleteAt: null,
    submittedAt: null,
    decidedAt: null,
    status: "draft",
    ...over,
  };
}

describe("rate", () => {
  it("is null rather than NaN when nothing has happened yet", () => {
    // Every rate on this dashboard divides by a count that is zero on a
    // fresh database. `0/0` reaches the screen as "NaN%", so the empty
    // case has to be a value the renderer can recognise instead.
    expect(rate(0, 0)).toBeNull();
  });

  it("is a fraction of one, not a percentage", () => {
    expect(rate(3, 4)).toBe(0.75);
  });
});

describe("funnelOf", () => {
  it("counts nobody at every stage for an empty database", () => {
    const stages = funnelOf([]);
    expect(stages).toHaveLength(FUNNEL_STAGES.length);
    expect(stages.every((s) => s.count === 0)).toBe(true);
    expect(stages.every((s) => s.ofPrevious === null)).toBe(true);
  });

  it("counts each stage as reached-or-passed, so the funnel never widens", () => {
    // The row that motivates this: an application decided long ago,
    // whose `intake_complete` flag was never set because it predates the
    // column. Counting stages independently would show more people
    // decided than started, which reads as a bug in the dashboard.
    const stages = funnelOf([
      application({
        intakeComplete: false,
        checklistCompleteAt: null,
        submittedAt: at(1),
        decidedAt: at(3),
        status: "approved",
      }),
    ]);

    const counts = stages.map((s) => s.count);
    expect(counts).toEqual([1, 1, 1, 1, 1]);
  });

  it("reports each stage as a share of the one before it", () => {
    const rows = [
      // Four started, two finished intake, one submitted.
      application(),
      application(),
      application({ intakeComplete: true }),
      application({ intakeComplete: true, submittedAt: at(1), status: "submitted" }),
    ];

    const stages = funnelOf(rows);
    expect(stages[0]).toMatchObject({ count: 4, ofPrevious: null });
    expect(stages[1]).toMatchObject({ count: 2, ofPrevious: 0.5 });
  });
});

describe("stalledAtChecklist", () => {
  it("finds the people who uploaded everything and never pressed submit", () => {
    // The schema comment on `checklist_complete_at` calls this out by
    // name: "A traveller can be at 100% collected and never press Submit
    // — that person is precisely who this exists to make visible."
    const stalled = stalledAtChecklist([
      application({ checklistCompleteAt: at(1), submittedAt: null }),
      application({ checklistCompleteAt: at(1), submittedAt: at(2) }),
      application({ checklistCompleteAt: null, submittedAt: null }),
    ]);

    expect(stalled).toBe(1);
  });
});

/**
 * One row per client on the dashboard's Clients tab.
 *
 * Pure, and given plain arrays rather than a query, because the two
 * mistakes worth guarding against are both about attribution — counting
 * an invitation as an applicant, and counting a traveller who came on
 * their own as somebody's client — and neither needs a database to
 * demonstrate.
 */
describe("rollupClients", () => {
  const orgs = [
    { id: "org-1", name: "Acme", seatsPurchased: 10, createdAt: T0 },
    { id: "org-2", name: "Globex", seatsPurchased: 5, createdAt: T0 },
  ];

  it("counts people invited separately from people who actually applied", () => {
    // These are different numbers and the gap between them is the
    // client's activation problem. Collapsing them into one figure would
    // flatter every client on the page.
    const rows = rollupClients({
      orgs,
      invitations: [
        { orgId: "org-1", status: "accepted" },
        { orgId: "org-1", status: "pending" },
        { orgId: "org-1", status: "expired" },
      ],
      applications: [{ orgId: "org-1", ...application() }],
    });

    const acme = rows.find((r) => r.orgId === "org-1")!;
    expect(acme.invited).toBe(3);
    expect(acme.accepted).toBe(1);
    expect(acme.applicants).toBe(1);
  });

  it("keeps a traveller who came on their own out of every client's row", () => {
    // `applications.org_id` is nullable by design — "a traveller who
    // signed up directly is nobody's client". Attributing them to a
    // client would bill somebody for a person they never sponsored.
    const rows = rollupClients({
      orgs,
      invitations: [],
      applications: [
        { orgId: null, ...application({ status: "approved", decidedAt: at(2) }) },
      ],
    });

    expect(rows.every((r) => r.applicants === 0)).toBe(true);
  });

  it("gives a client with no activity at all a row of zeros, not no row", () => {
    // A client who bought seats and has not used them is the single most
    // useful row on this table, and a rollup keyed off applications
    // would drop them entirely.
    const rows = rollupClients({ orgs, invitations: [], applications: [] });

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.orgId === "org-2")).toMatchObject({
      name: "Globex",
      seatsPurchased: 5,
      applicants: 0,
      approvalRate: null,
    });
  });

  it("works out an approval rate from decisions alone", () => {
    const rows = rollupClients({
      orgs,
      invitations: [],
      applications: [
        { orgId: "org-1", ...application({ status: "approved", decidedAt: at(2) }) },
        { orgId: "org-1", ...application({ status: "approved", decidedAt: at(3) }) },
        { orgId: "org-1", ...application({ status: "rejected", decidedAt: at(4) }) },
        // Still in flight. Counting it as a non-approval would report a
        // client's approval rate falling every time they send someone new.
        { orgId: "org-1", ...application({ status: "under_review" }) },
      ],
    });

    expect(rows.find((r) => r.orgId === "org-1")!.approvalRate).toBeCloseTo(2 / 3);
  });

  it("orders the busiest client first", () => {
    const rows = rollupClients({
      orgs,
      invitations: [],
      applications: [
        { orgId: "org-2", ...application() },
        { orgId: "org-2", ...application() },
        { orgId: "org-1", ...application() },
      ],
    });

    expect(rows[0].orgId).toBe("org-2");
  });
});

describe("medianMs", () => {
  it("is null for no samples, so an empty console shows no duration", () => {
    expect(medianMs([])).toBeNull();
  });

  it("takes the middle value of an odd number of samples", () => {
    expect(medianMs([3 * DAY, 1 * DAY, 2 * DAY])).toBe(2 * DAY);
  });

  it("averages the two middle values of an even number of samples", () => {
    // The median, not the mean: one case stuck in review for a year
    // would drag an average past every real duration on the queue.
    expect(medianMs([1 * DAY, 2 * DAY, 4 * DAY, 100 * DAY])).toBe(3 * DAY);
  });
});

describe("operationsOf", () => {
  // `at(0)`, so a negative day is overdue and a positive one is not.
  const now = T0;

  function queued(over: Partial<QueueFacts> = {}): QueueFacts {
    return { ...application(), slaDueAt: null, assigneeId: null, ...over };
  }

  it("measures time to decision from submission, not from sign-up", () => {
    // Folding in however long a traveller took to gather their documents
    // would produce a figure that looks like a review-desk metric and
    // describes something else entirely.
    const ops = operationsOf(
      [
        queued({ submittedAt: at(3), decidedAt: at(7), status: "approved" }),
        queued({ submittedAt: at(1), decidedAt: at(3), status: "approved" }),
      ],
      now
    );

    // Four days and two days — the mean of the two middle values.
    expect(ops.medianDaysToDecision).toBe(3);
  });

  it("has no decision time at all before the first decision", () => {
    const ops = operationsOf([queued({ status: "submitted", submittedAt: at(1) })], now);
    expect(ops.medianDaysToDecision).toBeNull();
    expect(ops.approvalRate).toBeNull();
  });

  it("counts the same decisions the approval rate divides by", () => {
    // A case can carry a terminal status without a `decided_at` — the
    // column arrived after some rows did. Counting the rate by status
    // and the denominator by timestamp puts "100% over 1 decided" on
    // the screen beside "Approved 2", and a director who notices that
    // stops believing the tile next to it.
    const ops = operationsOf(
      [
        queued({ status: "approved", decidedAt: at(1) }),
        queued({ status: "approved", decidedAt: null }),
        queued({ status: "rejected", decidedAt: at(2) }),
      ],
      now
    );

    expect(ops.decided).toBe(3);
    expect(ops.approvalRate).toBeCloseTo(2 / 3);
  });

  it("counts an approval rate over decisions, not over everyone in flight", () => {
    const ops = operationsOf(
      [
        queued({ status: "approved", decidedAt: at(1) }),
        queued({ status: "rejected", decidedAt: at(1) }),
        // Counting this as a non-approval would make a client's rate
        // fall every time somebody new applied.
        queued({ status: "under_review" }),
      ],
      now
    );

    expect(ops.approvalRate).toBe(0.5);
  });

  it("counts an open case past its SLA as overdue, and a decided one never", () => {
    const ops = operationsOf(
      [
        queued({ status: "under_review", slaDueAt: at(-1) }),
        queued({ status: "under_review", slaDueAt: at(5) }),
        // Late, but finished. An SLA breach after the decision has
        // landed is not work anybody can still do.
        queued({ status: "approved", decidedAt: at(-2), slaDueAt: at(-3) }),
      ],
      now
    );

    expect(ops.overdueSla).toBe(1);
    expect(ops.openCases).toBe(2);
  });

  it("counts an open case with no reviewer as unassigned", () => {
    const ops = operationsOf(
      [
        queued({ status: "submitted" }),
        queued({ status: "submitted", assigneeId: "staff_1" }),
        // Unassigned, but nobody needs to pick it up.
        queued({ status: "approved", decidedAt: at(1) }),
      ],
      now
    );

    expect(ops.unassigned).toBe(1);
  });
});

describe("topCounts", () => {
  it("orders by frequency, breaking ties by name so the list holds still", () => {
    const top = topCounts(["gb", "us", "gb", "ca", "us", "gb", "ae"], 3);
    expect(top).toEqual([
      { key: "gb", count: 3 },
      { key: "us", count: 2 },
      // "ae" and "ca" both appear once. Without a tie-break the order
      // depends on Map insertion, so the same data would render in a
      // different order on a page that only re-sorted its rows.
      { key: "ae", count: 1 },
    ]);
  });

  it("drops empty keys rather than showing a blank row", () => {
    expect(topCounts(["gb", null, undefined, ""], 5)).toEqual([{ key: "gb", count: 1 }]);
  });
});
