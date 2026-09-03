import { fillGaps, gapsIn, hasGaps } from "@/lib/visa/merge";
import type {
  CorridorQuery,
  CorridorRuleSet,
  VisaDataProvider,
} from "@/lib/visa/types";

/**
 * Walk a provider list and compose one rule set out of what answers.
 *
 * Takes its providers rather than importing them, so the walk — which
 * is policy, not I/O — is testable against stubs without a database or
 * a network. `@/lib/visa` supplies the real list.
 *
 * The walk has three rules:
 *
 * 1. **First answer wins the spine.** Order is precedence, and curated
 *    is first: documents, corridor and identity come from whoever
 *    answered, and nothing later revises them.
 * 2. **Later providers fill blanks only.** See `fillGaps` for what may
 *    be filled and why the checklist may not.
 * 3. **Stop when nobody left can fill anything.** Each provider behind
 *    the spine costs a metered request, so the walk ends as soon as the
 *    figures still missing are ones no remaining provider declares it
 *    can supply — including the case where nothing is missing at all.
 *
 *    This used to test the spine for completeness alone, which read
 *    correctly and never once fired. Our providers are exact
 *    complements: `corridors` has no column for allowed stay, passport
 *    validity or embassy contact, so a curated spine is missing all
 *    three on every row, forever. The gate therefore never closed, and
 *    a screen that the curated table could already serve bought the
 *    same vendor answer again on every page view — against a quota of
 *    120 a month. Comparing gaps to what remains in the walk is what
 *    makes the stop reachable.
 *
 * A provider that throws is logged and skipped: one vendor being down
 * must not take down a screen the curated table can already serve.
 */
export async function resolveWith(
  providers: VisaDataProvider[],
  query: CorridorQuery
): Promise<CorridorRuleSet | null> {
  let resolved: CorridorRuleSet | null = null;
  // Contributors that answered before any spine did. Precedence order
  // should put contributors last, but the list is configuration and a
  // resolver that only worked in one ordering would be a trap.
  const held: CorridorRuleSet[] = [];

  for (const [index, provider] of providers.entries()) {
    // Nothing left worth paying for: either the spine is whole, or the
    // holes in it are ones nobody still to come has ever claimed to
    // fill. `held` is not consulted — those providers already answered,
    // so they cost nothing more and are merged after the walk.
    if (resolved) {
      const gaps = gapsIn(resolved);
      const reachable = providers
        .slice(index)
        .some((later) => later.fills.some((field) => gaps.includes(field)));
      if (!reachable) break;
    }

    let answer: CorridorRuleSet | null = null;
    try {
      answer = await provider.fetch(query);
    } catch (error) {
      console.error(
        `[visa] provider "${provider.name}" failed for ` +
          `${query.nationalityIso}→${query.destinationIso}/${query.purpose}`,
        error
      );
      continue;
    }

    if (!answer) continue;

    if (resolved) {
      resolved = fillGaps(resolved, answer);
      continue;
    }

    // A provider with no documents cannot open a rule set — see
    // `canLead`. Its figures are kept only if a spine turns up later,
    // which is why they are held rather than discarded.
    if (provider.canLead) {
      resolved = answer;
    } else {
      held.push(answer);
    }
  }

  if (!resolved) return null;

  for (const early of held) {
    if (!hasGaps(resolved)) break;
    resolved = fillGaps(resolved, early);
  }

  return resolved;
}
