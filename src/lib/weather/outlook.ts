/**
 * The week's weather where a traveller has just landed.
 *
 * Context, not an alert. Someone living in a city has a weather app and
 * does not need us to tell them a storm is coming; what a newcomer does
 * not have is a feel for what a normal week there looks like — whether
 * they need a coat before their first pay cheque.
 *
 * Pure mapping and curated data only. The fetching lives in
 * `./fetch-outlook`.
 */

export type Capital = {
  city: string;
  latitude: number;
  longitude: number;
};

/**
 * Where to read the weather for each destination we cover.
 *
 * Curated rather than looked up, and deliberately so. Open-Meteo's
 * geocoder resolves a country name to its geographic centroid: Canada's
 * lands at 60°N in the Northwest Territories, roughly two thousand
 * kilometres from Toronto, and the forecast there describes weather no
 * traveller in this product will ever stand in. A curated capital is
 * right or absent; a derived centroid is confidently wrong, which is the
 * one outcome this codebase consistently refuses.
 *
 * Coverage matches `CHECKLIST_BY_DESTINATION` in `@/lib/domain/companion`
 * — the same four destinations that have curated arrival content.
 * Extending it is adding a row, and a destination without one simply
 * shows no weather panel.
 */
const CAPITAL_BY_DESTINATION: Record<string, Capital> = {
  gb: { city: "London", latitude: 51.5072, longitude: -0.1276 },
  ae: { city: "Dubai", latitude: 25.2048, longitude: 55.2708 },
  ca: { city: "Toronto", latitude: 43.6532, longitude: -79.3832 },
  de: { city: "Berlin", latitude: 52.52, longitude: 13.405 },
};

/**
 * The city this product reads the weather for, or null when there is none.
 *
 * `ae` and `ca` point at Dubai and Toronto rather than Abu Dhabi and
 * Ottawa: this is where the traveller most likely is, not where the
 * government sits.
 */
export function capitalFor(destinationIso: string): Capital | null {
  return CAPITAL_BY_DESTINATION[destinationIso.toLowerCase()] ?? null;
}

export type Outlook = {
  /** Warmest daily high across the window, rounded. */
  highC: number;
  /** Coolest daily low across the window, rounded. */
  lowC: number;
  /** How many days the range covers. */
  days: number;
  /** The unit the source reported in, e.g. "°C". */
  unit: string;
};

/** The finite numbers in a mixed array — Open-Meteo sends null for a day it has no value for. */
function numbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

/**
 * Reduce a forecast response to the week's range.
 *
 * Nulls are dropped rather than coerced: `Math.min` over an array
 * containing `null` returns 0, which would print a 0°C low in the middle
 * of a warm week and read as a fact rather than a gap.
 *
 * Returns null for anything that is not recognisably this response, so a
 * maintenance page can never render as a forecast of zero degrees.
 */
export function toOutlook(payload: unknown): Outlook | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const daily = root.daily as Record<string, unknown> | undefined;
  if (!daily || typeof daily !== "object") return null;

  const highs = numbers(daily.temperature_2m_max);
  const lows = numbers(daily.temperature_2m_min);
  if (highs.length === 0 || lows.length === 0) return null;

  const units = root.daily_units as Record<string, unknown> | undefined;
  const unit =
    typeof units?.temperature_2m_max === "string" ? units.temperature_2m_max : "°C";

  const days = Array.isArray(daily.time) ? daily.time.length : highs.length;

  return {
    highC: Math.round(Math.max(...highs)),
    lowC: Math.round(Math.min(...lows)),
    days,
    unit,
  };
}
