import "server-only";

import { z } from "zod";

import type {
  CorridorQuery,
  CorridorRuleSet,
  VisaDataProvider,
} from "@/lib/visa/types";

/**
 * DoINeedVisa (doineedvisa.to) as a second rule-set source, behind the
 * curated table. It widens coverage; it never overrides a corridor a
 * human has checked, because the resolver consults it only when the
 * curated provider has no answer.
 *
 * Two honesty gates, both deliberate:
 *
 * 1. **Tourism only, unless the plan says otherwise.** The free tier has
 *    no `purpose` parameter — its answers are short-stay defaults, and
 *    serving those to a work or study corridor is exactly the confident
 *    wrong answer the requirements screen exists to avoid (a tourist
 *    checklist for an EU Blue Card). `DINV_PURPOSE_TIER=1` lifts the
 *    gate once the account is on a tier whose `purpose` parameter is
 *    real, and the query then carries it.
 *
 * 2. **No documents, no rule set.** The API's `required_documents` is a
 *    curated subset and often null. A checklist is the one thing this
 *    provider exists to produce; a corridor where the API knows only
 *    "visa required" has nothing a traveller can act on, so it stays a
 *    gap (and keeps being counted as demand) rather than becoming an
 *    empty checklist.
 *
 * The vendor's terms say the data is not for eligibility determinations,
 * and nothing here determines eligibility — the rule set renders under
 * the same sourced heading as curated data, with DoINeedVisa named as
 * the source, and every application still passes through human review.
 */

/**
 * The API host, not the marketing site: `doineedvisa.to/api/*` is the
 * Next.js catch-all and answers every path with the SPA's HTML and a
 * 200 — which would have read as a healthy response full of unparseable
 * data. Verified against `/health` on this host before wiring.
 */
const BASE = "https://api.doineedvisa.to";

/**
 * Requirement types that involve an application a checklist can serve.
 * `visa_free`, `eta` and `citizen` need no document collection — for
 * those this provider has nothing to add and answers null.
 */
const CHECKLIST_REQUIREMENTS = new Set([
  "visa_required",
  "e_visa",
  "visa_on_arrival",
]);

const VISA_NAMES: Record<string, string> = {
  visa_required: "Visa (apply before travel)",
  e_visa: "eVisa",
  visa_on_arrival: "Visa on arrival",
};

/**
 * Only what the mapper reads, and everything nullable the way the API
 * ships it. `passthrough` is not needed — unknown fields simply drop.
 */
const pairSchema = z.object({
  requirement: z.string(),
  fee: z
    .object({
      amount: z.number(),
      currency: z.string(),
      last_verified_at: z.string().nullish(),
    })
    .nullish(),
  required_documents: z
    .object({
      items: z.array(z.string()),
      note: z.string().nullish(),
      source_url: z.string().nullish(),
      last_verified_at: z.string().nullish(),
    })
    .nullish(),
  processing_time: z
    .object({
      min_days: z.number().nullish(),
      max_days: z.number().nullish(),
    })
    .nullish(),
  visa_info_link: z.string().nullish(),
  last_verified_at: z.string().nullish(),
});

export type DinvPair = z.infer<typeof pairSchema>;

/** `"Bank statements — 3 months"` → `"bank_statements_3_months"`. */
function docKeyFrom(name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  // Two items that slug identically would collide on the checklist's
  // (application, docKey) key; the index keeps them distinct rows.
  return slug ? `${slug}_${index + 1}` : `document_${index + 1}`;
}

/**
 * The API's pair payload as a rule set, or null where there is nothing
 * a checklist can be built from. Pure, so the mapping — the part that
 * can silently rot when the vendor reshapes a field — is the part under
 * unit test.
 */
export function toRuleSet(payload: unknown): CorridorRuleSet | null {
  const parsed = pairSchema.safeParse(payload);
  if (!parsed.success) return null;
  const pair = parsed.data;

  if (!CHECKLIST_REQUIREMENTS.has(pair.requirement)) return null;

  const items = pair.required_documents?.items ?? [];
  if (items.length === 0) return null;

  const verified =
    pair.required_documents?.last_verified_at ?? pair.last_verified_at;

  return {
    // No row of ours behind it — the contract's API-provider case, which
    // `adoptRuleSet` and the requirements screen already handle.
    corridorId: null,
    provider: "doineedvisa",
    visaName: VISA_NAMES[pair.requirement] ?? "Visa",
    version: 1,
    effectiveFrom: (verified ?? new Date().toISOString()).slice(0, 10),
    sourceName: "DoINeedVisa",
    sourceUrl:
      pair.required_documents?.source_url ?? pair.visa_info_link ?? null,
    // Required by the vendor's terms: the MIT notice plus the Passport
    // Index credit its base data derives from. Shipping a DoINeedVisa
    // rule set without this on screen is a licence breach, which is why
    // the text travels with the rule set rather than living in a page.
    attribution:
      "Rule data from DoINeedVisa, MIT licence, incorporating Passport Index data.",
    processingWeeksMin: weeksFrom(pair.processing_time?.min_days),
    processingWeeksMax: weeksFrom(pair.processing_time?.max_days),
    governmentFeeMinor:
      pair.fee != null ? Math.round(pair.fee.amount * 100) : null,
    governmentFeeCurrency: pair.fee?.currency ?? null,
    requirements: items.map((name, index) => ({
      docKey: docKeyFrom(name, index),
      name,
      description: null,
      // The API does not categorise; one honest bucket beats five
      // guessed ones.
      category: "general",
      isRequired: true,
      sortOrder: index + 1,
    })),
  };
}

function weeksFrom(days: number | null | undefined): number | null {
  if (days == null) return null;
  return Math.max(1, Math.ceil(days / 7));
}

/**
 * The quota is 300 requests a month, which page views would burn in an
 * afternoon. Rule sets change on the order of months, so a day-old
 * answer — including a day-old "no answer" — is still an answer. Module
 * state, so each server instance warms its own cache; fine at this
 * traffic, and a restart is the refresh lever.
 */
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: CorridorRuleSet | null }>();

/**
 * Set after the API rejects our key. A 401 cannot heal until the key
 * changes, and the key cannot change without a restart — so after the
 * first rejection the provider stands down for the process lifetime
 * rather than throwing on every requirements-page view. One clear log
 * line replaces an error per request.
 */
let keyRejected = false;

export const doINeedVisaProvider: VisaDataProvider = {
  name: "doineedvisa",

  async fetch(query: CorridorQuery): Promise<CorridorRuleSet | null> {
    const apiKey = process.env.DINV_API_KEY;
    if (!apiKey || keyRejected) return null;

    const purposeAware = process.env.DINV_PURPOSE_TIER === "1";
    if (query.purpose !== "tourism" && !purposeAware) return null;

    const key = `${query.nationalityIso}:${query.destinationIso}:${query.purpose}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

    const url = new URL(`${BASE}/${query.destinationIso.toUpperCase()}`);
    url.searchParams.set("from", query.nationalityIso.toUpperCase());
    if (purposeAware) url.searchParams.set("purpose", query.purpose);

    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(8000),
    });

    // 404 is "no such pair" — a normal no, cached like one. Anything
    // else unexpected throws, so the resolver logs this provider as
    // broken and moves on rather than treating an outage as a gap.
    if (response.status === 404) {
      cache.set(key, { at: Date.now(), value: null });
      return null;
    }
    if (response.status === 401 || response.status === 403) {
      keyRejected = true;
      console.error(
        "[visa] doineedvisa rejected the API key — check DINV_API_KEY in " +
          ".env.local (no quotes, no placeholder) and restart. Standing " +
          "down until then."
      );
      return null;
    }
    if (!response.ok) {
      throw new Error(`doineedvisa answered ${response.status}`);
    }

    const ruleSet = toRuleSet(await response.json());
    cache.set(key, { at: Date.now(), value: ruleSet });
    return ruleSet;
  },
};
