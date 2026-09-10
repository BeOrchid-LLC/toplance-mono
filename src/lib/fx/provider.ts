import "server-only";

/**
 * The exchange-rate provider, behind one function.
 *
 * ExchangeRate-API's open endpoint. Everything vendor-specific is in
 * this file: the URL, the shape of the response and the credit the
 * licence obliges us to print. `@/lib/fx/rates` and every screen above
 * it know only "a base and a table of rates", so replacing the vendor is
 * this file and nothing else — the same stance `track()` takes on
 * analytics, and the reason this swap cost one file.
 *
 * **Why this one, over the Open Exchange Rates plan the 01/09 review
 * settled on.** That decision was revisited on 2026-09-10 for the
 * ordinary reason: staging had shown "We could not convert this into NGN
 * today" since launch, because the key was never bought and the daily
 * job had therefore never written a row. The free tier of that vendor
 * was not an option — its licence is personal and open-source use only,
 * and this is a commercial product. This endpoint permits commercial
 * conversion outright, needs no key at all, and quotes 161 currencies
 * including every one this product deals in.
 *
 * The currency coverage is the whole test, and it is why the obvious
 * free feeds do not qualify: anything sourced from the ECB (Frankfurter
 * and the rest) carries 31 currencies and no naira, cedi, shilling or
 * dirham — which is to say it can convert a fee for every traveller
 * except the ones this product was built for.
 *
 * **Quoted against one base.** One call returns "one base → every
 * currency", so the whole product's conversions are one request a day
 * and each pair is a cross of two rows. `crossRate` works from whatever
 * base is stored, so nothing above cares that it is USD.
 */

const ENDPOINT = "https://open.er-api.com/v6/latest/USD";

/**
 * Stored beside every rate, the way a corridor stores its source name.
 *
 * The credit a traveller actually sees is `FX_ATTRIBUTION`, which lives
 * in its own module rather than here — this file is `server-only`, and a
 * licence credit has to be renderable from anywhere.
 */
export const FX_SOURCE = "Exchange Rate API";

export type LatestRates = {
  base: string;
  /** Units of each currency per one unit of `base`. */
  rates: Record<string, number>;
};

/**
 * The current rates, or null.
 *
 * Null on a refused request, a timeout, a response that does not parse
 * or one the vendor itself marks failed — the same "degrade to silence"
 * stance `visalist.ts` and `travelbuddy.ts` take. A conversion is a
 * courtesy on top of a fee that is already correct in its own currency;
 * it is never worth an error page, and the caller renders nothing when
 * this returns null.
 */
export async function fetchLatestRates(): Promise<LatestRates | null> {
  try {
    const response = await fetch(ENDPOINT, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      // This is the job that refreshes the cache; caching the refresh
      // would be the cache refreshing itself from itself.
      cache: "no-store",
    });

    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return null;

    const { result, base_code: baseCode, rates } = body as {
      result?: unknown;
      base_code?: unknown;
      rates?: unknown;
    };

    // This vendor answers 200 with `result: "error"` for a rejected
    // request, so the status code alone does not say the call worked.
    if (result !== "success") return null;
    if (typeof baseCode !== "string" || !rates || typeof rates !== "object") {
      return null;
    }

    // Every value is checked rather than trusted: one `null` in the
    // table would otherwise reach `crossRate` as a divisor.
    const clean: Record<string, number> = {};
    for (const [code, value] of Object.entries(rates as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        clean[code.toUpperCase()] = value;
      }
    }

    if (!Object.keys(clean).length) return null;

    return { base: baseCode.toUpperCase(), rates: clean };
  } catch {
    return null;
  }
}
