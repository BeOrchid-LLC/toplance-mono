import { describe, expect, it, vi, afterEach } from "vitest";

import { fetchLatestRates } from "@/lib/fx/provider";

/**
 * Every branch here answers the same question: what does the product do
 * when the rates vendor is unhelpful? The answer is always `null`, and
 * the screen above renders nothing — a fee is already correct in the
 * mission's own currency, so no conversion is ever worth an error.
 */
const ok = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body });

const success = (rates: Record<string, unknown>, base = "USD") => ({
  result: "success",
  base_code: base,
  rates,
});

describe("fetchLatestRates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the base and the rates", async () => {
    vi.stubGlobal("fetch", ok(success({ GBP: 0.738041, NGN: 1325.98 })));

    expect(await fetchLatestRates()).toEqual({
      base: "USD",
      rates: { GBP: 0.738041, NGN: 1325.98 },
    });
  });

  it("needs no key, and asks for none", async () => {
    // The point of this vendor over the last one: there is nothing to
    // configure, so there is no environment where the refresh silently
    // does nothing because a secret was never set. That is the failure
    // this swap was made to end.
    const fetchSpy = ok(success({ NGN: 1325.98 }));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchLatestRates();

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe("https://open.er-api.com/v6/latest/USD");
    expect(url).not.toMatch(/app_id|api_?key|token/i);
  });

  it("uppercases the codes it is given", async () => {
    // The lookup in `getPairRate` is exact, so a vendor that ever
    // switched case would silently stop matching every currency.
    vi.stubGlobal("fetch", ok(success({ gbp: 0.79 }, "usd")));

    expect(await fetchLatestRates()).toEqual({ base: "USD", rates: { GBP: 0.79 } });
  });

  it("drops values that are not usable rates", async () => {
    // One null in the table would otherwise reach `crossRate` as a
    // divisor. Zero and negatives are dropped for the same reason.
    vi.stubGlobal(
      "fetch",
      ok(success({ GBP: 0.79, EUR: null, JPY: 0, CAD: -2, CHF: "x" }))
    );

    expect(await fetchLatestRates()).toEqual({ base: "USD", rates: { GBP: 0.79 } });
  });

  it("is null when the response carries no usable rate at all", async () => {
    vi.stubGlobal("fetch", ok(success({ EUR: null })));

    expect(await fetchLatestRates()).toBeNull();
  });

  /**
   * This vendor reports a rejected request as a 200 carrying
   * `result: "error"`, so the status code alone does not say the call
   * worked. Trusting it would write an empty table over a good one.
   */
  it("is null when the vendor marks its own answer failed", async () => {
    vi.stubGlobal(
      "fetch",
      ok({ result: "error", "error-type": "invalid-currency-code" })
    );

    expect(await fetchLatestRates()).toBeNull();
  });

  it("is null on a refused request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    expect(await fetchLatestRates()).toBeNull();
  });

  it("is null when the vendor answers with something else entirely", async () => {
    vi.stubGlobal("fetch", ok({ message: "nothing you asked for" }));

    expect(await fetchLatestRates()).toBeNull();
  });

  it("swallows a network failure", async () => {
    // A timeout is the case that matters: this runs inside a cron, and
    // a throw here would fail a job whose whole purpose is optional.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    expect(await fetchLatestRates()).toBeNull();
  });
});
