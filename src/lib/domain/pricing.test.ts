import { describe, expect, it } from "vitest";

import {
  DEFAULT_RATE_CARD,
  cycleFor,
  quote,
  type RateCard,
} from "@/lib/domain/pricing";

/**
 * The worked examples from Peace's pricing document, verbatim. She wrote
 * them as "build billing tests against these", so they are transcribed
 * rather than paraphrased — if the model changes, these numbers are the
 * conversation to have, not the thing to quietly re-baseline.
 */
const EXAMPLES: { applications: number; totalDollars: number }[] = [
  { applications: 150, totalDollars: 3_000 },
  { applications: 200, totalDollars: 3_900 },
  { applications: 350, totalDollars: 6_150 },
  { applications: 500, totalDollars: 8_400 },
  { applications: 1_000, totalDollars: 14_400 },
  { applications: 2_000, totalDollars: 26_400 },
];

describe("quote", () => {
  it.each(EXAMPLES)(
    "$applications applications cost $$totalDollars",
    ({ applications, totalDollars }) => {
      expect(quote(applications).totalMinor).toBe(totalDollars * 100);
    }
  );

  it("charges the base fee with no applications at all", () => {
    // A business that completes nothing still pays for the account.
    const q = quote(0);
    expect(q.totalMinor).toBe(300_00);
    expect(q.layers).toEqual([]);
  });

  /**
   * The check Peace singles out: "200 applications = $3,900; 201 =
   * $3,915. The bill always rises with volume, never falls."
   *
   * This is the failure the layered model exists to prevent — a flat
   * rate per band would bill 201 applications at $15 each, which is
   * $3,315, and processing more work would make the bill smaller.
   */
  it("never falls as volume rises", () => {
    expect(quote(200).totalMinor).toBe(3_900_00);
    expect(quote(201).totalMinor).toBe(3_915_00);

    let previous = -1;
    for (let n = 0; n <= 1_200; n += 7) {
      const total = quote(n).totalMinor;
      expect(total).toBeGreaterThan(previous);
      previous = total;
    }
  });

  it("splits the bill into the layers a business is actually charged", () => {
    // 350 = 200 at $18, then 150 at $15. The breakdown is shown to the
    // buyer, so it is part of the contract, not an implementation detail.
    const q = quote(350);

    expect(q.layers).toEqual([
      { count: 200, rateMinor: 18_00, subtotalMinor: 3_600_00 },
      { count: 150, rateMinor: 15_00, subtotalMinor: 2_250_00 },
    ]);
    expect(q.baseFeeMinor).toBe(300_00);
    expect(q.totalMinor).toBe(
      q.baseFeeMinor + q.layers.reduce((sum, l) => sum + l.subtotalMinor, 0)
    );
  });

  it("reads its rates from the card, not from itself", () => {
    // Peace: "keep all rates and thresholds as configurable settings,
    // not hard-coded numbers". A quote taken against a different card
    // must come out different, or the rates are not really configurable.
    const cheaper: RateCard = {
      baseFeeMinor: 100_00,
      currency: "USD",
      bands: [
        { upTo: 10, rateMinor: 5_00 },
        { upTo: null, rateMinor: 1_00 },
      ],
    };

    expect(quote(12, cheaper).totalMinor).toBe(100_00 + 10 * 5_00 + 2 * 1_00);
  });

  it("refuses a negative or fractional count rather than inventing a bill", () => {
    expect(() => quote(-1)).toThrow();
    expect(() => quote(1.5)).toThrow();
  });

  it("ships the rates Peace specified", () => {
    expect(DEFAULT_RATE_CARD.baseFeeMinor).toBe(300_00);
    expect(DEFAULT_RATE_CARD.bands).toEqual([
      { upTo: 200, rateMinor: 18_00 },
      { upTo: 500, rateMinor: 15_00 },
      { upTo: null, rateMinor: 12_00 },
    ]);
  });
});

describe("cycleFor", () => {
  const at = (iso: string) => new Date(iso);

  it("runs from the signup day to the day before the next one", () => {
    // Peace's own example: "signed up on the 14th → cycles run the 14th
    // to the 13th".
    const cycle = cycleFor(at("2026-01-14T09:30:00Z"), at("2026-03-20T00:00:00Z"));

    expect(cycle.start.toISOString()).toBe("2026-03-14T00:00:00.000Z");
    // `end` is exclusive — the instant the next cycle opens — so a
    // "billed in this cycle" query is a half-open range and no event can
    // land in two cycles or in neither.
    expect(cycle.end.toISOString()).toBe("2026-04-14T00:00:00.000Z");
  });

  it("puts the signup moment itself in the first cycle", () => {
    const signup = at("2026-01-14T09:30:00Z");
    const cycle = cycleFor(signup, signup);

    expect(cycle.start.toISOString()).toBe("2026-01-14T00:00:00.000Z");
    expect(cycle.end.toISOString()).toBe("2026-02-14T00:00:00.000Z");
  });

  it("clamps to the last day of a month too short for the anchor", () => {
    // Signed up on the 31st. Mid-February is still inside the cycle that
    // opened on 31 January — the clamp lands on that cycle's END, which
    // February cannot express as a 31st.
    const january = cycleFor(at("2026-01-31T12:00:00Z"), at("2026-02-15T00:00:00Z"));
    expect(january.start.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(january.end.toISOString()).toBe("2026-02-28T00:00:00.000Z");

    // And the following cycle opens where that one closed, so the 29th
    // to the 31st of a long month never belong to no cycle at all.
    const february = cycleFor(at("2026-01-31T12:00:00Z"), at("2026-03-01T00:00:00Z"));
    expect(february.start.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("returns to the anchor day after a short month", () => {
    // The clamp is per-month, not sticky: March has a 31st, so March's
    // cycle starts on it again rather than staying on the 28th.
    const cycle = cycleFor(at("2026-01-31T12:00:00Z"), at("2026-03-31T06:00:00Z"));

    expect(cycle.start.toISOString()).toBe("2026-03-31T00:00:00.000Z");
  });

  it("leaves no gap between one cycle and the next", () => {
    // Every instant belongs to exactly one cycle. Walked over a year
    // from a 31st anchor, which is where clamping could open a hole.
    const anchor = at("2026-01-31T12:00:00Z");
    let cursor = cycleFor(anchor, anchor);

    for (let i = 0; i < 14; i++) {
      const next = cycleFor(anchor, cursor.end);
      expect(next.start.getTime()).toBe(cursor.end.getTime());
      cursor = next;
    }
  });
});
