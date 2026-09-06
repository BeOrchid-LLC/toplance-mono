// Relative, not aliased, and deliberately: `db:intake-codes` runs this
// under plain `node --experimental-strip-types`, which resolves no
// tsconfig paths. `intake.ts` itself imports only a type across the
// alias, and types are erased, so this is the one edge that had to move.
import { INTAKE_QUESTIONS } from "./intake.ts";

/**
 * One intake answer, reduced to the canonical value a rule can match —
 * or null when it honestly cannot be.
 *
 * Conditional requirements are written against the answers, and they
 * used to match by string equality against whatever the traveller
 * typed. Free text is allowed on every question, so a traveller who
 * wrote "my wife and our son" instead of tapping *Partner and children*
 * matched nothing, and `appliesToTraveller` read that as a certain
 * **no**: the marriage certificate left their checklist, and the engine
 * recorded the decision as certain rather than unknown. The client's own
 * words for what this product is for — "telling them what applies" —
 * make that the worst failure available.
 *
 * So there are two values now. The traveller's own words stay stored and
 * are what a reviewer reads; the code is what a rule matches. When no
 * code can be derived the rule cannot be evaluated, and an unevaluable
 * rule leaves the requirement in the hedged list rather than dropping
 * it.
 *
 * Matching is deliberately exact rather than fuzzy, in three ways it can
 * succeed: the canonical value itself, or that chip's label in any
 * language the interface speaks, either compared without case or
 * surrounding space. A Hausa speaker taps the Hausa chip and an approver
 * writes the rule in English; both have to arrive at the same code or
 * the product works only in the language it was authored in.
 *
 * Nothing here guesses. A near-miss returns null and the traveller keeps
 * the hedge — which is a worse screen than a correct match and a far
 * better one than a confidently missing document. Turning free text into
 * a code by asking a model is the same class of error as dropping the
 * certificate: it would decide something about someone's family that
 * nobody verified.
 */
export function normaliseAnswer(questionKey: string, value: string): string | null {
  const answer = value.trim().toLowerCase();
  if (!answer) return null;

  const question = INTAKE_QUESTIONS.find((q) => q.key === questionKey);
  if (!question) return null;

  for (const chip of question.chips) {
    if (chip.value.trim().toLowerCase() === answer) return chip.value;

    for (const label of Object.values(chip.label)) {
      if (label.trim().toLowerCase() === answer) return chip.value;
    }
  }

  return null;
}
