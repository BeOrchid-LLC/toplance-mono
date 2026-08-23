import "server-only";

import { curatedProvider } from "@/lib/visa/curated";
import type {
  CorridorQuery,
  CorridorRuleSet,
  VisaDataProvider,
} from "@/lib/visa/types";

export type {
  CorridorQuery,
  CorridorRuleSet,
  RequirementSpec,
  TravelPurpose,
  VisaDataProvider,
} from "@/lib/visa/types";

/**
 * Order is precedence. Curated embassy data first, because someone
 * checked it against the mission; an API provider would go after, to
 * widen coverage rather than to override what we already trust.
 */
const PROVIDERS: VisaDataProvider[] = [curatedProvider];

/**
 * The first provider with an answer wins. A provider that throws is
 * logged and skipped rather than allowed to take down the requirements
 * screen: one vendor being down must not stop a traveller seeing a
 * corridor another provider covers.
 */
export async function resolveRuleSet(
  query: CorridorQuery
): Promise<CorridorRuleSet | null> {
  for (const provider of PROVIDERS) {
    try {
      const ruleSet = await provider.fetch(query);
      if (ruleSet) return ruleSet;
    } catch (error) {
      console.error(
        `[visa] provider "${provider.name}" failed for ` +
          `${query.nationalityIso}→${query.destinationIso}/${query.purpose}`,
        error
      );
    }
  }

  return null;
}
