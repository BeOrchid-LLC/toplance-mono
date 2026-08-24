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

/**
 * The corridors the requirements engine can actually build a checklist
 * for: one nationality, one destination, one purpose — the same three
 * columns `corridors` is keyed on, and the same triple `resolveRuleSet`
 * matches.
 *
 * "Live" used to be a property of a *destination*, tested with
 * `CORRIDORS_SOON.some(...)`, which answers a different question to the
 * one the engine asks. That gap is what let the board show Canada as
 * live, the agent take eleven answers, and the requirements screen then
 * say we do not cover Canada — both were reading a list, only one of
 * them was reading the right one.
 *
 * `corridors.test.ts` asserts this against `seed.sql` itself, so the
 * declaration cannot drift from the rows it claims to describe: adding a
 * corridor in one place and not the other fails the suite rather than
 * shipping a promise nobody can keep.
 */
export const LIVE_CORRIDORS: ReadonlyArray<{
  nationalityIso: string;
  destinationIso: string;
  purpose: TravelPurpose;
}> = [
  { nationalityIso: "ng", destinationIso: "gb", purpose: "work" },
  { nationalityIso: "ng", destinationIso: "ae", purpose: "work" },
  { nationalityIso: "ng", destinationIso: "ca", purpose: "study" },
  { nationalityIso: "ng", destinationIso: "de", purpose: "work" },
];

/**
 * The three questions every surface actually wants to ask, in display
 * names, because that is what a traveller picked and what the copy
 * prints. An unrecognised name is simply not live — never a throw, and
 * never a guess.
 */
export function isCorridorLive(
  nationality: string,
  destination: string,
  purpose: string
): boolean {
  const from = NATIONALITY_ISO[nationality];
  const to = DESTINATION_ISO[destination];
  const iso = PURPOSE_ISO[purpose];
  if (!from || !to || !iso) return false;

  return LIVE_CORRIDORS.some(
    (c) =>
      c.nationalityIso === from &&
      c.destinationIso === to &&
      c.purpose === iso
  );
}

/**
 * What this passport can travel to this destination *for*. Ordered by
 * `PURPOSES`, so the recovery copy reads back in the order the intake
 * agent offered them.
 */
export function livePurposesFor(
  nationality: string,
  destination: string
): Purpose[] {
  return PURPOSES.filter((purpose) =>
    isCorridorLive(nationality, destination, purpose)
  );
}

/**
 * Where this passport can go at all. Empty is the honest answer for
 * every nationality we have not curated yet — and the reason "Change my
 * destination" was the wrong thing to offer them.
 */
export function liveDestinationsFor(nationality: string): string[] {
  return Object.keys(DESTINATION_ISO).filter((destination) =>
    livePurposesFor(nationality, destination).length > 0
  );
}

/**
 * The passports at least one live corridor starts from. Derived rather
 * than written down, so the sentence that tells a traveller whose
 * passport we do serve cannot go stale the day a corridor is added.
 */
export function liveNationalities(): string[] {
  return Object.keys(NATIONALITY_ISO).filter((nationality) =>
    liveDestinationsFor(nationality).length > 0
  );
}

/**
 * A passport's machine-readable zone is 44 characters wide. So is ours.
 *
 * The format lives here rather than beside the band that draws it,
 * because there are now two callers building a corridor from two
 * different shapes: the landing page has country *names* a visitor
 * picked from a select, and the product screens have the two-letter ISO
 * codes stored on an application's corridor row. One format, two ways in.
 */
export const MRZ_WIDTH = 44;

export const MRZ_FILLER = "<".repeat(MRZ_WIDTH);

/**
 * The payload alone, unpadded. It used to come back padded to 44, which
 * meant the fillers travelled inside the same string as the code and
 * were painted in the same brand colour — 26 characters of nothing, in
 * the loudest ink on the page. Padding is the band's business now, so
 * the two can be coloured apart.
 */
function mrzFrom(originIso3: string, destinationIso3: string, purpose: string) {
  const body = `TPL<${originIso3}<<${destinationIso3}<<${purpose.toUpperCase()}`;
  return body.slice(0, MRZ_WIDTH);
}

/** The marketing path: three names off the corridor bar's selects. */
export function mrz(origin: string, destination: string, purpose: string) {
  return mrzFrom(iso3(origin), iso3(destination), purpose);
}

/**
 * The two-letter codes the `corridors` table stores, resolved back to
 * the name a person reads and the three-letter code a passport prints.
 * Built from the maps above so there is no fourth list to keep in step —
 * adding a corridor in one place adds it here.
 */
const BY_ISO2: Record<string, { name: string; iso3: string }> = {};
for (const [name, code] of Object.entries({
  ...NATIONALITY_ISO,
  ...DESTINATION_ISO,
})) {
  const three = ISO3[name];
  if (three) BY_ISO2[code] = { name, iso3: three };
}

export function countryFromIso2(code: string | null | undefined) {
  return code ? (BY_ISO2[code.toLowerCase()] ?? null) : null;
}

/**
 * The product path: an application's corridor row, or null when either
 * end of it is a code this file cannot resolve.
 *
 * Null rather than a best guess on purpose. `iso3()` above falls back to
 * the first three letters of a name because a marketing surface should
 * not blank out over a missing code — but that fallback would turn an
 * unknown `xx` into `XX` and print a destination on a traveller's own
 * data page that nobody chose. A missing mark is honest; an invented one
 * is not, and the guideline puts that ahead of the visual.
 */
export function corridorMrz(
  nationalityIso: string | null | undefined,
  destinationIso: string | null | undefined,
  purpose: string | null | undefined
): string | null {
  const from = countryFromIso2(nationalityIso);
  const to = countryFromIso2(destinationIso);
  if (!from || !to || !purpose) return null;
  return mrzFrom(from.iso3, to.iso3, purpose);
}
