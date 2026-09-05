import { describe, expect, it } from "vitest";

import {
  RATE_STALE_AFTER_HOURS,
  convertFee,
  crossRate,
  formatApproximate,
  minorUnitsPer,
} from "@/lib/domain/fx";

/**
 * The conversion is a courtesy shown beside a real fee, so every test
 * here is really the same test: when we are not sure, show nothing. A
 * missing rate, a stale rate or a currency we do not understand must
 * never produce a number, because a wrong number next to "Government
 * fee" is worse than the blank the screen already knows how to draw.
 */
const NOW = new Date("2026-09-05T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

describe("crossRate", () => {
  it("crosses two rates quoted against the same base", () => {
    // 1 USD = 0.79 GBP and 1 USD = 1,580 NGN, so 1 GBP = 2,000 NGN.
    expect(crossRate(0.79, 1580)).toBeCloseTo(2000, 0);
  });

  it("is null when either side is missing", () => {
    // Not 1. A missing rate treated as parity would print an £819 fee
    // as ₦819 — a plausible-looking number that is wrong by 2,000×.
    expect(crossRate(undefined, 1580)).toBeNull();
    expect(crossRate(0.79, undefined)).toBeNull();
    expect(crossRate(null, null)).toBeNull();
  });

  it("refuses zero, negative and non-finite rates", () => {
    expect(crossRate(0, 1580)).toBeNull();
    expect(crossRate(-1, 1580)).toBeNull();
    expect(crossRate(0.79, Number.POSITIVE_INFINITY)).toBeNull();
    expect(crossRate(Number.NaN, 1580)).toBeNull();
  });
});

describe("minorUnitsPer", () => {
  it("knows the currencies with no minor unit", () => {
    // A ¥30,000 fee stored as 30000 is thirty thousand yen, not three
    // hundred. Dividing it by 100 would quote a traveller 1% of the fee.
    expect(minorUnitsPer("JPY")).toBe(1);
    expect(minorUnitsPer("XOF")).toBe(1);
  });

  it("knows the three-decimal Gulf currencies", () => {
    expect(minorUnitsPer("KWD")).toBe(1000);
    expect(minorUnitsPer("BHD")).toBe(1000);
  });

  it("defaults to cents", () => {
    expect(minorUnitsPer("GBP")).toBe(100);
    expect(minorUnitsPer("ngn")).toBe(100);
  });
});

describe("convertFee", () => {
  const base = {
    minor: 81_900, // £819.00
    from: "GBP",
    to: "NGN",
    rate: 2000,
    fetchedAt: hoursAgo(2),
    now: NOW,
  };

  it("converts a fee into the traveller's own currency", () => {
    const result = convertFee(base);

    // £819 × 2,000 = ₦1,638,000, carried in kobo.
    expect(result).toMatchObject({ minor: 163_800_000, currency: "NGN" });
  });

  it("carries the rate's own timestamp, not the moment of conversion", () => {
    // The screen prints this date. Stamping it with "now" would claim a
    // freshness the figure does not have.
    expect(convertFee(base)?.fetchedAt).toEqual(base.fetchedAt);
  });

  it("shows nothing when the fee is unknown", () => {
    expect(convertFee({ ...base, minor: null })).toBeNull();
  });

  it("shows nothing when the currencies are the same", () => {
    // There is no approximation to make, and "≈ £819" beside "£819"
    // reads as though the exact figure were in doubt.
    expect(convertFee({ ...base, to: "GBP" })).toBeNull();
    expect(convertFee({ ...base, to: "gbp" })).toBeNull();
  });

  it("shows nothing without a rate", () => {
    expect(convertFee({ ...base, rate: null })).toBeNull();
    expect(convertFee({ ...base, fetchedAt: null })).toBeNull();
  });

  it("holds at the staleness boundary and drops past it", () => {
    expect(convertFee({ ...base, fetchedAt: hoursAgo(RATE_STALE_AFTER_HOURS) })).not.toBeNull();
    expect(
      convertFee({ ...base, fetchedAt: hoursAgo(RATE_STALE_AFTER_HOURS + 1) })
    ).toBeNull();
  });

  it("survives one missed refresh", () => {
    // The job runs daily. A single failure must not blank the figure off
    // every screen — that turns a provider hiccup into a visible
    // regression, which is why the window is two days and not one.
    expect(convertFee({ ...base, fetchedAt: hoursAgo(25) })).not.toBeNull();
  });

  it("refuses a rate fetched in the future", () => {
    // A clock problem, not a rate. Accepting it would freeze a figure on
    // screen indefinitely, since it can never age out.
    expect(convertFee({ ...base, fetchedAt: new Date(NOW.getTime() + 7_200_000) })).toBeNull();
  });

  it("handles a zero-decimal source currency", () => {
    // ¥30,000 at 0.0067 GBP is about £201. Getting `minorUnitsPer`
    // wrong here shows £2, which looks like a bargain and is a lie.
    const result = convertFee({
      ...base,
      minor: 30_000,
      from: "JPY",
      to: "GBP",
      rate: 0.0067,
    });

    expect(result?.minor).toBe(20_100);
  });
});

describe("formatApproximate", () => {
  it("marks the figure as approximate and rounds away false precision", () => {
    const text = formatApproximate({ minor: 163_844_700, currency: "NGN" }, "en-NG");

    expect(text.startsWith("≈")).toBe(true);
    // Three significant figures: ₦1,640,000, not ₦1,638,447. The fee is
    // not known to the naira and printing it that way claims it is.
    expect(text).toContain("1,640,000");
  });

  it("leaves small amounts alone", () => {
    // Under a thousand there is no false precision to round away, and
    // rounding £45 to £45.0 would only look odd.
    expect(formatApproximate({ minor: 4_500, currency: "GBP" }, "en-GB")).toContain("45");
  });
});
