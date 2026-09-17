import { AGENCY_STATUSES, AGENCY_STATUS_RANK, type AgencyStatus } from "@/lib/domain/agency-status";

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

type Searchable = { name: string; domain: string | null; status: AgencyStatus };

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
  // `?state=` keeps its name — see `OPS_TENANTS.tableHead.state`. Its
  // values are now the five `AgencyStatus`es; `live` and `suspended`
  // are two of them, so a link bookmarked from the two-state filter
  // still opens, now meaning the narrower lifecycle status.
  if ((AGENCY_STATUSES as readonly string[]).includes(state)) return row.status === state;
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
 * State sorts by lifecycle rank (`AGENCY_STATUS_RANK`: onboarding,
 * awaiting payment, live, lapsed, suspended) rather than by the words,
 * which would order differently in every locale, or by a date behind
 * the pill, which would scatter one status among itself.
 */
export function tenantSortKey(row: Sortable, sort: TenantSort): string | number {
  switch (sort) {
    case "members":
      return row.members;
    case "applications":
      return row.applicationsTotal;
    case "state":
      return AGENCY_STATUS_RANK[row.status];
    case "added":
      return row.createdAt.getTime();
    default:
      return row.name;
  }
}
