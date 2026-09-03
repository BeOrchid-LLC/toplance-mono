import { z } from "zod";

import { httpUrl } from "@/lib/visa/url";
import type {
  CorridorQuery,
  CorridorRuleSet,
  VisaDataProvider,
} from "@/lib/visa/types";

/**
 * VisaList's response shape, as the vendor actually sends it.
 *
 * Written against a recorded live call rather than the vendor's prose —
 * `visalist.sample.ts` holds that response verbatim, and the tests parse
 * this schema against it. That order matters here more than usual:
 * `travelbuddy.ts` records what happens when a schema is written from a
 * guess, and every field in it was optional, so the wrong guess *parsed*
 * a real payload rather than rejecting it and produced an object of
 * undefineds. A schema loose enough to accept anything cannot report
 * that it understood nothing.
 *
 * So the rule below is: **required where the live response always had
 * it, optional only where it genuinely varied.** The counts in each
 * comment are out of the 238 destinations the call returned for a
 * Nigerian passport.
 *
 * ## This provider cannot lead
 *
 * There is no document list in this schema because there is none in the
 * payload. The Phase 3 plan assumed VisaList sold tourism checklists and
 * gave it `canLead: true`; it sells entry *rules*, which puts it in
 * Travel Buddy's role — a contributor that fills figures on someone
 * else's rule set and may never open one. `toEntryRules` below therefore
 * always returns an empty `requirements` array, and any provider built
 * on it must declare `canLead: false`.
 */

/** The four categories the live response used, by their vendor ids. */
export const VISA_CATEGORY = {
  1: "Visa Free",
  2: "Visa on Arrival",
  3: "E-visa",
  4: "Visa Required",
} as const;

const visaCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string(),
  updatedAt: z.string(),
});

/**
 * The destination's country record. Most of this is travel-guide
 * furniture — population, lat/lng, language codes, an LGBT ranking —
 * and is dropped by not being named here. Only the fields this product
 * could legitimately show a traveller are modelled.
 *
 * Nearly all of them are *absent* rather than null when the vendor has
 * nothing, hence `.optional()` and not `.nullable()`.
 */
const destinationCountrySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  alpha2Code: z.string(),
  alpha3Code: z.string(),
  slug: z.string(),
  /** Missing on 1 of 238 (a territory with no capital). */
  capital: z.string().optional(),
  currencyCode: z.string(),
  currencyName: z.string(),
  region: z.string(),
  subregion: z.string(),
  /**
   * An arrival or health declaration form. Present on 126 of 238, with
   * a link on only 47 — and the link is usually a reseller's affiliate
   * page rather than the government's. This is the closest thing in the
   * whole payload to a document, and it is one form, not a checklist.
   */
  documentDeclarationName: z.string().optional(),
  documentDeclarationUrl: z.string().optional(),
  /** Vendor's spelling, not ours. Present on 15 of 238. */
  embassyRegistraionUrl: z.string().optional(),
  /** Present on 101 of 238; frequently a reseller. See `officialUrl`. */
  visaOnlineUrl: z.string().optional(),
  visaProcessingUrl: z.string().optional(),
});

/**
 * A note about who is exempt from the visa and on what terms. Always
 * present, though `details` is often empty.
 *
 * `visaCategory` and `exemptionVisaCountries` were null on all 238 rows;
 * they are modelled as nullable rather than dropped so that a future
 * payload filling them is a parse this schema still accepts.
 */
const exemptionVisaSchema = z.object({
  id: z.number().int(),
  countryId: z.number().int(),
  visaCategoryId: z.number().int(),
  visaCategory: z.unknown().nullish(),
  duration: z.string(),
  applicableCountries: z.string(),
  exemptCountries: z.string(),
  details: z.string(),
  referenceUrl: z.string(),
  available: z.number().int(),
  exemptionVisaCountries: z.unknown().nullish(),
});

/** One destination's entry rules for the passport the call was made for. */
export const visaRequirementSchema = z.object({
  id: z.number().int(),
  originCountryId: z.number().int(),
  destinationCountryId: z.number().int(),
  visaCategoryId: z.number().int(),
  visaCategory: visaCategorySchema,
  visaSubcategoryId: z.number().int(),
  /** How long the visa itself is valid, e.g. "180 days". Often "". */
  duration: z.string(),
  /** How long you may stay, e.g. "6 months". Often "". */
  stayDuration: z.string(),
  /** Free text, multiple notes joined by `::`. See the sample. */
  notes: z.string(),
  exemptionVisa: exemptionVisaSchema,
  destinationCountry: destinationCountrySchema,
  slug: z.string(),
  website: z.string(),
  visaProcessingUrl: z.string(),
  /** -1 unknown (120), 0 no (45), 1 yes (73). */
  visaProcessingAvailable: z.number().int(),
  /** 1 on only 6 of 238. */
  isETA: z.number().int(),
  visaName: z.string(),
  createdAt: z.string(),
  /** When the vendor last changed this row — the only freshness signal. */
  updatedAt: z.string(),
});

/**
 * The whole response. `nearbyCountries` and `originCountry` are returned
 * but nothing here reads them, so they are accepted loosely and dropped.
 *
 * `visaRequirements` is `.min(1)`: a passport the vendor does not cover
 * should fail this parse and be reported as "no answer", not arrive as
 * an empty success that looks like a corridor with no rules.
 */
export const visaListResponseSchema = z.object({
  visaRequirements: z.array(visaRequirementSchema).min(1),
});

export type VisaCategoryId = keyof typeof VISA_CATEGORY;
export type VisaRequirement = z.infer<typeof visaRequirementSchema>;
export type VisaListResponse = z.infer<typeof visaListResponseSchema>;

/**
 * Hosts that sell visa applications rather than issue them.
 *
 * VisaList fills a lot of its link fields with these. Presenting one to
 * a traveller under "Official eVisa portal" would be the same mistake
 * the repo already refused to make with VisaHQ — an affiliate code is a
 * referral, not a source. The link is dropped rather than relabelled,
 * because a rule set carries no place to say "this one is a shop".
 */
const RESELLER_HOSTS = [
  "ivisa.com",
  "visahq.com",
  "visalist.io",
  "evisa.express",
  "byevisa.com",
];

function isReseller(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return RESELLER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return true;
  }
}

/** An http(s) link that is not a reseller's, or null. */
function officialUrl(value: string | undefined): string | null {
  const url = httpUrl(value);
  if (!url) return null;
  return isReseller(url) ? null : url;
}

/** VisaList joins several notes with `::` and ends each with `:`. */
export function splitNotes(notes: string): string[] {
  return notes
    .split("::")
    .map((n) => n.trim().replace(/:$/, "").trim())
    .filter(Boolean);
}

/**
 * One destination's entry rules as a rule set, or null when the vendor
 * knows nothing worth repeating.
 *
 * Carries **no documents, no fee and no processing window** — none of
 * the three is in the payload, and a contributor that claims a figure it
 * has not got would fill a blank the merge is meant to leave for a
 * source that has. It is the same restraint `toEntryRules` shows in
 * `travelbuddy.ts`, for the same reason.
 *
 * Pure, so the mapping — the part that rots silently when a vendor
 * reshapes a field — is the part under unit test.
 */
export function toEntryRules(entry: VisaRequirement): CorridorRuleSet | null {
  const c = entry.destinationCountry;

  const embassyUrl = officialUrl(c.embassyRegistraionUrl);
  const evisaUrl =
    officialUrl(c.visaOnlineUrl) ??
    officialUrl(c.visaProcessingUrl) ??
    officialUrl(entry.visaProcessingUrl);

  // Both or neither: a traveller told to file a declaration with nowhere
  // to file it is worse served than one not told at all. The link is
  // dropped when it is a reseller's, which takes the name with it.
  const declarationUrl = officialUrl(c.documentDeclarationUrl);
  const declarationName = declarationUrl ? c.documentDeclarationName ?? null : null;

  const ruleSet: CorridorRuleSet = {
    corridorId: null,
    provider: "visalist",
    visaName: entry.visaCategory.name,
    version: 1,
    // The vendor's own date for this row, not the moment we asked. It is
    // the only freshness signal in the payload, and it is a real one —
    // reporting `now()` would claim the data is as fresh as the request.
    effectiveFrom: entry.updatedAt.slice(0, 10),
    lastVerifiedAt: entry.updatedAt,
    sourceName: "VisaList",
    sourceUrl: null,
    /**
     * Unconfirmed. The plan requires VisaList's caching and display
     * terms in writing before any of this ships, and until that arrives
     * a credit is the safer default than none — it costs a line on the
     * requirements sheet and removes one way to breach a licence nobody
     * has read.
     */
    attribution: "Visa data provided by VisaList (visalist.io).",
    contributions: [],
    // "6 months" beats "180 days" for a traveller reading it, so the
    // stay wins where both are present.
    allowedStay: entry.stayDuration || entry.duration || null,
    // Not in the payload at all. Travel Buddy is the only source that
    // carries it.
    passportValidity: null,
    embassyUrl,
    evisaUrl,
    registrationName: declarationName,
    registrationUrl: declarationName ? declarationUrl : null,
    // Not ours to state — see above.
    processingWeeksMin: null,
    processingWeeksMax: null,
    governmentFeeMinor: null,
    governmentFeeCurrency: null,
    // The whole point. VisaList has no checklist to give.
    requirements: [],
  };

  const carries =
    ruleSet.allowedStay ??
    ruleSet.embassyUrl ??
    ruleSet.evisaUrl ??
    ruleSet.registrationName;

  return carries ? ruleSet : null;
}

/**
 * The whole response reduced to the one destination asked about, by ISO
 * 3166-1 alpha-2 code.
 *
 * The endpoint is per *passport*, not per corridor — one call returns
 * all 238 destinations — which is why a warming job storing the whole
 * response beats a fetch per traveller on a tier limited to one request
 * an hour.
 */
export function findDestination(
  response: VisaListResponse,
  destinationIso: string
): VisaRequirement | null {
  const iso = destinationIso.toUpperCase();
  return (
    response.visaRequirements.find(
      (e) => e.destinationCountry.alpha2Code.toUpperCase() === iso
    ) ?? null
  );
}

/* ============================================================
 * The provider — fetching, caching, and standing down.
 * ============================================================ */

const HOST = "visa-list.p.rapidapi.com";

/**
 * The endpoint is keyed on the passport country's *slug*, not its ISO
 * code, so the codes this product speaks have to be translated.
 *
 * An explicit map rather than a slugified country name: "south-africa"
 * happens to be derivable, but a vendor that spells the United Arab
 * Emirates "United Arab Emirated" is not one to guess alongside. A
 * nationality absent from this map means the provider declines the
 * corridor — the same honest null it returns for a destination it does
 * not carry.
 *
 * Verified against the recorded response: every slug here is the
 * vendor's own `slug` field for that country.
 */
const PASSPORT_SLUG: Record<string, string> = {
  ng: "nigeria",
  gh: "ghana",
  ke: "kenya",
  za: "south-africa",
  cm: "cameroon",
};

/**
 * How long one passport's whole answer is kept.
 *
 * A week, matching Travel Buddy's. Visa policy moves on the scale of
 * months and the payload carries the vendor's own `updatedAt` per row,
 * so a traveller reading a week-old answer is reading the same answer
 * the vendor would give today.
 *
 * The unit of caching is the *passport*, not the corridor, and that is
 * the whole economics of this provider: one call returns all 238
 * destinations, so a week of every traveller on a Nigerian passport
 * costs a single request against a tier that allows one an hour.
 */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How long a failure is remembered. An hour, for the reason
 * `travelbuddy.ts` records at length: an error path with no cache turns
 * one broken corridor into unbounded spend, because nothing was written
 * and the next render asks again.
 */
const FAILURE_TTL_MS = 60 * 60 * 1000;

/** Nothing silences a provider for longer than a quota month. */
const MAX_FAILURE_TTL_MS = 31 * 24 * 60 * 60 * 1000;

type CacheEntry = { at: number; ttl: number; value: VisaListResponse | null };

const cache = new Map<string, CacheEntry>();

/**
 * Set after the API rejects our key. A 401 cannot heal until the key
 * changes and the key cannot change without a restart, so the module
 * stands down for the process lifetime rather than logging once per
 * page view.
 */
let keyRejected = false;

/** Read from the vendor rather than guessed — see `standDownFor`. */
function standDownFor(response: Response): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  const quotaReset = Number(response.headers.get("x-ratelimit-requests-reset"));
  const seconds = [retryAfter, quotaReset].find(
    (n) => Number.isFinite(n) && n > 0
  );
  if (seconds === undefined) return FAILURE_TTL_MS;
  return Math.min(seconds * 1000, MAX_FAILURE_TTL_MS);
}

/**
 * The recorded response, served in place of a live call.
 *
 * Why this exists: without a key the provider is silent, and a silent
 * provider makes every screen it feeds look broken rather than
 * unconfigured — which is exactly how it looked the first time anyone
 * opened the gap screen after this shipped. The sample is a verbatim
 * recording of a real call, so what a developer sees locally is the
 * vendor's own data, not a fixture somebody wrote to look plausible.
 *
 * Three guards, because serving recorded data unannounced is the sort of
 * convenience that ends up in production:
 *
 * 1. **Never in a production build.** Hard-coded, not configurable —
 *    the same stance `staffTwoFactorSkipped` takes, and for the same
 *    reason: a variable that leaks into a deployed environment must not
 *    be able to do this.
 * 2. **Opt in.** `VISALIST_RECORDED=1`. Falling back silently would let
 *    someone believe the vendor is wired up when it is not.
 * 3. **Only the passport actually recorded.** The capture was a Nigerian
 *    passport, so every other nationality still returns null and still
 *    reaches the gap screen. It cannot invent coverage it never saw.
 *
 * Imported dynamically so the 35 KB of recorded JSON is not pulled into
 * a server bundle that will never use it.
 */
async function recordedResponse(slug: string): Promise<VisaListResponse | null> {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.VISALIST_RECORDED !== "1") return null;
  if (slug !== "nigeria") return null;

  const { VISALIST_NIGERIA_SAMPLE } = await import("@/lib/visa/visalist.sample");
  const parsed = visaListResponseSchema.safeParse(VISALIST_NIGERIA_SAMPLE);
  if (!parsed.success) return null;

  console.warn(
    "[visa] visalist is serving the RECORDED sample " +
      `(${parsed.data.visaRequirements.length} destinations, captured 2026-09-02). ` +
      "Set VISALIST_API_KEY for live data, or unset VISALIST_RECORDED."
  );
  return parsed.data;
}

/**
 * One passport's full destination list, from cache or from the vendor.
 *
 * Exported because the warming job calls it directly: warming *is* this
 * function, run ahead of demand rather than during a traveller's page
 * view. `force` skips a live cache entry so a warm run refreshes rather
 * than confirming what it already holds; it never skips a stand-down,
 * because burning through a 429 is what the stand-down exists to stop.
 */
export async function fetchPassport(
  nationalityIso: string,
  { force = false }: { force?: boolean } = {}
): Promise<VisaListResponse | null> {
  const slug = PASSPORT_SLUG[nationalityIso.toLowerCase()];
  if (!slug) return null;

  const cached = cache.get(slug);
  const live = cached && Date.now() - cached.at < cached.ttl;
  // A cached *failure* is honoured even under `force`: it is the
  // stand-down, not a stale answer.
  if (live && (!force || cached.value === null)) return cached.value;

  const apiKey = process.env.VISALIST_API_KEY;

  if (!apiKey || keyRejected) {
    const recorded = await recordedResponse(slug);
    if (recorded) {
      // Cached like any other answer, so the rest of the module — and
      // the warming job — behaves identically whichever source it came
      // from.
      cache.set(slug, { at: Date.now(), ttl: TTL_MS, value: recorded });
      return recorded;
    }
    return null;
  }

  try {
    const response = await fetch(
      `https://${HOST}/api/public/visa_requirements/country/${slug}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": HOST,
        },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (response.status === 401 || response.status === 403) {
      keyRejected = true;
      console.error(
        "[visa] visalist rejected the API key — check VISALIST_API_KEY " +
          "in .env.local (no quotes, no placeholder) and that the RapidAPI " +
          "account is subscribed to the Visa List API"
      );
      return null;
    }

    if (!response.ok) {
      const ttl = response.status === 429 ? standDownFor(response) : FAILURE_TTL_MS;
      cache.set(slug, { at: Date.now(), ttl, value: null });
      console.error(`[visa] visalist answered ${response.status} for ${slug}`);
      return null;
    }

    const parsed = visaListResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      // A shape we do not understand is a failure, not an empty answer —
      // cached as one so a reshaped payload cannot be re-fetched on
      // every render. See the envelope comment in `travelbuddy.ts` for
      // why a schema loose enough to accept anything is worse than this.
      cache.set(slug, { at: Date.now(), ttl: FAILURE_TTL_MS, value: null });
      console.error(`[visa] visalist returned an unreadable payload for ${slug}`);
      return null;
    }

    cache.set(slug, { at: Date.now(), ttl: TTL_MS, value: parsed.data });
    return parsed.data;
  } catch (error) {
    cache.set(slug, { at: Date.now(), ttl: FAILURE_TTL_MS, value: null });
    console.error(`[visa] visalist call failed for ${slug}`, error);
    return null;
  }
}

/** Test seam: forget everything, including any stand-down. */
export function resetVisaListCache(): void {
  cache.clear();
  keyRejected = false;
}

/**
 * Entry rules for 238 destinations per passport — and **not one
 * document**.
 *
 * `canLead: false`, which is the correction this provider exists to
 * record. The Phase 3 plan specified `canLead: true` on the belief that
 * VisaList sells tourism document checklists; the recorded response in
 * `@/lib/visa/visalist.sample` shows it sells none. A provider that
 * leads with no documents makes `adoptRuleSet` materialise a checklist
 * with zero rows — no upload slots, no completion score, no route to
 * submission — which is precisely what `canLead` exists to prevent.
 *
 * So it is a contributor, like Travel Buddy: it fills `allowedStay`, the
 * eVisa portal, the embassy link and an arrival registration on a rule
 * set that curated data opened. What it adds over Travel Buddy is reach
 * and thrift — every destination in one call, cached per passport for a
 * week, against a free tier that meters a call an hour rather than 120 a
 * month.
 */
export const visaListProvider: VisaDataProvider = {
  name: "visalist",
  canLead: false,

  /**
   * What it can actually supply, as a contract rather than a boast.
   *
   * No `passportValidity`: the payload has no field for it, which is why
   * Travel Buddy stays in the list behind this one — it is the only
   * source that carries it. No fee and no decision time either; both are
   * curated's to hold.
   *
   * The eVisa portal and the arrival registration are missing from
   * `GapField` on purpose, not by oversight — `hasGaps` does not count
   * them, because plenty of routes have neither and treating them as
   * gaps would send every complete corridor shopping for a figure that
   * does not exist. This provider fills them anyway when it has them;
   * it just never justifies a request on their account.
   */
  fills: ["allowedStay", "embassyUrl"],

  async fetch(query: CorridorQuery): Promise<CorridorRuleSet | null> {
    const response = await fetchPassport(query.nationalityIso);
    if (!response) return null;

    const entry = findDestination(response, query.destinationIso);
    return entry ? toEntryRules(entry) : null;
  },
};

/**
 * Which passport is most overdue for a warm, or null when every one of
 * them holds a live answer.
 *
 * Never returns a passport standing down after a failure: a stand-down
 * is a decision to stop asking, and a warming job that overrode it would
 * be the fastest way to spend a quota on a vendor that is already
 * refusing.
 */
export function nextPassportToWarm(nationalities: string[]): string | null {
  const candidates = nationalities
    .map((iso) => ({ iso, slug: PASSPORT_SLUG[iso.toLowerCase()] }))
    .filter((c): c is { iso: string; slug: string } => Boolean(c.slug))
    .map(({ iso, slug }) => ({ iso, entry: cache.get(slug) }))
    .filter(({ entry }) => {
      if (!entry) return true; // never warmed
      const fresh = Date.now() - entry.at < entry.ttl;
      // A live failure is a stand-down; a live answer needs nothing.
      return !fresh;
    });

  if (candidates.length === 0) return null;

  // Never-warmed first, then the oldest — the same ordering the
  // companion digest uses, and for the same reason: a capped run should
  // reach whoever is most overdue.
  candidates.sort((a, b) => (a.entry?.at ?? 0) - (b.entry?.at ?? 0));
  return candidates[0].iso;
}
