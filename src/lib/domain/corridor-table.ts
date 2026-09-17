import type { CorridorRow } from "@/lib/data/corridors";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { freshnessOf } from "@/lib/domain/freshness";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CORRIDORS } from "@/lib/i18n/ops-corridors";
import { formatDate } from "@/lib/format/date";

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
 * A corridor version's one status, folding its two columns together.
 *
 * `reviewState` is where a version is in the approval path and `isLive`
 * is whether the engine serves it. The table used to print both as two
 * pills — "Approved" beside "Live" — and the client's review of
 * 17 September asked for one. Approving a version flips it live and the
 * previous one off (`approveCorridor`), so an approved version that is
 * not live is one a newer version replaced: superseded.
 */
export const CORRIDOR_STATUSES = ["live", "superseded", "pending", "rejected"] as const;
export type CorridorStatus = (typeof CORRIDOR_STATUSES)[number];

export function corridorStatus(
  row: Pick<CorridorRow, "reviewState" | "isLive">
): CorridorStatus {
  if (row.reviewState === "pending") return "pending";
  if (row.reviewState === "rejected") return "rejected";
  return row.isLive ? "live" : "superseded";
}

/**
 * What each status looks like at a glance. `pending` is the only one
 * that is work rather than record, so it is the only one that gets a
 * colour demanding attention.
 */
export const CORRIDOR_STATUS_VARIANT = {
  live: "brand",
  superseded: "neutral",
  pending: "warning",
  rejected: "neutral",
} as const satisfies Record<CorridorStatus, string>;

export function corridorStatusLabel(status: CorridorStatus, locale: Locale) {
  switch (status) {
    case "live":
      return OPS_COMMON.live[locale];
    case "superseded":
      return OPS_COMMON.superseded[locale];
    case "pending":
      return OPS_COMMON.awaitingReview[locale];
    case "rejected":
      return OPS_COMMON.sentBack[locale];
  }
}

/**
 * How fresh a live corridor is, said in the fewest words that stay
 * honest. The corridor's own page carries the full sentence; a coverage
 * table needs the verdict.
 */
export function freshnessLabel(row: CorridorRow, locale: Locale) {
  const f = freshnessOf(row.lastVerifiedAt?.toISOString() ?? null, row.purpose);
  if (f.state === "unverified" || !row.lastVerifiedAt)
    return { text: OPS_CORRIDORS.notCheckedYetShort[locale], tone: "text-danger-ink" };
  // The table's own short date rather than the sentence form `freshnessOf`
  // writes for the corridor's page: a cell says when, the page says so.
  const checked = formatDate(row.lastVerifiedAt, locale);
  if (f.state === "stale")
    return { text: `${OPS_CORRIDORS.stale[locale]} · ${checked}`, tone: "text-warning-ink" };
  return { text: checked, tone: "t-muted" };
}

/**
 * The status filter: the four statuses the column prints, plus "Not
 * checked yet", which the corridor page's counter of that name links to
 * (`?state=unverified`) and which is about freshness rather than status.
 *
 * The URL key stays `state`, and `approved` — from before approved and
 * live were one status — still reads, as either of the two it split into.
 */
export function corridorStateFilters(locale: Locale) {
  return [
    ...CORRIDOR_STATUSES.map((status) => ({
      value: status,
      label: corridorStatusLabel(status, locale),
    })),
    { value: "unverified", label: OPS_CORRIDORS.notCheckedYetShort[locale] },
  ];
}

export function corridorMatchesState(
  row: Pick<CorridorRow, "reviewState" | "isLive" | "lastVerifiedAt">,
  state: string
) {
  switch (state) {
    case "live":
    case "superseded":
    case "pending":
    case "rejected":
      return corridorStatus(row) === state;
    case "approved":
      return row.reviewState === "approved";
    case "unverified":
      return row.isLive && !row.lastVerifiedAt;
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
export function corridorSortKey(row: CorridorRow, sort: CorridorSort) {
  switch (sort) {
    case "purpose":
      return row.purpose;
    case "version":
      return row.version;
    case "state":
      // By rank, in `CORRIDOR_STATUSES` order — live, superseded,
      // awaiting review, sent back — rather than by the translated word,
      // which would order differently in every locale.
      return CORRIDOR_STATUSES.indexOf(corridorStatus(row));
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
