import { describe, expect, it } from "vitest";

import {
  FUNNEL_STAGES,
  OPEN_STATUSES,
  OVERDUE_AFTER_DAYS,
  REVIEW_STATUSES,
  dashboardTotals,
  formatTimelineDays,
  funnelOf,
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
    // A client who has been provisioned and has sent nobody is the
    // single most useful row on this table, and a rollup keyed off
    // applications would drop them entirely.
    const rows = rollupClients({ orgs, invitations: [], applications: [] });

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.orgId === "org-2")).toMatchObject({
      name: "Globex",
      applicants: 0,
      approvalRate: null,
    });
  });

  it("reports no seat figure — this table counts applications", () => {
    // The Seats column came off `/ops/dashboard` on 2026-09-09, and the
    // row should not keep carrying the number behind it: a field nothing
    // renders is a field that grows a column back.
    const [row] = rollupClients({ orgs, invitations: [], applications: [] });
    expect(row).not.toHaveProperty("seatsPurchased");
    expect(row).not.toHaveProperty("seatUtilisation");
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

describe("operationsOf", () => {
  // `at(0)`, so a case submitted at `at(-6)` has been in review six days.
  const now = T0;

  function queued(over: Partial<QueueFacts> = {}): QueueFacts {
    return { ...application(), firstSubmittedAt: null, assigneeId: null, ...over };
  }

  it("measures the timeline from first submission, not from the resubmission", () => {
    // `submitted_at` moves every time a traveller resubmits after a
    // request for more documents. Measuring from it would reset the
    // clock on exactly the cases that took longest.
    const ops = operationsOf(
      [
        queued({
          status: "approved",
          firstSubmittedAt: at(1),
          submittedAt: at(5),
          decidedAt: at(7),
        }),
      ],
      now
    );

    expect(ops.meanDaysToApproval).toBe(6);
  });

  it("averages approved cases only, with the mean rather than the median", () => {
    const ops = operationsOf(
      [
        queued({ status: "approved", firstSubmittedAt: at(3), submittedAt: at(3), decidedAt: at(7) }),
        queued({ status: "approved", firstSubmittedAt: at(1), submittedAt: at(1), decidedAt: at(2) }),
        queued({ status: "approved", firstSubmittedAt: at(0), submittedAt: at(0), decidedAt: at(10) }),
        // A refusal is a decision, but the client's figure is time to an
        // approved visa.
        queued({ status: "rejected", firstSubmittedAt: at(0), submittedAt: at(0), decidedAt: at(30) }),
      ],
      now
    );

    // (4 + 1 + 10) / 3
    expect(ops.meanDaysToApproval).toBe(5);
  });

  it("falls back to submitted_at for a row that predates first_submitted_at", () => {
    const ops = operationsOf(
      [queued({ status: "approved", submittedAt: at(1), decidedAt: at(3) })],
      now
    );

    expect(ops.meanDaysToApproval).toBe(2);
  });

  it("keeps the fraction, so half a day is not rounded to nothing", () => {
    const ops = operationsOf(
      [queued({ status: "approved", firstSubmittedAt: at(1), submittedAt: at(1), decidedAt: at(1.5) })],
      now
    );

    expect(ops.meanDaysToApproval).toBe(0.5);
  });

  it("has no timeline at all before the first approval", () => {
    const ops = operationsOf(
      [
        queued({ status: "submitted", submittedAt: at(1) }),
        // Approved, but with no timestamps to measure between.
        queued({ status: "approved", decidedAt: null }),
      ],
      now
    );
    expect(ops.meanDaysToApproval).toBeNull();
  });

  it("has no approval rate before the first decision", () => {
    const ops = operationsOf([queued({ status: "submitted", submittedAt: at(1) })], now);
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

  it(`counts a case as overdue after ${OVERDUE_AFTER_DAYS} days in review`, () => {
    const ops = operationsOf(
      [
        // Six days in review.
        queued({ status: "under_review", submittedAt: at(-6) }),
        queued({ status: "awaiting_decision", submittedAt: at(-(OVERDUE_AFTER_DAYS + 0.01)) }),
        // Exactly on the line is not over it.
        queued({ status: "submitted", submittedAt: at(-OVERDUE_AFTER_DAYS) }),
        queued({ status: "under_review", submittedAt: at(-2) }),
      ],
      now
    );

    expect(ops.overdue).toBe(2);
  });

  it("never counts a decided case, or one waiting on the traveller, as overdue", () => {
    const ops = operationsOf(
      [
        // Late, but finished — not work anybody can still do.
        queued({ status: "approved", submittedAt: at(-30), decidedAt: at(-2) }),
        // The traveller's turn: the desk cannot move it.
        queued({ status: "additional_documents", submittedAt: at(-30) }),
        // In review but never submitted — nothing to measure from.
        queued({ status: "under_review", submittedAt: null }),
      ],
      now
    );

    expect(ops.overdue).toBe(0);
  });

  /**
   * The bug this pins is the one `processing`'s own comment warns about,
   * one step further along: a status that means "waiting on a mission"
   * and is left out of `OPEN_STATUSES` makes the desk's open count fall
   * every time a reviewer does their job. Booking an interview would
   * have closed the case as far as every tile on the dashboard was
   * concerned, while the traveller sat waiting for a date.
   */
  it("keeps a case open through the interview leg", () => {
    const ops = operationsOf(
      [
        queued({ status: "interview_scheduled" }),
        queued({ status: "awaiting_decision" }),
      ],
      now
    );

    expect(ops.openCases).toBe(2);
    expect(ops.decided).toBe(0);
    expect(ops.approvalRate).toBeNull();
  });

  it("counts a case in review with no reviewer as unassigned", () => {
    const ops = operationsOf(
      [
        queued({ status: "submitted" }),
        queued({ status: "submitted", assigneeId: "staff_1" }),
        // Unassigned, but it is the traveller's turn — the same rule
        // the "Open applications" card counts by, so this card can never
        // read higher than that one.
        queued({ status: "collecting_documents" }),
        // Unassigned, but nobody needs to pick it up.
        queued({ status: "approved", decidedAt: at(1) }),
      ],
      now
    );

    expect(ops.unassigned).toBe(1);
  });
});

describe("dashboardTotals", () => {
  it("counts every application as processed, drafts included", () => {
    const totals = dashboardTotals([
      application({ status: "draft" }),
      application({ status: "collecting_documents" }),
      application({ status: "under_review" }),
      application({ status: "approved" }),
    ]);

    expect(totals.applicationsProcessed).toBe(4);
  });

  it("counts travellers as approved applications, not accounts", () => {
    const totals = dashboardTotals([
      application({ status: "approved" }),
      application({ status: "approved" }),
      application({ status: "rejected" }),
      application({ status: "draft" }),
    ]);

    expect(totals.travellers).toBe(2);
  });

  it("counts open applications as the ones waiting on a reviewer", () => {
    // The traveller's turn is not "still in review": nobody at the desk
    // can move a case that is waiting for its own documents.
    const totals = dashboardTotals([
      application({ status: "collecting_documents" }),
      application({ status: "additional_documents" }),
      application({ status: "submitted" }),
      application({ status: "under_review" }),
      application({ status: "processing" }),
      application({ status: "interview_scheduled" }),
      application({ status: "awaiting_decision" }),
      application({ status: "approved" }),
    ]);

    expect(totals.openCases).toBe(5);
  });

  it("never reports more travellers than applications processed", () => {
    const statuses = [
      "draft",
      "collecting_documents",
      "submitted",
      "approved",
      "rejected",
      "approved",
    ] as const;

    for (let n = 0; n <= statuses.length; n += 1) {
      const totals = dashboardTotals(
        statuses.slice(0, n).map((status) => application({ status }))
      );
      expect(totals.travellers).toBeLessThanOrEqual(totals.applicationsProcessed);
    }
  });
});

describe("REVIEW_STATUSES", () => {
  it("is the open statuses without the traveller's turn", () => {
    expect([...REVIEW_STATUSES].sort()).toEqual(
      OPEN_STATUSES.filter(
        (s) => s !== "collecting_documents" && s !== "additional_documents"
      ).sort()
    );
  });
});

describe("formatTimelineDays", () => {
  it("is an em dash before the first approval", () => {
    expect(formatTimelineDays(null)).toBe("—");
  });

  it("counts hours under a day, so a fast desk does not read 0.0d", () => {
    expect(formatTimelineDays(0.3)).toBe("7h");
    expect(formatTimelineDays(0.01)).toBe("<1h");
    // 23.9h rounds to 24h, which is a day.
    expect(formatTimelineDays(0.996)).toBe("1.0d");
  });

  it("keeps one decimal from one day to under ten", () => {
    expect(formatTimelineDays(2.46)).toBe("2.5d");
  });

  it("rounds to whole days from ten up", () => {
    expect(formatTimelineDays(12.4)).toBe("12d");
    // 9.96 rounds to 10.0, which is no longer under ten.
    expect(formatTimelineDays(9.96)).toBe("10d");
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
