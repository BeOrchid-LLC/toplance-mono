import "server-only";

import { curatedProvider } from "@/lib/visa/curated";
import { entryCheck } from "@/lib/visa/entry-check";
import { travelBuddyProvider } from "@/lib/visa/travelbuddy";
import { visaListProvider } from "@/lib/visa/visalist";
import { resolveWith } from "@/lib/visa/resolve";
import type { EntryCheck } from "@/lib/visa/entry-check";
import type { CorridorQuery, CorridorRuleSet, VisaDataProvider } from "@/lib/visa/types";

export type { EntryCheck } from "@/lib/visa/entry-check";

export type {
  Contribution,
  CorridorQuery,
  CorridorRuleSet,
  RequirementSpec,
  TravelPurpose,
  VisaDataProvider,
} from "@/lib/visa/types";

/**
 * Order is precedence. Curated embassy data first, because someone
 * checked it against the mission; API providers follow, to widen
 * coverage and to fill a figure curated leaves blank — never to
 * override one it carries.
 *
 * Curated is currently the only provider that can lead. Travel Buddy
 * returns no documents, so until a vendor ships a document list this
 * list cannot produce a rule set for a corridor the table does not
 * already hold. VisaHQ is deliberately absent: an affiliate code
 * returns no data, so it would be a referral link, not a provider —
 * and no such module exists on disk, whatever this comment used to say.
 *
 * VisaList sits second, and not as the plan drew it. Phase 3 specified
 * it as a second *leader* serving tourism checklists; the recorded
 * response in `@/lib/visa/visalist.sample` carries no checklist at all,
 * so it is a contributor. It is ahead of Travel Buddy because it is
 * cheaper and wider — one call returns every destination for a passport
 * and is cached for a week — which leaves Travel Buddy to be spent on
 * the one field only it holds.
 *
 * Its caching and display terms are still unconfirmed in writing. That
 * is a licence question, not a correctness one; the rule set it returns
 * carries an attribution line for exactly that reason.
 */
const PROVIDERS: VisaDataProvider[] = [
  curatedProvider,
  // A contributor: entry rules for every destination a passport can
  // reach, and no documents, so it can never open a rule set. One
  // request per passport per week, against a tier that meters one an
  // hour.
  visaListProvider,
  // Last, and a contributor only: it holds the entry rules curated does
  // not — allowed stay, passport validity, embassy and eVisa links —
  // but no documents, so it can never open a rule set.
  //
  // Behind VisaList because VisaList is cheaper and wider. It does not
  // follow that the walk stops before getting here: `passportValidity`
  // is a `GapField`, and this is the only provider in the list that
  // fills it — curated has no column for it and VisaList's payload has
  // no field for it. So the gap survives even when both answer in full,
  // and every corridor still reaches this provider. `providers.test.ts`
  // pins that, so the day it stops being true somebody is told.
  //
  // Which means the 120-a-month tier is not protected by precedence
  // here; it is protected by the cache alone. Dropping `passportValidity`
  // from `GAP_FIELDS` would close the walk early, at the cost of that
  // figure disappearing from the screen on every corridor VisaList
  // covers — a product call, not a tidy-up.
  travelBuddyProvider,
];

/**
 * The rule set for one corridor, composed from whichever providers
 * answer. The walk itself lives in `@/lib/visa/resolve` so it can be
 * tested against stubs; this module's job is only to say who is in it
 * and in what order.
 */
export async function resolveRuleSet(
  query: CorridorQuery
): Promise<CorridorRuleSet | null> {
  return resolveWith(PROVIDERS, query);
}

/**
 * The lesser answer, for a corridor `resolveRuleSet` cannot serve: does
 * this passport need a visa for this destination at all?
 *
 * Only ever called after `resolveRuleSet` has returned null, and that
 * ordering is what makes it free. The walk in `resolveWith` already
 * asked Travel Buddy about this corridor and threw the answer away —
 * there was no spine for it to fill — and the provider caches a payload
 * for seven days, keyed on the country pair. So this is a cache hit, not
 * a second metered request.
 *
 * Returns null for a verdict `entryCheck` will not repeat, and null if
 * the vendor is unreachable. Both mean the same thing to the caller:
 * show the plain gap copy, which promises nothing.
 */
export async function resolveEntryCheck(
  query: CorridorQuery
): Promise<EntryCheck | null> {
  // In order, first answer wins. VisaList leads because it is the
  // cheap one — a week-long cache per passport rather than a metered
  // request per corridor — and because this is a dead-end screen, which
  // is the last place worth spending quota.
  //
  // The one field this trades away is `passportValidity`: Travel Buddy
  // is the only source that carries it, so a corridor VisaList answers
  // shows a stay and an embassy but no validity rule. That is a better
  // screen than the one this replaced, which showed nothing at all
  // whenever Travel Buddy's 120-request month ran out — as it currently
  // has. Asking Travel Buddy anyway, purely to fill one field on a
  // screen with no application behind it, is the quota burn this engine
  // has already been bitten by once.
  const contributors = [visaListProvider, travelBuddyProvider];

  try {
    for (const provider of contributors) {
      const check = entryCheck(await provider.fetch(query));
      if (check) return check;
    }
    return null;
  } catch (error) {
    // A dead end that still renders beats a 500. The traveller sees the
    // same copy they saw before this tier existed.
    console.error(
      `[visa] entry check failed for ` +
        `${query.nationalityIso}→${query.destinationIso}`,
      error
    );
    return null;
  }
}
