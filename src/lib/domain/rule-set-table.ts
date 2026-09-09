import type { AgencyRuleSetRow } from "@/lib/data/agency-rule-sets";
import { countryName } from "@/lib/domain/corridor-table";

/**
 * The agency rule-set table's filter and sort keys.
 *
 * A plain module for the reason `corridor-table.ts` gives: the table
 * component is `"use client"` and the page that filters and sorts is a
 * server component, so neither may import the other's copy.
 *
 * `countryName` is reused rather than redefined. A route that reads
 * "Nigeria → United Kingdom" on the platform console and "NG → GB" on
 * the agency's would be the same corridor wearing two names.
 */

/** The columns this table will order by, and nothing else. */
export const RULE_SET_SORTS = [
  "route",
  "purpose",
  "version",
  "documents",
  "cases",
] as const;
export type RuleSetSort = (typeof RULE_SET_SORTS)[number];

/**
 * Substring match over the words on the row a person would actually
 * type: either country by name or by code, and the visa's own name.
 *
 * The ISO codes are in there beside the names because a handler who
 * files the same route forty times a week types "GB" long before they
 * type "United Kingdom".
 */
export function ruleSetMatches(
  row: Pick<AgencyRuleSetRow, "nationalityIso" | "destinationIso" | "visaName">,
  q: string
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  return [
    countryName(row.nationalityIso),
    countryName(row.destinationIso),
    row.nationalityIso,
    row.destinationIso,
    row.visaName,
  ]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(needle));
}

/** An exact purpose match; an empty filter means any. */
export function ruleSetMatchesPurpose(
  row: Pick<AgencyRuleSetRow, "purpose">,
  purpose: string
): boolean {
  if (!purpose) return true;
  return row.purpose === purpose;
}

/**
 * The value a column sorts on, which is not always the value it prints.
 *
 * `route` sorts on the resolved country names rather than the codes, so
 * the order matches what the reader sees down the column — "Nigeria"
 * files under N, not under NG.
 */
export function ruleSetSortKey(row: AgencyRuleSetRow, sort: RuleSetSort) {
  switch (sort) {
    case "purpose":
      return row.purpose;
    case "version":
      return row.version;
    case "documents":
      return row.requirementCount;
    case "cases":
      return row.caseCount;
    default:
      return `${countryName(row.nationalityIso)} ${countryName(row.destinationIso)}`;
  }
}
