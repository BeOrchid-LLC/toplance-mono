import "server-only";

import { curatedProvider } from "@/lib/visa/curated";
import { travelBuddyProvider } from "@/lib/visa/travelbuddy";
import { resolveWith } from "@/lib/visa/resolve";
import type { CorridorQuery, CorridorRuleSet, VisaDataProvider } from "@/lib/visa/types";

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
