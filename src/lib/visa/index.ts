import "server-only";

import { curatedProvider } from "@/lib/visa/curated";
import { entryCheck } from "@/lib/visa/entry-check";
import { travelBuddyProvider } from "@/lib/visa/travelbuddy";
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
 * returns no data, so it is a referral link (`@/lib/visa/visahq`), not
 * a provider.
 */
const PROVIDERS: VisaDataProvider[] = [
  curatedProvider,
  // Last, and a contributor only: it holds the entry rules curated does
  // not — allowed stay, passport validity, embassy and eVisa links —
  // but no documents, so it can never open a rule set.
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
  try {
    return entryCheck(await travelBuddyProvider.fetch(query));
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
