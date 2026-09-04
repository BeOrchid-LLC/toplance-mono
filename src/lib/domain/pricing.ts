/**
 * What a business is charged, as pure functions.
 *
 * The model is Peace's pricing document: a monthly base fee per business,
 * plus a per-application fee charged in layers the way income tax bands
 * are. Nothing here does I/O — the marketing page's estimator, the
 * employer console's running total and any future invoicing all read the
 * same arithmetic, and a client component can import it without pulling
 * `db` and `server-only` into the browser bundle. Same arrangement
 * `@/lib/domain/status` has with the status machine.
 *
 * Money is in **minor units** — cents — everywhere in this file. A rate
 * of $18 is `1800`. Floats never touch a bill.
 */

/**
 * One layer of the per-application fee.
 *
 * `upTo` is the running application count at which this band stops, not
 * the band's size: the bands `200, 500, null` describe the 1st–200th,
 * the 201st–500th and everything after. `null` is the open-ended top
 * band, and exactly one band must have it.
 */
export type RateBand = {
  upTo: number | null;
  rateMinor: number;
};

export type RateCard = {
  baseFeeMinor: number;
  currency: string;
  bands: readonly RateBand[];
};

/**
 * The rates as specified, and the fallback when no card has been
 * configured.
 *
 * Peace is explicit that these are provisional and must be settings
 * rather than constants, which is why `quote` takes a card rather than
 * reading this. This is the seed value and the default, not the source
 * of truth: `@/lib/data/billing` reads the active card from the
 * database, and that is what every surface should pass in.
 */
export const DEFAULT_RATE_CARD: RateCard = {
  baseFeeMinor: 300_00,
  currency: "USD",
  bands: [
    { upTo: 200, rateMinor: 18_00 },
    { upTo: 500, rateMinor: 15_00 },
    { upTo: null, rateMinor: 12_00 },
  ],
};

/** One band as it actually applied to a given volume. */
export type QuoteLayer = {
  count: number;
  rateMinor: number;
  subtotalMinor: number;
};

export type Quote = {
  applications: number;
  baseFeeMinor: number;
  /** Only the bands the volume actually reached, in order. */
  layers: QuoteLayer[];
  applicationsMinor: number;
  totalMinor: number;
  currency: string;
};

/**
 * What this many completed applications cost in one cycle.
 *
 * **Layered, not flat.** A business pays the first band's rate on its
 * first 200 applications, the second band's on the next 300, and the top
 * band's on the rest — never one rate applied to the whole volume. That
 * is the whole point of the design: a flat rate per band would mean the
 * 201st application *reduced* the bill from $3,900 to $3,315, so doing
 * more work would cost the business less. `pricing.test.ts` pins the
 * boundary and walks the curve to prove it only ever rises.
 */
export function quote(applications: number, card: RateCard = DEFAULT_RATE_CARD): Quote {
  if (!Number.isInteger(applications) || applications < 0) {
    throw new Error(
      `Application count must be a whole number of applications, got ${applications}.`
    );
  }

  const layers: QuoteLayer[] = [];
  let counted = 0;

  for (const band of card.bands) {
    if (counted >= applications) break;

    // `upTo` is cumulative, so the room in this band is what it adds on
    // top of every band before it.
    const room = band.upTo === null ? Infinity : band.upTo - counted;
    const count = Math.min(room, applications - counted);
    if (count <= 0) continue;

    layers.push({
      count,
      rateMinor: band.rateMinor,
      subtotalMinor: count * band.rateMinor,
    });
    counted += count;
  }

  const applicationsMinor = layers.reduce((sum, l) => sum + l.subtotalMinor, 0);

  return {
    applications,
    baseFeeMinor: card.baseFeeMinor,
    layers,
    applicationsMinor,
    totalMinor: card.baseFeeMinor + applicationsMinor,
    currency: card.currency,
  };
}

/** A half-open billing period: `start` inclusive, `end` exclusive. */
export type BillingCycle = { start: Date; end: Date };

/** The last day of the month `year`/`month` (0-indexed month), in UTC. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * The cycle containing `now`, for a business that signed up on `anchor`.
 *
 * Billing runs on the signup anniversary — signed up on the 14th and the
 * cycles run the 14th to the 13th — so the anchor's day-of-month is the
 * only thing about it that matters.
 *
 * A day-of-month later than a short month has is **clamped to that
 * month's last day** rather than rolling into the next one. An anchor of
 * the 31st therefore starts February's cycle on the 28th. Rolling
 * forward instead would leave the 29th to the 31st of January belonging
 * to no cycle at all, and a completed application landing there would be
 * billed in neither. The clamp is per month, not sticky: March starts on
 * the 31st again.
 *
 * `end` is exclusive — the instant the next cycle opens — so "completed
 * in this cycle" is a half-open range and no event can fall into two
 * cycles or into none.
 */
export function cycleFor(anchor: Date, now: Date): BillingCycle {
  const anchorDay = anchor.getUTCDate();

  const startOf = (year: number, month: number): Date => {
    const day = Math.min(anchorDay, daysInMonth(year, month));
    return new Date(Date.UTC(year, month, day));
  };

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  // This month's occurrence may still be ahead of `now`, in which case
  // the cycle we are in opened last month.
  let start = startOf(year, month);
  if (now.getTime() < start.getTime()) start = startOf(year, month - 1);

  const end = startOf(start.getUTCFullYear(), start.getUTCMonth() + 1);

  return { start, end };
}

/** `3_900_00` → `"$3,900.00"`. Display only; never feed this back into arithmetic. */
export function formatMoney(minor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    minor / 100
  );
}
