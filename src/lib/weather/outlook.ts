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
 * traveller in this product will ever stand in. A curated city is right
 * or absent; a derived centroid is confidently wrong, which is the one
 * outcome this codebase consistently refuses.
 *
 * Not always the capital. Where a country's seat of government is not
 * where a traveller lands, this follows the traveller: Dubai over Abu
 * Dhabi, Toronto over Ottawa, Casablanca over Rabat, Johannesburg over
 * Pretoria, Dar es Salaam over Dodoma, Sydney over Canberra.
 *
 * For the countries too large for any one city to speak for — the United
 * States above all, but also Australia, Canada, China and India — the
 * entry is the busiest arrival city rather than a claim about the whole
 * country. That is defensible only because the panel says which city it
 * read: someone in Houston is told "in New York" and can see at once
 * that it is not them. If that ever stops being on screen, these entries
 * stop being honest.
 *
 * Every destination with a live corridor needs a row — `outlook.test.ts`
 * fails if one is missing, so a newly approved destination cannot lose
 * its panel quietly. A destination without a live corridor simply shows
 * none.
 */
const CAPITAL_BY_DESTINATION: Record<string, Capital> = {
  // Already curated, unchanged — these four also have curated arrival
  // checklists in `@/lib/domain/companion`.
  gb: { city: "London", latitude: 51.5072, longitude: -0.1276 },
  ae: { city: "Dubai", latitude: 25.2048, longitude: 55.2708 },
  ca: { city: "Toronto", latitude: 43.6532, longitude: -79.3832 },
  de: { city: "Berlin", latitude: 52.52, longitude: 13.405 },

  // Europe.
  at: { city: "Vienna", latitude: 48.2082, longitude: 16.3738 },
  be: { city: "Brussels", latitude: 50.8476, longitude: 4.3572 },
  cz: { city: "Prague", latitude: 50.0755, longitude: 14.4378 },
  dk: { city: "Copenhagen", latitude: 55.6761, longitude: 12.5683 },
  gr: { city: "Athens", latitude: 37.9838, longitude: 23.7275 },
  ie: { city: "Dublin", latitude: 53.3498, longitude: -6.2603 },
  it: { city: "Rome", latitude: 41.9028, longitude: 12.4964 },
  mt: { city: "Valletta", latitude: 35.8989, longitude: 14.5146 },
  no: { city: "Oslo", latitude: 59.9139, longitude: 10.7522 },
  pl: { city: "Warsaw", latitude: 52.2297, longitude: 21.0122 },
  se: { city: "Stockholm", latitude: 59.3293, longitude: 18.0686 },

  // Africa.
  ke: { city: "Nairobi", latitude: -1.2864, longitude: 36.8172 },
  ma: { city: "Casablanca", latitude: 33.5731, longitude: -7.5898 },
  tz: { city: "Dar es Salaam", latitude: -6.7924, longitude: 39.2083 },
  ug: { city: "Kampala", latitude: 0.3476, longitude: 32.5825 },
  za: { city: "Johannesburg", latitude: -26.2041, longitude: 28.0473 },

  // Gulf.
  qa: { city: "Doha", latitude: 25.2854, longitude: 51.531 },

  // Asia-Pacific.
  au: { city: "Sydney", latitude: -33.8688, longitude: 151.2093 },
  cn: { city: "Beijing", latitude: 39.9042, longitude: 116.4074 },
  in: { city: "New Delhi", latitude: 28.6139, longitude: 77.209 },
  jp: { city: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  my: { city: "Kuala Lumpur", latitude: 3.139, longitude: 101.6869 },
  sg: { city: "Singapore", latitude: 1.3521, longitude: 103.8198 },

  // Americas.
  mx: { city: "Mexico City", latitude: 19.4326, longitude: -99.1332 },
  us: { city: "New York", latitude: 40.7128, longitude: -74.006 },
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
  /** How many days the range actually covers — see `toOutlook`. */
  days: number;
  /** The unit the source reported in, e.g. "°C". */
  unit: string;
};

function isReading(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function series(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** The finite numbers in a mixed array — Open-Meteo sends null for a day it has no value for. */
function numbers(value: unknown): number[] {
  return series(value).filter(isReading);
}

/**
 * How many days the range actually describes: those the source gave a
 * reading of any kind for.
 *
 * Counted per day rather than taken from `daily.time`, which is the list
 * of days *asked* about and stays at seven however many of them came back
 * empty. A high on Monday and a low on Tuesday is two days of data even
 * though neither day is a complete pair, so the two arrays are walked
 * together instead of having their filtered lengths compared.
 */
function daysCovered(maxima: unknown, minima: unknown): number {
  const highs = series(maxima);
  const lows = series(minima);
  const span = Math.max(highs.length, lows.length);

  let days = 0;
  for (let i = 0; i < span; i += 1) {
    if (isReading(highs[i]) || isReading(lows[i])) days += 1;
  }

  return days;
}

/**
 * Reduce a forecast response to the week's range.
 *
 * Nulls are dropped rather than coerced: `Math.min` over an array
 * containing `null` returns 0, which would print a 0°C low in the middle
 * of a warm week and read as a fact rather than a gap.
 *
 * `days` counts the days that actually carry a reading, not the length of
 * `daily.time` — see `daysCovered`. Those differ exactly when the source
 * sent nulls, and taking the longer one labels the answer with a window
 * it does not describe: two usable days of temperatures rendered as "over
 * the next 7 days" is the same class of claim the null-dropping above
 * exists to avoid — a gap presented as a fact.
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

  const days = daysCovered(daily.temperature_2m_max, daily.temperature_2m_min);

  return {
    highC: Math.round(Math.max(...highs)),
    lowC: Math.round(Math.min(...lows)),
    days,
    unit,
  };
}
