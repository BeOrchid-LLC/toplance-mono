import { describe, expect, it } from "vitest";

import {
  OVERDUE_AFTER_DAYS,
  clientFeesByMonth,
  collapseClientRevenue,
  recentCycles,
  revenueByCycle,
  statusFor,
  summarise,
  type Invoice,
} from "@/lib/domain/payments";

const CYCLE_START = new Date("2026-07-01T00:00:00Z");
const CYCLE_END = new Date("2026-08-01T00:00:00Z");

function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv_test_1",
    orgId: "org-1",
    orgName: "Acme",
    cycleStart: CYCLE_START,
    cycleEnd: CYCLE_END,
    applications: 10,
    baseFeeMinor: 300_00,
    amountMinor: 480_00,
    currency: "USD",
    status: "paid",
    paidAt: CYCLE_END,
    ...over,
  };
}

/**
 * Where a cycle stands, given the `payments` rows that fall inside it.
 *
 * The claims worth pinning are the ones that would put a number in front
 * of a director that nobody paid: an unpaid cycle is never `paid`, and a
 * cycle still running is never money owed. An earlier draft of this
 * screen generated settlement from a hash of the invoice id, because
 * there was no `payments` table to read; there is one now, and these
 * tests are what stop that coming back.
 */
describe("statusFor", () => {
  const now = new Date("2026-08-15T00:00:00Z");
  const OPEN_CYCLE_END = new Date("2026-09-01T00:00:00Z");

  it("leaves a cycle that has not closed as a draft", () => {
    // Nothing has been charged yet — the cycle is still accruing
    // applications, so any settled status would be a claim about money
    // that has not been asked for.
    expect(statusFor(OPEN_CYCLE_END, [], now).status).toBe("draft");
  });

  it("calls a closed cycle with nothing against it open, never paid", () => {
    const { status, paidAt } = statusFor(CYCLE_END, [], now);
    expect(status).toBe("open");
    expect(paidAt).toBeNull();
  });

  it("settles a cycle a paid row covers, and carries that row's date", () => {
    const settledOn = new Date("2026-08-03T11:00:00Z");
    const { status, paidAt } = statusFor(
      CYCLE_END,
      [{ status: "paid", paidAt: settledOn }],
      now
    );
    expect(status).toBe("paid");
    // The date the money arrived, not the close of the cycle. A director
    // chasing a payment needs the day it landed.
    expect(paidAt).toEqual(settledOn);
  });

  it("prefers a paid row over a failed one on the same cycle", () => {
    // A declined card followed by a successful retry is the ordinary
    // path, and reporting that cycle as failed would send somebody to
    // chase money already in the account.
    const { status } = statusFor(
      CYCLE_END,
      [
        { status: "failed", paidAt: null },
        { status: "paid", paidAt: CYCLE_END },
      ],
      now
    );
    expect(status).toBe("paid");
  });

  it("marks a closed cycle with only a failed row as failed", () => {
    const { status } = statusFor(CYCLE_END, [{ status: "failed", paidAt: null }], now);
    expect(status).toBe("failed");
  });

  it("treats a pending row on a closed cycle as simply unpaid", () => {
    // A checkout that was started and never came back. The money is not
    // here, and `checkout_started` already measures the abandonment.
    const { status } = statusFor(CYCLE_END, [{ status: "pending", paidAt: null }], now);
    expect(status).toBe("open");
  });

  it("keeps a running cycle a draft even after a charge failed on it", () => {
    // Draft outranks open, not failed: a failure is a fact about a
    // charge that was attempted, whenever the cycle closes.
    const { status } = statusFor(
      OPEN_CYCLE_END,
      [{ status: "failed", paidAt: null }],
      now
    );
    expect(status).toBe("failed");
  });
});

/**
 * The billing history a client has, which is what the revenue chart
 * plots. Built by walking `cycleFor` backwards rather than by adding
 * months, so the anniversary clamp that file documents applies here too
 * and February cannot fall through a gap.
 */
describe("recentCycles", () => {
  const signup = new Date("2026-01-14T09:30:00Z");
  const now = new Date("2026-08-20T00:00:00Z");

  it("returns the requested number of cycles, newest first", () => {
    const cycles = recentCycles(signup, now, 3);
    expect(cycles).toHaveLength(3);
    expect(cycles[0].start.getTime()).toBeGreaterThan(cycles[1].start.getTime());
  });

  it("starts with the cycle that is open right now", () => {
    const [current] = recentCycles(signup, now, 3);
    expect(current.start).toEqual(new Date(Date.UTC(2026, 7, 14)));
    expect(current.end).toEqual(new Date(Date.UTC(2026, 8, 14)));
  });

  it("leaves no gap between one cycle and the next", () => {
    // `end` is exclusive, so contiguity means each cycle's end is the
    // next one's start. A gap would be a month where a completed
    // application was billed in no invoice at all.
    const cycles = recentCycles(signup, now, 6);
    for (let i = 0; i < cycles.length - 1; i++) {
      expect(cycles[i].start).toEqual(cycles[i + 1].end);
    }
  });

  it("never invoices a client for a cycle that began before they signed up", () => {
    // Seven full cycles exist since January, so asking for twenty must
    // still stop at the signup rather than inventing 2025 revenue.
    const cycles = recentCycles(signup, now, 20);
    expect(cycles.length).toBeLessThanOrEqual(8);
    for (const cycle of cycles) {
      expect(cycle.end.getTime()).toBeGreaterThan(signup.getTime());
    }
  });

  it("gives a client who signed up today exactly one cycle", () => {
    const cycles = recentCycles(now, now, 6);
    expect(cycles).toHaveLength(1);
  });
});

describe("summarise", () => {
  const now = new Date("2026-08-15T00:00:00Z");

  it("returns zeros for an empty database rather than dividing by zero", () => {
    const s = summarise([], now);
    expect(s.collectedMinor).toBe(0);
    expect(s.outstandingMinor).toBe(0);
    expect(s.mrrMinor).toBe(0);
    // The trap: billed / clients with no clients is NaN, and NaN
    // formats as "$NaN" on a screen a director is reading.
    expect(s.arpaMinor).toBe(0);
    expect(s.payingClients).toBe(0);
  });

  it("counts only what a paid row settled towards collected", () => {
    const s = summarise(
      [
        invoice({ id: "a", status: "paid", amountMinor: 1_000_00 }),
        // Closed and unpaid. This is the ordinary state of every cycle
        // on a product that has taken no payments yet, and the tile
        // above it must read $0 rather than something plausible.
        invoice({ id: "b", orgId: "org-2", status: "open", amountMinor: 250_00 }),
      ],
      now
    );

    expect(s.collectedMinor).toBe(1_000_00);
    expect(s.outstandingMinor).toBe(250_00);
  });

  it("counts unpaid and failed invoices as outstanding, and drafts as accruing", () => {
    const s = summarise(
      [
        invoice({ id: "a", status: "open", amountMinor: 100_00 }),
        invoice({ id: "b", orgId: "org-2", status: "failed", amountMinor: 200_00 }),
        invoice({
          id: "c",
          orgId: "org-3",
          status: "draft",
          amountMinor: 400_00,
          cycleEnd: new Date("2026-09-01T00:00:00Z"),
        }),
      ],
      now
    );

    expect(s.outstandingMinor).toBe(300_00);
    expect(s.accruingMinor).toBe(400_00);
  });

  it("calls an unpaid invoice overdue only once the grace window has passed", () => {
    const justClosed = new Date(now.getTime() - (OVERDUE_AFTER_DAYS - 1) * 86_400_000);
    const longClosed = new Date(now.getTime() - (OVERDUE_AFTER_DAYS + 1) * 86_400_000);

    const s = summarise(
      [
        invoice({ id: "a", status: "open", amountMinor: 100_00, cycleEnd: justClosed }),
        invoice({
          id: "b",
          orgId: "org-2",
          status: "open",
          amountMinor: 200_00,
          cycleEnd: longClosed,
        }),
      ],
      now
    );

    expect(s.outstandingMinor).toBe(300_00);
    expect(s.overdueMinor).toBe(200_00);
  });

  it("counts each client's base fee once towards MRR, from the open cycle only", () => {
    const s = summarise(
      [
        // Two invoices for one client in the current cycle would double
        // its subscription if MRR summed rows rather than clients.
        invoice({ id: "a", orgId: "org-1", status: "draft", baseFeeMinor: 300_00 }),
        invoice({ id: "b", orgId: "org-1", status: "draft", baseFeeMinor: 300_00 }),
        invoice({ id: "c", orgId: "org-2", status: "draft", baseFeeMinor: 500_00 }),
        // A closed cycle's money is already counted as collected, and
        // counting it again would be the same revenue twice.
        invoice({ id: "d", orgId: "org-3", status: "paid", baseFeeMinor: 900_00 }),
      ],
      now
    );

    expect(s.mrrMinor).toBe(800_00);
  });

  it("averages billed revenue over the clients actually billed", () => {
    const s = summarise(
      [
        invoice({ id: "a", orgId: "org-1", status: "paid", amountMinor: 300_00 }),
        invoice({ id: "b", orgId: "org-2", status: "open", amountMinor: 500_00 }),
        // A draft is not billed yet, so neither its money nor its client
        // belongs in the average.
        invoice({ id: "c", orgId: "org-3", status: "draft", amountMinor: 9_999_00 }),
      ],
      now
    );

    expect(s.payingClients).toBe(2);
    expect(s.arpaMinor).toBe(400_00);
  });
});

/**
 * The revenue chart's series. One point per cycle across every client,
 * because the chart's question is how the business is doing month to
 * month, not who paid.
 */
describe("revenueByCycle", () => {
  const jul = { cycleStart: new Date("2026-07-01T00:00:00Z") };
  const aug = { cycleStart: new Date("2026-08-01T00:00:00Z") };

  it("has no points at all with no invoices", () => {
    expect(revenueByCycle([])).toEqual([]);
  });

  it("puts the oldest cycle first, however the invoices arrived", () => {
    // A chart plotted in query order would draw time backwards for a
    // client whose rows happened to come back newest-first.
    const points = revenueByCycle([
      invoice({ id: "a", ...aug }),
      invoice({ id: "b", orgId: "org-2", ...jul }),
    ]);

    expect(points.map((p) => p.cycle)).toEqual(["2026-07", "2026-08"]);
  });

  it("adds every client's money into the same cycle's point", () => {
    const points = revenueByCycle([
      invoice({ id: "a", orgId: "org-1", status: "paid", amountMinor: 300_00, ...jul }),
      invoice({ id: "b", orgId: "org-2", status: "paid", amountMinor: 500_00, ...jul }),
    ]);

    expect(points).toHaveLength(1);
    expect(points[0].collectedMinor).toBe(800_00);
  });

  it("puts clients with different billing anniversaries in the same month together", () => {
    // Every client is billed on its own signup anniversary, so their
    // cycles start on different days. Grouping on the exact start date
    // gives one point per anniversary rather than one per month — a
    // hundred clients would draw a hundred bars, every one of them
    // labelled with the same month name.
    const points = revenueByCycle([
      invoice({
        id: "a",
        orgId: "org-1",
        status: "paid",
        amountMinor: 300_00,
        cycleStart: new Date("2026-07-03T00:00:00Z"),
      }),
      invoice({
        id: "b",
        orgId: "org-2",
        status: "paid",
        amountMinor: 500_00,
        cycleStart: new Date("2026-07-17T00:00:00Z"),
      }),
      invoice({
        id: "c",
        orgId: "org-3",
        status: "paid",
        amountMinor: 100_00,
        cycleStart: new Date("2026-08-28T00:00:00Z"),
      }),
    ]);

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ cycle: "2026-07", collectedMinor: 800_00 });
    expect(points[1]).toMatchObject({ cycle: "2026-08", collectedMinor: 100_00 });
  });

  it("separates money collected, money owed and money still accruing", () => {
    const points = revenueByCycle([
      invoice({ id: "a", orgId: "org-1", status: "paid", amountMinor: 300_00, ...jul }),
      invoice({ id: "b", orgId: "org-2", status: "open", amountMinor: 500_00, ...jul }),
      invoice({ id: "c", orgId: "org-3", status: "failed", amountMinor: 100_00, ...jul }),
      invoice({ id: "d", orgId: "org-4", status: "draft", amountMinor: 900_00, ...jul }),
    ]);

    expect(points[0]).toMatchObject({
      collectedMinor: 300_00,
      // A declined charge is money owed, the same as an unpaid one.
      outstandingMinor: 600_00,
      accruingMinor: 900_00,
    });
  });

  it("puts every invoice in exactly one series, so a bar is the whole month", () => {
    // The three series are stacked. An invoice counted in two of them
    // would draw a month taller than the money in it, and the chart
    // would disagree with the tiles directly above it.
    const points = revenueByCycle([
      invoice({ id: "a", status: "paid", amountMinor: 300_00, ...jul }),
      invoice({ id: "b", orgId: "org-2", status: "open", amountMinor: 100_00, ...jul }),
      invoice({ id: "c", orgId: "org-3", status: "failed", amountMinor: 50_00, ...jul }),
      invoice({ id: "d", orgId: "org-4", status: "draft", amountMinor: 700_00, ...jul }),
    ]);

    const [point] = points;
    expect(
      point.collectedMinor + point.outstandingMinor + point.accruingMinor
    ).toBe(1_150_00);
    expect(point.collectedMinor).toBe(300_00);
    expect(point.outstandingMinor).toBe(150_00);
    expect(point.accruingMinor).toBe(700_00);
  });

  it("totals the applications behind each cycle's revenue", () => {
    const points = revenueByCycle([
      invoice({ id: "a", orgId: "org-1", applications: 3, ...jul }),
      invoice({ id: "b", orgId: "org-2", applications: 4, ...jul }),
    ]);

    expect(points[0].applications).toBe(7);
  });
});

describe("collapseClientRevenue", () => {
  it("reports zero in the fallback currency when nothing has settled", () => {
    const revenue = collapseClientRevenue([], "NGN");

    expect(revenue).toEqual({
      currency: "NGN",
      totalMinor: 0,
      cases: 0,
      mixedCurrency: false,
    });
  });

  it("passes a single currency straight through", () => {
    const revenue = collapseClientRevenue([
      { currency: "USD", totalMinor: 45_00, cases: 3 },
    ]);

    expect(revenue).toEqual({
      currency: "USD",
      totalMinor: 45_00,
      cases: 3,
      mixedCurrency: false,
    });
  });

  /**
   * The reason this function exists. Summing would report 145_00 of a
   * currency that does not exist; the tile must show one real total and
   * admit that it is not the whole story.
   */
  it("never adds minor units across currencies", () => {
    const revenue = collapseClientRevenue([
      { currency: "USD", totalMinor: 45_00, cases: 3 },
      { currency: "NGN", totalMinor: 100_00, cases: 2 },
    ]);

    expect(revenue.totalMinor).toBe(100_00);
    expect(revenue.currency).toBe("NGN");
    expect(revenue.cases).toBe(2);
    expect(revenue.mixedCurrency).toBe(true);
  });

  it("breaks ties on the currency name so the figure does not flicker", () => {
    const rows = [
      { currency: "USD", totalMinor: 50_00, cases: 1 },
      { currency: "EUR", totalMinor: 50_00, cases: 4 },
    ];

    expect(collapseClientRevenue(rows).currency).toBe("EUR");
    expect(collapseClientRevenue([...rows].reverse()).currency).toBe("EUR");
  });
});


describe("clientFeesByMonth", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  const fee = (paidAt: string, amountMinor: number, applicationId = "a1") => ({
    paidAt: new Date(paidAt),
    amountMinor,
    applicationId,
  });

  it("returns every month in the window, oldest first", () => {
    const points = clientFeesByMonth([], 6, now);

    expect(points.map((p) => p.month)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("reaches back across a year boundary", () => {
    const points = clientFeesByMonth([], 4, new Date("2026-02-14T00:00:00Z"));

    expect(points.map((p) => p.month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  // The whole reason the window is laid down before the rows are
  // bucketed: a quiet month must draw as a zero, not vanish and leave
  // two non-adjacent months looking consecutive.
  it("keeps a month nobody paid in as a zero", () => {
    const points = clientFeesByMonth(
      [fee("2026-07-02T00:00:00Z", 25_00), fee("2026-09-01T00:00:00Z", 25_00)],
      6,
      now
    );

    const august = points.find((p) => p.month === "2026-08");
    expect(august).toEqual({ month: "2026-08", totalMinor: 0, cases: 0 });
    expect(points).toHaveLength(6);
  });

  it("sums the fees that settled in each month", () => {
    const points = clientFeesByMonth(
      [
        fee("2026-08-03T00:00:00Z", 25_00, "a1"),
        fee("2026-08-19T00:00:00Z", 30_00, "a2"),
        fee("2026-09-01T00:00:00Z", 25_00, "a3"),
      ],
      6,
      now
    );

    expect(points.find((p) => p.month === "2026-08")).toEqual({
      month: "2026-08",
      totalMinor: 55_00,
      cases: 2,
    });
    expect(points.find((p) => p.month === "2026-09")?.totalMinor).toBe(25_00);
  });

  // Matches `clientRevenueForOrgs`, which counts distinct applications
  // for the tile sitting above this chart. Two figures derived from the
  // same rows must not disagree about how many clients paid.
  it("counts a case charged twice as one case", () => {
    const points = clientFeesByMonth(
      [
        fee("2026-08-03T00:00:00Z", 25_00, "a1"),
        fee("2026-08-04T00:00:00Z", 25_00, "a1"),
      ],
      6,
      now
    );

    expect(points.find((p) => p.month === "2026-08")).toEqual({
      month: "2026-08",
      totalMinor: 50_00,
      cases: 1,
    });
  });

  it("drops a fee that settled outside the window", () => {
    const points = clientFeesByMonth([fee("2025-12-01T00:00:00Z", 99_00)], 6, now);

    expect(points.every((p) => p.totalMinor === 0)).toBe(true);
  });
});
