import type { KybQueueRow } from "@/lib/data/kyb";
import type { KybStanding } from "@/lib/domain/kyb";
import { OPS_KYB } from "@/lib/i18n/ops-kyb";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Everything the verification queue's table knows that is not a
 * rendered cell.
 *
 * A plain module for the reason `corridor-table.ts` gives: `KybTable` is
 * `"use client"`, and every export of a client module reaches a server
 * component as a client reference rather than as the function itself.
 * The filtering, sorting and slicing all happen on the server, so the
 * predicates have to live somewhere both sides may import.
 */

/** The columns this table will order by, and nothing else. */
export const KYB_SORTS = ["agency", "progress", "standing", "added"] as const;
export type KybSort = (typeof KYB_SORTS)[number];

/**
 * The order a reader means by "state", which is not the enum's
 * declaration order.
 *
 * `ready` first, because it is the only row waiting on somebody in this
 * console — the same reason it is the only `info` badge in
 * `KYB_STANDING`. Sorting by the raw string would file `activated`
 * above `ready` on the alphabet and bury the work under the history.
 */
const STANDING_RANK: Record<KybStanding, number> = {
  ready: 0,
  in_review: 1,
  not_started: 2,
  activated: 3,
};

/**
 * The standing filters, as the queue's own words.
 *
 * Every value is a real `KybStanding`, so unlike the corridor table
 * this needs no predicate that cuts across two columns — `standing` is
 * already the single question a reader is asking.
 */
export function kybStandingFilters(locale: Locale) {
  return [
    { value: "ready", label: OPS_KYB.standing.ready[locale] },
    { value: "in_review", label: OPS_KYB.standing.inReview[locale] },
    { value: "not_started", label: OPS_KYB.standing.notStarted[locale] },
    { value: "activated", label: OPS_KYB.standing.activated[locale] },
  ];
}

/** An exact standing match; an empty filter means any. */
export function kybMatchesStanding(row: KybQueueRow, standing: string): boolean {
  if (!standing) return true;
  return row.standing === standing;
}

/**
 * Substring match on the agency's name, trimmed and case-folded.
 *
 * The name is the only thing on this row a person could search for. The
 * standing has its own filter, the progress is a fraction, and the date
 * is not something anybody types — offering to match them would make an
 * empty result look like a bug.
 */
export function kybMatches(row: Pick<KybQueueRow, "name">, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return row.name.toLowerCase().includes(needle);
}

/**
 * The value a column sorts on, which is not always the value it prints.
 *
 * `progress` sorts on the fraction rather than on `verified`: six of six
 * and six of twelve are not the same row, and ordering by the numerator
 * alone would interleave them. A checklist with no requirements at all
 * sorts as nothing done, which is what it is.
 */
export function kybSortKey(row: KybQueueRow, sort: KybSort) {
  switch (sort) {
    case "progress":
      return row.total === 0 ? 0 : row.verified / row.total;
    case "standing":
      return STANDING_RANK[row.standing];
    case "added":
      return row.createdAt;
    default:
      return row.name.toLowerCase();
  }
}
