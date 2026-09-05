import "server-only";

/**
 * The exchange-rate provider, behind one function.
 *
 * Open Exchange Rates, on a paid plan — the client asked for a
 * commercial feed rather than a free endpoint, and this is the shape
 * that decision takes in code. Everything vendor-specific is in this
 * file: the URL, the shape of the response and the name of the key.
 * `@/lib/fx/rates` and every screen above it know only "a base and a
 * table of rates", so replacing the vendor is this file and the row in
 * `.env.local.example`, not a change at each call site — the same stance
 * `track()` takes on analytics.
 *
 * **Quoted against one base.** Every plan returns "one base → every
 * currency" in a single call, so the whole product's conversions are one
 * request a day and each pair is a cross of two rows. `USD` is the base
 * because it is the one every plan allows; nothing above cares, since
 * `crossRate` works from whatever base is stored.
 */

const ENDPOINT = "https://openexchangerates.org/api/latest.json";

/** Named on screen beside the figure, the way a corridor names its source. */
export const FX_SOURCE = "Open Exchange Rates";

export type LatestRates = {
  base: string;
  /** Units of each currency per one unit of `base`. */
  rates: Record<string, number>;
};

/**
 * The current rates, or null.
 *
 * Null on a missing key, a refused request, a timeout or a response that
 * does not parse — the same "degrade to silence" stance `visalist.ts`
 * and `travelbuddy.ts` take. A conversion is a courtesy on top of a fee
 * that is already correct in its own currency; it is never worth an
 * error page, and the caller renders nothing when this returns null.
 */
export async function fetchLatestRates(): Promise<LatestRates | null> {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId) return null;

  try {
    const response = await fetch(`${ENDPOINT}?app_id=${appId}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      // This is the job that refreshes the cache; caching the refresh
      // would be the cache refreshing itself from itself.
      cache: "no-store",
    });

    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return null;

    const { base, rates } = body as { base?: unknown; rates?: unknown };
    if (typeof base !== "string" || !rates || typeof rates !== "object") {
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

    return { base: base.toUpperCase(), rates: clean };
  } catch {
    return null;
  }
}
