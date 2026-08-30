import "server-only";

import { curatedProvider } from "@/lib/visa/curated";
import { doINeedVisaProvider } from "@/lib/visa/doineedvisa";
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
 */
const PROVIDERS: VisaDataProvider[] = [
  curatedProvider,
  doINeedVisaProvider,
  // Last, and a contributor only: it holds the entry rules none of the
  // others do — allowed stay, passport validity, embassy and eVisa
  // links — but no documents, so it can never open a rule set.
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
