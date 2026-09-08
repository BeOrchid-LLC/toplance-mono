import type { CorridorRow } from "@/lib/data/corridors";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { freshnessOf } from "@/lib/domain/freshness";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CORRIDORS } from "@/lib/i18n/ops-corridors";

/**
 * Everything the route-coverage table knows that is not a rendered cell.
 *
 * A plain module on purpose. The table component is `"use client"`, and
 * every export of a client module reaches a server component as a client
 * reference rather than as the function itself — so the page could not
 * call `corridorSortKey` to sort with if it lived there. The sort keys
 * and the filter predicate have to run on the server, where the sorting
 * and filtering happen; the cells have to run wherever the component
 * does. This file is the half both sides may import.
 */

/** The columns this table will order by, and nothing else. */
export const CORRIDOR_SORTS = [
  "route",
  "purpose",
  "version",
  "state",
  "documents",
  "checked",
] as const;
export type CorridorSort = (typeof CORRIDOR_SORTS)[number];

/**
 * The country's name, or the raw code upper-cased when this file cannot
 * resolve it. Never blank and never invented — a drafted corridor for a
 * code we do not map should still be reviewable.
 */
export const countryName = (iso: string) => countryFromIso2(iso)?.name ?? iso.toUpperCase();

/**
 * What a row's review state should look like at a glance. `pending` is
 * the only one that is work rather than record, so it is the only one
 * that gets a colour demanding attention. Labels resolve through
 * `OPS_COMMON` rather than living on this object, since the variant is
 * fixed but the word is not.
 */
export const CORRIDOR_STATE_VARIANT = {
  pending: "warning" as const,
  approved: "success" as const,
  rejected: "neutral" as const,
};

export function stateLabel(
  reviewState: keyof typeof CORRIDOR_STATE_VARIANT,
  locale: Locale
) {
  if (reviewState === "pending") return OPS_COMMON.awaitingReview[locale];
  if (reviewState === "approved") return OPS_COMMON.approved[locale];
  return OPS_COMMON.sentBack[locale];
}

/**
 * How fresh a live corridor is, said in the fewest words that stay
 * honest. The corridor's own page carries the full sentence; a coverage
 * table needs the verdict.
 */
export function freshnessLabel(row: CorridorRow, locale: Locale) {
  const f = freshnessOf(row.lastVerifiedAt?.toISOString() ?? null, row.purpose);
  if (f.state === "unverified")
    return { text: OPS_CORRIDORS.notCheckedYetShort[locale], tone: "text-danger-ink" };
  if (f.state === "stale")
    return { text: `${OPS_CORRIDORS.stale[locale]} · ${f.checked}`, tone: "text-warning-ink" };
  return { text: f.checked, tone: "t-muted" };
}

/**
 * The coverage filters, as one map.
 *
 * These cut across the two columns that are not the same question:
 * `reviewState` is where a version is in the approval path, `isLive` is
 * whether the engine serves it, and a superseded version is approved and
 * not live at once. So the filter names the state a person is looking
 * for rather than the column it happens to live in.
 */
export function corridorStateFilters(locale: Locale) {
  return [
    { value: "live", label: OPS_COMMON.live[locale] },
    { value: "pending", label: OPS_COMMON.awaitingReview[locale] },
    { value: "unverified", label: OPS_CORRIDORS.notCheckedYetShort[locale] },
    { value: "rejected", label: OPS_COMMON.sentBack[locale] },
  ];
}

export function corridorMatchesState(row: CorridorRow, state: string) {
  switch (state) {
    case "live":
      return row.isLive;
    case "pending":
      return row.reviewState === "pending";
    case "unverified":
      return row.isLive && !row.lastVerifiedAt;
    case "rejected":
      return row.reviewState === "rejected";
    default:
      return true;
  }
}

/**
 * The value a column sorts on, which is not always the value it prints.
 *
 * Beside the filter rather than in the page, so a column that sorts by
 * one field and shows another is a mismatch inside one file instead of
 * one hidden across two.
 */
export function corridorSortKey(row: CorridorRow, sort: CorridorSort, locale: Locale) {
  switch (sort) {
    case "purpose":
      return row.purpose;
    case "version":
      return row.version;
    case "state":
      return stateLabel(row.reviewState, locale);
    case "documents":
      return row.requirementCount;
    case "checked":
      // The date itself, not the words `freshnessLabel` prints: "Not
      // checked yet" would otherwise sort among the Ns. Nulls go last in
      // both directions, which is what `compareCells` does.
      return row.lastVerifiedAt;
    default:
      return `${countryName(row.nationalityIso)} ${countryName(row.destinationIso)}`;
  }
}
