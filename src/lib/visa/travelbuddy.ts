import "server-only";

import { z } from "zod";

import type {
  CorridorQuery,
  CorridorRuleSet,
  VisaDataProvider,
} from "@/lib/visa/types";

/**
 * Travel Buddy, read twice from one response.
 *
 * `fetchCountryContext` takes the *destination facts* — currency,
 * capital, timezone, dialling code, embassy link — for the Phase 5
 * arrival plan. `travelBuddyProvider` takes the *entry rules* — allowed
 * stay, passport validity, embassy and eVisa links, arrival
 * registration — for the requirements screen.
 *
 * Two shapes because the two screens may say different things. The
 * itinerary is forbidden from stating an entry requirement, so
 * `passport_validity` is dropped on that path; the requirements screen
 * exists to state exactly that, so it is kept on this one. One cached
 * call serves both, which matters on a 120-request month.
 *
 * The provider declares `canLead: false`. Travel Buddy returns no
 * document list, so a rule set from it carries no checklist — and a
 * checklist with no rows means no upload slots, no completion score and
 * no 100%-complete trigger. It fills figures on someone else's rule
 * set; it is never the rule set.
 */

const HOST = "visa-requirement.p.rapidapi.com";
const ENDPOINT = `https://${HOST}/v2/visa/check`;

/**
 * The facts the itinerary prompt is allowed to state outright. Every one
 * is nullable: a field the vendor omits must read as "we were not told",
 * never as a default the model then presents as sourced.
 *
 * `passport_validity` is deliberately absent though the vendor returns
 * it. It is an entry requirement, and the itinerary prompt's standing
 * rule is that it never states one — those belong to the requirements
 * screen, from curated data someone checked against the mission. A field
 * this module cannot expose is a field no future caller can leak.
 */
export type CountryContext = {
  currencyCode: string | null;
  currencyName: string | null;
  exchangeRate: string | null;
  timezone: string | null;
  phoneCode: string | null;
  capital: string | null;
  embassyUrl: string | null;
};

/**
 * Only the metadata fields the prompt grounds a sentence on. Unknown
 * fields drop, which is how the entry rules in the same payload never
 * reach this module's output.
 */
const metadataSchema = z.object({
  currency_code: z.string().nullish(),
  currency: z.string().nullish(),
  exchange: z.string().nullish(),
  timezone: z.string().nullish(),
  phone_code: z.string().nullish(),
  capital: z.string().nullish(),
  embassy_url: z.string().nullish(),
});

/**
 * The rule half of the same payload. Everything nullish: a route with no
 * eVisa portal and no arrival registration is ordinary, not malformed.
 */
const ruleSchema = z.object({
  destination: metadataSchema
    .extend({ passport_validity: z.string().nullish() })
    .nullish(),
  visa_rules: z
    .object({
      primary_rule: z
        .object({ name: z.string().nullish(), duration: z.string().nullish() })
        .nullish(),
      secondary_rule: z
        .object({ name: z.string().nullish(), link: z.string().nullish() })
        .nullish(),
    })
    .nullish(),
  mandatory_registration: z
    .object({ name: z.string().nullish(), link: z.string().nullish() })
    .nullish(),
});

/**
 * The vendor documents these field names but not the envelope they sit
 * in, and this was written without a verified live response. Both
 * readings are therefore accepted — nested under `destination`, or flat
 * at the top level — so whichever shape production sends is understood.
 */
const envelopeSchema = z.union([
  z.object({ destination: metadataSchema }).transform((v) => v.destination),
  metadataSchema,
]);

/**
 * The payload's metadata block as a country context, or null when there
 * is nothing worth grounding a sentence on.
 *
 * Pure, so the mapping — the part that silently rots when a vendor
 * reshapes a field — is the part under unit test.
 */
export function toCountryContext(payload: unknown): CountryContext | null {
  const parsed = envelopeSchema.safeParse(payload);
  if (!parsed.success) return null;
  const m = parsed.data;

  const context: CountryContext = {
    currencyCode: m.currency_code ?? null,
    currencyName: m.currency ?? null,
    exchangeRate: m.exchange ?? null,
    timezone: m.timezone ?? null,
    phoneCode: m.phone_code ?? null,
    capital: m.capital ?? null,
    embassyUrl: m.embassy_url ?? null,
  };

  // All-null would still flip the prompt into its "verified facts"
  // branch — claiming a source for nothing. Null keeps the itinerary on
  // its ungrounded wording, which is the honest state.
  const grounded = Object.values(context).some((v) => v !== null);
  return grounded ? context : null;
}

/**
 * The same payload as a rule set carrying only entry rules — no
 * documents, no fee, no decision time.
 *
 * It claims neither a fee nor a processing window even though a vendor
 * might guess at both: the curated table is the real source for those,
 * and a contributor that claims a figure it has not checked would fill
 * a blank the merge is meant to leave for someone who has.
 *
 * Null when there is no entry rule worth adding — otherwise a payload
 * carrying none of the six figures would put "Travel Buddy" on the
 * requirements sheet beside an empty list of what it supplied.
 */
export function toEntryRules(payload: unknown): CorridorRuleSet | null {
  const parsed = ruleSchema.safeParse(payload);
  if (!parsed.success) return null;
  const { destination, visa_rules: rules, mandatory_registration } = parsed.data;

  const registrationName = mandatory_registration?.name ?? null;
  const registrationUrl = mandatory_registration?.link ?? null;

  const ruleSet: CorridorRuleSet = {
    corridorId: null,
    provider: "travelbuddy",
    visaName: rules?.primary_rule?.name ?? "Entry rules",
    version: 1,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    sourceName: "Travel Buddy",
    sourceUrl: destination?.embassy_url ?? null,
    attribution: null,
    contributions: [],
    allowedStay: rules?.primary_rule?.duration ?? null,
    passportValidity: destination?.passport_validity ?? null,
    embassyUrl: destination?.embassy_url ?? null,
    evisaUrl: rules?.secondary_rule?.link ?? null,
    // Both or neither — a traveller told to register with nowhere to do
    // it is worse served than one not told at all.
    registrationName: registrationUrl ? registrationName : null,
    registrationUrl: registrationName ? registrationUrl : null,
    // Not ours to state. See above.
    processingWeeksMin: null,
    processingWeeksMax: null,
    governmentFeeMinor: null,
    governmentFeeCurrency: null,
    requirements: [],
  };

  const carries =
    ruleSet.allowedStay ??
    ruleSet.passportValidity ??
    ruleSet.embassyUrl ??
    ruleSet.evisaUrl ??
    ruleSet.registrationName;

  return carries ? ruleSet : null;
}

/**
 * Seven days, not one.
 *
 * This cache used to serve only the itinerary, which runs once per
 * approval — a rare call, where a short TTL cost nothing. It now also
 * serves the requirements screen, which is a page view: with four live
 * corridors a daily TTL would spend roughly the entire 120-request
 * month on refreshing figures that change on the order of years. Entry
 * rules and country facts are stable enough that a week-old answer is
 * still an answer; the exchange rate is the one volatile field, and the
 * itinerary prompt presents it as indicative rather than as a quote.
 *
 * Module state, so each server instance warms its own; a restart is the
 * refresh lever.
 */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

/**
 * Set after the API rejects our key. A 401 cannot heal until the key
 * changes, and the key cannot change without a restart — so the module
 * stands down for the process lifetime rather than logging once per
 * approval.
 */
let keyRejected = false;

/**
 * The raw payload for one corridor, cached, or null when we have none.
 *
 * Never throws. This is called from the approve action's `after()` and
 * from the requirements screen: a vendor outage must cost a traveller
 * nothing more than the ungrounded wording — or the missing rows — they
 * would have had anyway.
 *
 * `purpose` is part of the query type but unused: Travel Buddy has no
 * purpose parameter, which is the ❌ on its own row of the matrix.
 * Taking the whole `CorridorQuery` keeps one query shape across every
 * call site, and keeps the cache keyed on what actually varies.
 */
async function fetchPayload(query: CorridorQuery): Promise<unknown> {
  const apiKey = process.env.TRAVEL_BUDDY_API_KEY;
  if (!apiKey || keyRejected) return null;

  const passport = query.nationalityIso.toUpperCase();
  const destination = query.destinationIso.toUpperCase();
  const key = `${passport}:${destination}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The RapidAPI consumer contract, verified against the live
        // endpoint: an unauthenticated POST answers 401 with RapidAPI's
        // own "Invalid API key" body, so it is the gateway checking
        // this header. The vendor's docs show `X-RapidAPI-Proxy-Secret`
        // instead, but that is the proxy→origin hop, not the one we
        // make.
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": HOST,
      },
      body: JSON.stringify({ passport, destination }),
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 401 || response.status === 403) {
      keyRejected = true;
      console.error(
        "[visa] travel buddy rejected the API key — check " +
          "TRAVEL_BUDDY_API_KEY in .env.local (no quotes, no placeholder) " +
          "and that the RapidAPI subscription is active. Standing down " +
          "until restart."
      );
      return null;
    }

    // A pair the vendor does not cover is a normal no, and cached like
    // one. Anything else unexpected is an outage: logged, not cached,
    // so it heals on the next view rather than in a week.
    if (response.status === 404) {
      cache.set(key, { at: Date.now(), value: null });
      return null;
    }
    if (!response.ok) {
      console.error(
        `[visa] travel buddy answered ${response.status} for ${key}`
      );
      return null;
    }

    const payload = await response.json();
    cache.set(key, { at: Date.now(), value: payload });
    return payload;
  } catch (error) {
    console.error(
      `[visa] travel buddy could not be reached for ${key}`,
      error
    );
    return null;
  }
}

/**
 * Destination facts for the arrival plan. Entry rules are deliberately
 * not among them — see the note at the top of this module.
 */
export async function fetchCountryContext(
  query: CorridorQuery
): Promise<CountryContext | null> {
  return toCountryContext(await fetchPayload(query));
}

/**
 * Entry rules for the requirements screen, as a contributor.
 *
 * `canLead: false` is the load-bearing part: this provider has no
 * documents, so it may fill figures on a rule set someone else opened
 * and may never open one itself.
 */
export const travelBuddyProvider: VisaDataProvider = {
  name: "travelbuddy",
  canLead: false,

  async fetch(query: CorridorQuery): Promise<CorridorRuleSet | null> {
    return toEntryRules(await fetchPayload(query));
  },
};
