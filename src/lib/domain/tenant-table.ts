/**
 * Everything the agencies table knows that is not a rendered cell.
 *
 * A plain module for the same reason `corridor-table.ts` is one: the
 * table component is `"use client"`, so the page could not call these
 * from the server if they lived beside the cells. Filtering and sorting
 * happen on the server, over every row; the cells render wherever the
 * component does. This file is the half both sides may import.
 */

/** The columns this table will order by, and nothing else. */
export const TENANT_SORTS = ["agency", "members", "applications", "state", "added"] as const;
export type TenantSort = (typeof TENANT_SORTS)[number];

/** The two states the filter offers, which are the two the pill shows. */
export const TENANT_STATES = ["live", "suspended"] as const;

type Searchable = { name: string; domain: string | null; suspendedAt: Date | null };

/**
 * Whether one agency survives the toolbar.
 *
 * Name *and* domain. An operator arriving from a support thread has the
 * domain in front of them and often not the trading name, and a search
 * that only reads the name sends them scrolling for a row they can
 * already spell.
 *
 * An empty query, an empty state, or a state nobody offers all mean "no
 * opinion" rather than "match nothing". A junk `?state=` in the URL
 * should render the whole table, not an empty one with no way to see
 * why.
 */
export function tenantMatches(row: Searchable, q: string, state: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle) {
    const hay = `${row.name} ${row.domain ?? ""}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (state === "live") return row.suspendedAt === null;
  if (state === "suspended") return row.suspendedAt !== null;
  return true;
}

type Sortable = Searchable & {
  members: number;
  applicationsTotal: number;
  createdAt: Date;
};

/**
 * What one column sorts on.
 *
 * State sorts live-before-suspended rather than by the suspension date:
 * the column shows a pill with two values, so an operator ordering by
 * it wants the two groups apart, and the date behind it would scatter
 * the suspended among themselves for no visible reason.
 */
export function tenantSortKey(row: Sortable, sort: TenantSort): string | number {
  switch (sort) {
    case "members":
      return row.members;
    case "applications":
      return row.applicationsTotal;
    case "state":
      return row.suspendedAt === null ? 0 : 1;
    case "added":
      return row.createdAt.getTime();
    default:
      return row.name;
  }
}
