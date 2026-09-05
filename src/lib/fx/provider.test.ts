import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchLatestRates } from "@/lib/fx/provider";

/**
 * Every branch here answers the same question: what does the product do
 * when the rates vendor is unhelpful? The answer is always `null`, and
 * the screen above renders nothing — a fee is already correct in the
 * mission's own currency, so no conversion is ever worth an error.
 */
const KEY = "OPEN_EXCHANGE_RATES_APP_ID";

const ok = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body });

describe("fetchLatestRates", () => {
  const original = process.env[KEY];

  beforeEach(() => {
    process.env[KEY] = "test-key";
  });

  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
    vi.unstubAllGlobals();
  });

  it("returns nothing at all without a key", async () => {
    delete process.env[KEY];
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await fetchLatestRates()).toBeNull();
    // And does not spend a request finding out.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reads the base and the rates", async () => {
    vi.stubGlobal("fetch", ok({ base: "USD", rates: { GBP: 0.79, NGN: 1580 } }));

    expect(await fetchLatestRates()).toEqual({
      base: "USD",
      rates: { GBP: 0.79, NGN: 1580 },
    });
  });

  it("uppercases the codes it is given", async () => {
    // The lookup in `getPairRate` is exact, so a vendor that ever
    // switched case would silently stop matching every currency.
    vi.stubGlobal("fetch", ok({ base: "usd", rates: { gbp: 0.79 } }));

    expect(await fetchLatestRates()).toEqual({ base: "USD", rates: { GBP: 0.79 } });
  });

  it("drops values that are not usable rates", async () => {
    // One null in the table would otherwise reach `crossRate` as a
    // divisor. Zero and negatives are dropped for the same reason.
    vi.stubGlobal(
      "fetch",
      ok({ base: "USD", rates: { GBP: 0.79, EUR: null, JPY: 0, CAD: -2, CHF: "x" } })
    );

    expect(await fetchLatestRates()).toEqual({ base: "USD", rates: { GBP: 0.79 } });
  });

  it("is null when the response carries no usable rate at all", async () => {
    vi.stubGlobal("fetch", ok({ base: "USD", rates: { EUR: null } }));

    expect(await fetchLatestRates()).toBeNull();
  });

  it("is null on a refused request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    expect(await fetchLatestRates()).toBeNull();
  });

  it("is null when the vendor answers with something else entirely", async () => {
    vi.stubGlobal("fetch", ok({ error: true, message: "quota exceeded" }));

    expect(await fetchLatestRates()).toBeNull();
  });

  it("swallows a network failure", async () => {
    // A timeout is the case that matters: this runs inside a cron, and
    // a throw here would fail a job whose whole purpose is optional.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    expect(await fetchLatestRates()).toBeNull();
  });
});
