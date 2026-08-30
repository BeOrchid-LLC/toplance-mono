import type { travelPurpose } from "@/lib/db/schema";

export type TravelPurpose = (typeof travelPurpose.enumValues)[number];

/** One nationality → one destination → one purpose. */
export type CorridorQuery = {
  nationalityIso: string;
  destinationIso: string;
  purpose: TravelPurpose;
};

export type RequirementSpec = {
  docKey: string;
  name: string;
  description: string | null;
  category: string;
  isRequired: boolean;
  sortOrder: number;
};

/**
 * One provider's fill into someone else's rule set: who it was, how to
 * cite it, and which figures it supplied.
 *
 * `fields` carries the requirements screen's own labels rather than
 * property names, because its only job is to be read on that screen —
 * "Government fee", not `governmentFeeMinor`.
 */
export type Contribution = {
  provider: string;
  sourceName: string | null;
  sourceUrl: string | null;
  attribution: string | null;
  fields: string[];
};

/**
 * What every provider must return, whoever it is.
 *
 * `corridorId` is set only when the rule set came from a row in our own
 * `corridors` table — an application's `corridor_id` foreign key needs
 * something real to point at. An API provider returns null here, which
 * is why the checklist builder must cope with a rule set that has no
 * corridor row behind it.
 *
 * `sourceName` and `sourceUrl` are not decoration. The requirements
 * screen shows them, and a checklist nobody can trace is a checklist
 * nobody trusts.
 */
export type CorridorRuleSet = {
  corridorId: string | null;
  /**
   * Which provider produced this rule set — the provider's own `name`.
   * Analytics used to hardcode "curated" at the call site, which became
   * a lie the moment a second provider could answer.
   */
  provider: string;
  visaName: string;
  version: number;
  effectiveFrom: string;
  sourceName: string | null;
  sourceUrl: string | null;
  /**
   * A credit the provider's licence obliges the product to display,
   * rendered verbatim on the requirements screen beside the source.
   *
   * Carried on the rule set rather than decided at the render site so
   * that a licence obligation travels with the data it attaches to: a
   * provider added later states its own terms here, and cannot be wired
   * up without a reviewer seeing whether it needs one. `null` means the
   * provider mandates no credit, which is the common case.
   */
  attribution: string | null;
  /**
   * Providers other than the spine that filled a figure this rule set
   * would otherwise have left blank, and which figure each one filled.
   *
   * Provenance has to be per-field once a rule set can be composed. The
   * requirements screen promises "Nothing here is our interpretation"
   * over a single source line; if the fee quietly came from a different
   * vendor than the documents, that line is false. Empty is the common
   * case and renders exactly as it always did.
   */
  contributions: Contribution[];
  /**
   * The entry rules the brief's item 6 names, beyond the fee and the
   * decision time. Every one is nullable and every one is fillable by a
   * contributor: curated corridors carry none of them today, and Travel
   * Buddy is the only source that does.
   *
   * `allowedStay` and `passportValidity` are human strings — "30 days",
   * "3 months beyond stay" — because that is how the missions state
   * them and how they must be read back. Parsing them into numbers
   * would invent a precision the source does not have.
   */
  allowedStay: string | null;
  passportValidity: string | null;
  embassyUrl: string | null;
  evisaUrl: string | null;
  registrationName: string | null;
  registrationUrl: string | null;
  processingWeeksMin: number | null;
  processingWeeksMax: number | null;
  governmentFeeMinor: number | null;
  governmentFeeCurrency: string | null;
  requirements: RequirementSpec[];
};

/**
 * `name` is stable and is written to analytics and (later) cache rows,
 * so it must not change once a provider ships.
 *
 * `fetch` returns null for "I do not cover this corridor", which is a
 * normal answer, not a failure. It throws only when the provider itself
 * is broken — the resolver tells the two apart.
 */
export interface VisaDataProvider {
  readonly name: string;
  /**
   * Whether this provider may be the spine — the one whose documents
   * become the checklist.
   *
   * `false` for a provider that returns entry rules but no document
   * list. If such a provider ever led, `adoptRuleSet` would materialise
   * a checklist with no rows: no upload slots, no completion score, and
   * no 100%-complete trigger for the review queue. It may fill figures
   * on someone else's rule set; it may never be the rule set.
   */
  readonly canLead: boolean;
  fetch(query: CorridorQuery): Promise<CorridorRuleSet | null>;
}
