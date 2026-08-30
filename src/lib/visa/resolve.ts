import { fillGaps, hasGaps } from "@/lib/visa/merge";
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
 * 3. **Stop when there is nothing left to fill.** Each provider behind
 *    the spine costs a metered request, so a complete rule set ends the
 *    walk. This is the live path for every seeded corridor, which is
 *    why composition costs nothing until a corridor actually has a gap.
 *
 * A provider that throws is logged and skipped: one vendor being down
 * must not take down a screen the curated table can already serve.
 */
export async function resolveWith(
  providers: VisaDataProvider[],
  query: CorridorQuery
): Promise<CorridorRuleSet | null> {
  let resolved: CorridorRuleSet | null = null;

  for (const provider of providers) {
    // Nothing left worth paying for.
    if (resolved && !hasGaps(resolved)) break;

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

    resolved = resolved ? fillGaps(resolved, answer) : answer;
  }

  return resolved;
}
