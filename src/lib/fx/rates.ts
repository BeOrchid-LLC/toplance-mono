import "server-only";

import { inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { fxRates } from "@/lib/db/schema";
import { crossRate } from "@/lib/domain/fx";
import { FX_SOURCE, fetchLatestRates } from "@/lib/fx/provider";

/**
 * The cached side of the exchange rates: one row per currency, all
 * quoted against the provider's base, refreshed by the daily cron in
 * `app/api/cron/fx-rates`.
 *
 * A table rather than module state, for the reason `visa-warm` writes
 * down and defers: every instance must show the same figure, and the row
 * has to carry *when* it was fetched, because a rate with no date is the
 * same untraceable claim as a checklist with no date. It also means a
 * traveller's page view never spends a metered request.
 */

/** Refresh every rate the provider quotes. Returns how many rows moved. */
export async function refreshFxRates(): Promise<{
  updated: number;
  base: string;
} | null> {
  const latest = await fetchLatestRates();
  if (!latest) return null;

  const fetchedAt = new Date();
  const rows = Object.entries(latest.rates).map(([quote, rate]) => ({
    base: latest.base,
    quote,
    // Fixed notation rather than `toString`, which switches to an
    // exponent for the very small rates (a unit of one currency can be
    // a millionth of another) and would store `1e-7` as text.
    rate: rate.toFixed(10),
    source: FX_SOURCE,
    fetchedAt,
  }));

  // One statement rather than a loop: ~170 currencies, and a partial
  // refresh would leave the table quoting two different mornings.
  await db
    .insert(fxRates)
    .values(rows)
    .onConflictDoUpdate({
      target: [fxRates.base, fxRates.quote],
      // `excluded` rather than a literal, because the rate differs per
      // row and this is one statement for the whole table.
      set: {
        rate: sql`excluded.rate`,
        fetchedAt: sql`excluded.fetched_at`,
        source: sql`excluded.source`,
      },
    });

  return { updated: rows.length, base: latest.base };
}

export type PairRate = { rate: number; fetchedAt: Date } | null;

/**
 * Units of `to` per one unit of `from`, with the age of the figure.
 *
 * Both sides are read in one query and crossed through the stored base,
 * so `GBP → NGN` costs one round trip and no second provider call. Null
 * when either currency is missing from the table — which is the state on
 * a fresh database, before the cron has ever run, and the reason every
 * caller treats null as "show nothing" rather than as an error.
 */
export async function getPairRate(
  from: string | null | undefined,
  to: string | null | undefined
): Promise<PairRate> {
  if (!from || !to) return null;

  const a = from.toUpperCase();
  const b = to.toUpperCase();
  if (a === b) return null;

  const rows = await db
    .select({
      quote: fxRates.quote,
      rate: fxRates.rate,
      fetchedAt: fxRates.fetchedAt,
    })
    .from(fxRates)
    .where(inArray(fxRates.quote, [a, b]));

  const perBase = new Map(rows.map((r) => [r.quote, Number(r.rate)]));
  const rate = crossRate(perBase.get(a), perBase.get(b));
  if (rate == null) return null;

  // The older of the two, so the age reported is the age of the weakest
  // half of the cross rather than the freshest.
  const fetchedAt = rows
    .map((r) => r.fetchedAt)
    .sort((x, y) => x.getTime() - y.getTime())[0];

  return { rate, fetchedAt };
}
