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
  /**
   * Whether this passport needs a visa at all, as a fact rather than a
   * sentence.
   *
   * Carried separately because a caller that needs the *decision* would
   * otherwise have to match on `headline`, and copy is not an API — the
   * dead-end screen branches on this to tell a traveller who needs
   * nothing that they need nothing, instead of "we do not cover Ghana
   * yet". Never null: a verdict outside `VERDICTS` returns no
   * `EntryCheck` at all, so anything holding one has a decided answer.
   */
  requiresVisa: boolean;
  passportValidity: string | null;
  allowedStay: string | null;
  embassyUrl: string | null;
  /**
   * Who said so, and any credit their licence obliges us to print.
   *
   * Carried rather than hardcoded at the render site: this screen named
   * "Travel Buddy" in its copy, which became a false attribution the
   * moment a second provider could answer it — and it silently was one,
   * crediting Travel Buddy for VisaList's data. A source line that names
   * the wrong vendor is worse than no source line: it is a citation
   * pointing somewhere the figure never came from.
   */
  sourceName: string;
  attribution: string | null;
};

/**
 * The vendor categories this product is willing to repeat, mapped to the
 * sentence it will say.
 *
 * An **allowlist**, and the distinction is the whole point. Travel Buddy
 * answers NG→US with "Not admitted" — a categorical claim about an
 * entire nationality, carrying no scope, no effective date and no source
 * the screen could cite. A traveller who answered every question honestly
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
const VERDICTS: Record<string, { sentence: string; requiresVisa: boolean }> = {
  "visa required": {
    sentence: "A visa is required for your passport.",
    requiresVisa: true,
  },
  "online visa required": {
    sentence: "An online visa is required for your passport.",
    requiresVisa: true,
  },
  "visa not required": {
    sentence: "No visa is required for your passport.",
    requiresVisa: false,
  },

  // VisaList's four category names. They are added rather than
  // translated at the provider because this list is the one place the
  // product decides what it is willing to say, and a mapping hidden in
  // `visalist.ts` would route around that decision.
  //
  // Each is admissible for the same reason the three above are: it is a
  // scoped, dated statement about paperwork. None is the kind of claim
  // the allowlist exists to refuse — "Not admitted", a categorical
  // verdict about a whole nationality with no scope and no source.
  "visa free": {
    sentence: "No visa is required for your passport.",
    requiresVisa: false,
  },
  "e-visa": {
    sentence: "An online visa is required for your passport.",
    requiresVisa: true,
  },
  // `requiresVisa: true`, and the distinction is not pedantic. A visa
  // issued at the border is still a visa: there are documents to carry
  // and a fee to pay on landing, so this corridor wants a curated
  // checklist. Calling it "no visa needed" because none is obtained
  // beforehand would send someone to an airport counter unprepared.
  "visa on arrival": {
    sentence:
      "A visa is required, and is issued on arrival rather than beforehand.",
    requiresVisa: true,
  },
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

  const verdict = VERDICTS[ruleSet.visaName.trim().toLowerCase()];
  if (!verdict) return null;

  return {
    headline: verdict.sentence,
    requiresVisa: verdict.requiresVisa,
    passportValidity: ruleSet.passportValidity,
    allowedStay: ruleSet.allowedStay,
    embassyUrl: ruleSet.embassyUrl,
    // The provider's own name is the fallback, so a provider added later
    // that forgets `sourceName` is credited by id rather than anonymously.
    sourceName: ruleSet.sourceName ?? ruleSet.provider,
    attribution: ruleSet.attribution,
  };
}
