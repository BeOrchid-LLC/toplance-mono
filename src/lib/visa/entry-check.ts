import type { CorridorRuleSet } from "@/lib/visa/types";

/**
 * What a traveller can be told about a corridor we cannot build a
 * checklist for.
 *
 * This is the lesser of the two tiers the requirements screen serves.
 * The full tier is a curated corridor: documents, fee, decision time, an
 * application someone can actually file. This tier answers only the
 * first question a traveller has — *do I need a visa at all?* — from a
 * live vendor response, for corridors nobody has curated.
 *
 * It deliberately produces no `requirements`, no `corridorId` and no
 * application. A checklist with no rows means no upload slots, no
 * completion score and no 100%-complete trigger into the review queue,
 * which is why `canLead` stops a document-less provider leading a rule
 * set. Nothing here weakens that: this is a sentence on a dead-end
 * screen, not a rule set.
 *
 * Pure and free of I/O, so the decision that matters — which vendor
 * verdicts may be repeated to a traveller — can be read and tested on
 * its own.
 */

export type EntryCheck = {
  /** The verdict, in our words rather than the vendor's. */
  headline: string;
  passportValidity: string | null;
  allowedStay: string | null;
  embassyUrl: string | null;
};

/**
 * The vendor categories this product is willing to repeat, mapped to the
 * sentence it will say.
 *
 * An **allowlist**, and the distinction is the whole point. Travel Buddy
 * answers NG→US with "Not admitted" — a categorical claim about an
 * entire nationality, carrying no scope, no effective date and no source
 * the screen could cite. A traveller who answered ten questions honestly
 * should not meet that sentence rendered raw, and we are in no position
 * to defend it.
 *
 * A blocklist would let the next unanticipated verdict through, which is
 * the same failure with a different name. So anything not written here
 * is declined, and the screen falls back to copy that says only what we
 * know: that we cannot build a checklist yet.
 *
 * Keys are lowercased at the lookup — the vendor's capitalisation varies
 * between corridors, and case is not a category.
 */
const VERDICTS: Record<string, string> = {
  "visa required": "A visa is required for your passport.",
  "online visa required": "An online visa is required for your passport.",
  "visa not required": "No visa is required for your passport.",
};

/**
 * `ruleSet` as a sentence a traveller can be shown, or null when it
 * carries a verdict this product will not repeat.
 *
 * Null is the safe answer and the common one for anything unusual: the
 * caller renders the plain gap copy instead, which is always true.
 */
export function entryCheck(ruleSet: CorridorRuleSet | null): EntryCheck | null {
  if (!ruleSet) return null;

  const headline = VERDICTS[ruleSet.visaName.trim().toLowerCase()];
  if (!headline) return null;

  return {
    headline,
    passportValidity: ruleSet.passportValidity,
    allowedStay: ruleSet.allowedStay,
    embassyUrl: ruleSet.embassyUrl,
  };
}
