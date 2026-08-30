import "server-only";

import { z } from "zod";

import type { CorridorQuery } from "@/lib/visa/types";

/**
 * Travel Buddy as a source of *destination facts* — currency, capital,
 * timezone, dialling code, embassy link — for the Phase 5 arrival plan.
 *
 * Deliberately NOT a `VisaDataProvider`. Travel Buddy never returns a
 * required-documents list, so a rule set built from it would carry an
 * empty `requirements` array, and `adoptRuleSet` would materialise that
 * as an application with no upload slots, no completion score and no
 * 100%-complete trigger. The rule-set path stays curated-first and never
 * learns this module exists; the only consumer is `@/lib/ai/itinerary`.
 *
 * The same response carries entry rules. This module reads none of them.
 * That is what keeps the curated table the source of record, and it also
 * keeps us clear of the vendor's storage terms: nothing rule-shaped is
 * read, cached or persisted — only country metadata, and only for the
 * lifetime of one process.
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
 * The free tier is 120 requests a month — tighter than DoINeedVisa's
 * 300. Country facts change on the order of years (the exchange rate
 * aside, which the prompt presents as indicative, never as a quote), so
 * a day-old answer is still an answer. Module state, so each server
 * instance warms its own; a restart is the refresh lever.
 */
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: CountryContext | null }>();

/**
 * Set after the API rejects our key. A 401 cannot heal until the key
 * changes, and the key cannot change without a restart — so the module
 * stands down for the process lifetime rather than logging once per
 * approval.
 */
let keyRejected = false;

/**
 * Destination facts for one corridor, or null when we have none.
 *
 * Never throws. This runs inside the approve action's `after()`, where
 * the itinerary is generated for a traveller who has just been approved:
 * a vendor outage must cost them nothing more than the ungrounded
 * wording they would have got anyway.
 *
 * `purpose` is part of the query type but unused — destination facts do
 * not vary by why someone is travelling. Taking the whole
 * `CorridorQuery` anyway keeps one query shape across every call site.
 */
export async function fetchCountryContext(
  query: CorridorQuery
): Promise<CountryContext | null> {
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
        // endpoint: an unauthenticated POST here answers 401 with
        // RapidAPI's own "Invalid API key" body, so it is the gateway
        // checking this header. The vendor's docs show
        // `X-RapidAPI-Proxy-Secret` instead, but that is the
        // proxy→origin hop, not the one we make.
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
    // so it heals on the next approval rather than in 24 hours.
    if (response.status === 404) {
      cache.set(key, { at: Date.now(), value: null });
      return null;
    }
    if (!response.ok) {
      console.error(
        `[visa] travel buddy answered ${response.status} for ${key} — ` +
          "the arrival plan will be written without destination facts"
      );
      return null;
    }

    const context = toCountryContext(await response.json());
    cache.set(key, { at: Date.now(), value: context });
    return context;
  } catch (error) {
    console.error(
      `[visa] travel buddy could not be reached for ${key} — the arrival ` +
        "plan will be written without destination facts",
      error
    );
    return null;
  }
}
