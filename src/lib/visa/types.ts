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
  fetch(query: CorridorQuery): Promise<CorridorRuleSet | null>;
}
