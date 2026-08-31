import type { Contribution, CorridorRuleSet } from "@/lib/visa/types";

/**
 * Composing one rule set out of several providers, without letting any
 * of them contradict the one that answered first.
 *
 * Pure and free of I/O, so the policy — which figures may be filled, by
 * whom, and what gets said about it afterwards — can be read and tested
 * on its own, the way `corridorGap` is.
 *
 * Two rules, and the second is the reason this is a module rather than
 * a few lines in the resolver:
 *
 * 1. **The spine is not up for revision.** Whoever answers first owns
 *    the corridor, the documents and the identity of the rule set.
 *    Later providers may only fill a figure that is *absent*. Precedence
 *    order puts curated first, so a figure someone checked against the
 *    mission is never overwritten by a vendor holding a different one.
 *
 * 2. **The checklist cannot be composed at all.** Checklist rows key on
 *    `docKey`, so merging two document lists either collides on that key
 *    or hands a traveller two upload slots for one document. Documents
 *    come from exactly one provider, always.
 */

/** The figures a second provider may supply, as the screen labels them. */
const FEE = "Government fee";
const PROCESSING = "Typical decision time";
const STAY = "Allowed stay";
const VALIDITY = "Passport validity";
const EMBASSY = "Embassy contact";
const EVISA = "Official eVisa portal";
const REGISTRATION = "Arrival registration";

/**
 * Whether anything is still missing that another provider could supply.
 *
 * This is the gate that keeps a complete corridor free: every provider
 * consulted behind the spine costs a request against a metered quota
 * (Travel Buddy's free tier is 120 a month, DoINeedVisa's 300), so the
 * resolver stops walking the moment there is nothing left to fill.
 *
 * The eVisa portal and the arrival registration are deliberately not
 * gaps. Plenty of routes have neither, so counting them would send
 * every corridor shopping for a figure that does not exist — and spend
 * a metered request discovering that, on every page view.
 */
export function hasGaps(ruleSet: CorridorRuleSet): boolean {
  return (
    ruleSet.governmentFeeMinor == null ||
    ruleSet.processingWeeksMin == null ||
    ruleSet.processingWeeksMax == null ||
    ruleSet.allowedStay == null ||
    ruleSet.passportValidity == null ||
    ruleSet.embassyUrl == null
  );
}

/**
 * `spine` with any figure it lacks taken from `other`, plus a record of
 * what was taken and from whom.
 *
 * Returns a new object; the spine passed in is never modified, so a
 * cached rule set cannot be quietly rewritten by a merge downstream of
 * it. One provider produces one contribution however many figures it
 * supplied — the sheet names a source once, not once per figure.
 */
export function fillGaps(
  spine: CorridorRuleSet,
  other: CorridorRuleSet
): CorridorRuleSet {
  const merged: CorridorRuleSet = { ...spine };
  const fields: string[] = [];

  /** Fill one nullable field, naming it if it was actually taken. */
  const take = <K extends keyof CorridorRuleSet>(key: K, label: string) => {
    if (merged[key] == null && other[key] != null) {
      merged[key] = other[key];
      fields.push(label);
    }
  };

  // A fee and its currency move together — an amount without a currency
  // is a number, not a price, and the screen would render it against
  // whatever default it has to hand.
  if (
    merged.governmentFeeMinor == null &&
    other.governmentFeeMinor != null &&
    other.governmentFeeCurrency != null
  ) {
    merged.governmentFeeMinor = other.governmentFeeMinor;
    merged.governmentFeeCurrency = other.governmentFeeCurrency;
    fields.push(FEE);
  }

  // Likewise the window: the screen prints "3–8 weeks", so half a range
  // is not a shorter answer, it is an unreadable one.
  if (
    merged.processingWeeksMin == null &&
    merged.processingWeeksMax == null &&
    other.processingWeeksMin != null &&
    other.processingWeeksMax != null
  ) {
    merged.processingWeeksMin = other.processingWeeksMin;
    merged.processingWeeksMax = other.processingWeeksMax;
    fields.push(PROCESSING);
  }

  take("allowedStay", STAY);
  take("passportValidity", VALIDITY);
  take("embassyUrl", EMBASSY);
  take("evisaUrl", EVISA);

  // A registration is a name and the form to do it. Half of that is a
  // traveller told they must register somewhere, with nowhere to go.
  if (
    merged.registrationName == null &&
    other.registrationName != null &&
    other.registrationUrl != null
  ) {
    merged.registrationName = other.registrationName;
    merged.registrationUrl = other.registrationUrl;
    fields.push(REGISTRATION);
  }

  if (fields.length === 0) return merged;

  const contribution: Contribution = {
    provider: other.provider,
    sourceName: other.sourceName,
    sourceUrl: other.sourceUrl,
    attribution: other.attribution,
    fields,
  };

  merged.contributions = [...spine.contributions, contribution];
  return merged;
}
