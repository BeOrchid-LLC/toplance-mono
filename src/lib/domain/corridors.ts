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

/**
 * The destinations a traveller may choose, and the code each maps to.
 *
 * PROVISIONAL at 50 entries. The launch requirement is a minimum of 50
 * destination countries, and this is that list — chosen so the product
 * can be *asked* about all fifty, not a claim that it can answer for
 * them. It is expected to be revised once the client confirms which
 * destinations actually matter.
 *
 * Every code below is the `alpha2Code` VisaList returned for that
 * country in the response recorded at `@/lib/visa/visalist.sample`, so
 * none of them is a guess; the trailing comment on each line is the
 * visa category that response gave for a Nigerian passport. The keys are
 * the display names *this repo* uses, which is why Türkiye keeps its
 * spelling and the United Arab Emirates is not called "United Arab
 * Emirated" as the vendor has it.
 *
 * **Widening this list does not claim coverage.** Nothing here is a
 * gate: `resolveRuleSet` is still called with whatever three answers the
 * intake captured, and a corridor no provider can answer still reaches
 * `corridorGap`. What changes is that a traveller can now *express* a
 * destination we do not serve — so `toplance.corridor_requested` counts
 * it, and the roadmap gets demand instead of silence. Curated coverage
 * is still `LIVE_CORRIDORS` below, and the shop window is still
 * `CORRIDORS_LIVE` / `CORRIDORS_SOON`; neither was widened here, because
 * a marketing board is a promise and this is a menu.
 */
export const DESTINATION_ISO: Record<string, string> = {
  // Already mapped — unchanged, these keys are what the intake agent already emits.
  "United Kingdom": "gb",             // Visa Required
  Canada: "ca",                       // Visa Required
  "United Arab Emirates": "ae",       // E-visa
  Germany: "de",                      // Visa Required
  "United States": "us",              // Visa Required
  Türkiye: "tr",                      // Visa Required
  Ireland: "ie",                      // Visa Required
  Netherlands: "nl",                  // Visa Required

  // Named on the marketing board as coming soon.
  Australia: "au",                    // E-visa
  "Saudi Arabia": "sa",               // Visa Required
  France: "fr",                       // Visa Required
  Portugal: "pt",                     // Visa Required

  // Africa — where Nigerian passports actually travel most.
  Ghana: "gh",                        // Visa Free
  Kenya: "ke",                        // Visa Free
  "South Africa": "za",               // E-visa
  Egypt: "eg",                        // Visa Required
  Morocco: "ma",                      // Visa Required
  Rwanda: "rw",                       // Visa on Arrival
  Ethiopia: "et",                     // E-visa
  Tanzania: "tz",                     // E-visa
  Senegal: "sn",                      // Visa Free
  "Ivory Coast": "ci",                // Visa Free
  Benin: "bj",                        // Visa Free
  Togo: "tg",                         // Visa Free
  Cameroon: "cm",                     // Visa Free
  Uganda: "ug",                       // E-visa

  // Europe — study and work destinations beyond the four already mapped.
  Italy: "it",                        // Visa Required
  Spain: "es",                        // Visa Required
  Belgium: "be",                      // Visa Required
  Sweden: "se",                       // Visa Required
  Norway: "no",                       // Visa Required
  Denmark: "dk",                      // Visa Required
  Switzerland: "ch",                  // Visa Required
  Austria: "at",                      // Visa Required
  Poland: "pl",                       // Visa Required
  Czechia: "cz",                      // Visa Required
  Greece: "gr",                       // Visa Required
  Malta: "mt",                        // Visa Required

  // Gulf and Middle East — work and medical.
  Qatar: "qa",                        // E-visa
  Kuwait: "kw",                       // Visa on Arrival
  Bahrain: "bh",                      // E-visa
  Oman: "om",                         // Visa Required
  Jordan: "jo",                       // E-visa

  // Asia-Pacific.
  China: "cn",                        // Visa Required
  India: "in",                        // Visa Required
  Japan: "jp",                        // Visa Required
  Singapore: "sg",                    // E-visa
  Malaysia: "my",                     // E-visa

  // Americas.
  Brazil: "br",                       // Visa Required
  Mexico: "mx",                       // Visa Required
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
 *
 * **This list is not a gate.** Nothing consults it before resolving a
 * corridor: `/app/requirements` calls `resolveRuleSet` for whatever
 * three answers the intake captured, and reaches `corridorGap` only
 * once resolution has actually returned null. So a corridor no row of
 * ours covers is served the moment a provider can answer it — no edit
 * here, no seed, no deploy. What this list describes is the *curated*
 * set, which is what the marketing board and the dead-end copy speak
 * for.
 *
 * The consequence worth knowing before a provider key is bought: those
 * two surfaces read this list, so they describe curated coverage rather
 * than real coverage. With a key live they would under-state it — the
 * board saying "Soon" for a corridor the product will happily serve.
 * That is a copy problem, not a gate, and it cannot be fixed from here:
 * which corridors a metered vendor answers is only knowable by asking.
 *
 * Not to be confused with `CORRIDORS_LIVE` below, which despite the name
 * is a list of *destinations* for the picker, ranked ahead of
 * `CORRIDORS_SOON` — the board labels each row live or soon per corridor
 * by calling `isCorridorLive`, so being in that list claims nothing.
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
