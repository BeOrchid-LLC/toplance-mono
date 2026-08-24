import type { TravelPurpose } from "@/lib/visa/types";

export type CorridorChip = { name: string; flag: string };

/**
 * The intake agent speaks in labels; the corridor table is keyed on
 * codes. These live here rather than beside either caller because the
 * checklist builder and the requirements screen both translate, and two
 * copies would drift — a traveller would see a corridor resolve on one
 * screen and not the other.
 *
 * `PURPOSE_ISO` is typed to the enum, so an unmapped purpose is a
 * compile error rather than a cast that fails at the database.
 */
export const PURPOSE_ISO: Record<string, TravelPurpose> = {
  Work: "work",
  Study: "study",
  Tourism: "tourism",
  Medical: "medical",
  Relocation: "relocation",
};

export const DESTINATION_ISO: Record<string, string> = {
  "United Kingdom": "gb",
  Canada: "ca",
  "United Arab Emirates": "ae",
  Germany: "de",
  "United States": "us",
  Türkiye: "tr",
  Ireland: "ie",
  Netherlands: "nl",
};

export const NATIONALITY_ISO: Record<string, string> = {
  Nigeria: "ng",
  Ghana: "gh",
  Kenya: "ke",
  "South Africa": "za",
  Cameroon: "cm",
};

/**
 * The marketing surface's corridor lists. The requirements engine's
 * truth lives in the `corridors` table — this is the shop window, and
 * it is a promise applicants will hold the client to.
 */
export const CORRIDORS_LIVE: CorridorChip[] = [
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Türkiye", flag: "🇹🇷" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Netherlands", flag: "🇳🇱" },
];

export const CORRIDORS_SOON: CorridorChip[] = [
  { name: "Australia", flag: "🇦🇺" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "France", flag: "🇫🇷" },
  { name: "Portugal", flag: "🇵🇹" },
];

export const ORIGINS: CorridorChip[] = [
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Kenya", flag: "🇰🇪" },
  { name: "Cameroon", flag: "🇨🇲" },
  { name: "South Africa", flag: "🇿🇦" },
];

/**
 * ISO 3166-1 alpha-3, which is what a passport prints — the two-letter
 * codes above are for the requirements engine, these are for anything a
 * traveller reads. `NGA` on their own data page is `NGA` here.
 *
 * Every corridor and origin name in this file has an entry; `iso3()`
 * falls back to the first three letters rather than throwing, because a
 * marketing surface should not blank out over a missing code.
 */
const ISO3: Record<string, string> = {
  Nigeria: "NGA",
  Ghana: "GHA",
  Kenya: "KEN",
  Cameroon: "CMR",
  "South Africa": "ZAF",
  "United Kingdom": "GBR",
  Canada: "CAN",
  "United Arab Emirates": "ARE",
  Germany: "DEU",
  "United States": "USA",
  Türkiye: "TUR",
  Ireland: "IRL",
  Netherlands: "NLD",
  Australia: "AUS",
  "Saudi Arabia": "SAU",
  France: "FRA",
  Portugal: "PRT",
};

export function iso3(name: string): string {
  return ISO3[name] ?? name.slice(0, 3).toUpperCase();
}

/** The purposes the intake agent can resolve, in the order it offers them. */
export const PURPOSES = ["Work", "Study", "Relocation", "Medical", "Tourism"] as const;

export type Purpose = (typeof PURPOSES)[number];
