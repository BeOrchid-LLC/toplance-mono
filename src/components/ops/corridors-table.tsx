"use client";

import Link from "next/link";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { CorridorRow } from "@/lib/data/corridors";
import {
  CORRIDOR_STATUSES,
  CORRIDOR_STATUS_VARIANT,
  corridorStateFilters,
  corridorStatus,
  corridorStatusLabel,
  countryName,
  freshnessLabel,
  type CorridorSort,
} from "@/lib/domain/corridor-table";
import { leadsFirst } from "@/lib/domain/sort-options";
import type { SortDir } from "@/lib/domain/sorting";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CORRIDORS } from "@/lib/i18n/ops-corridors";
import { cn } from "@/lib/utils";

/**
 * Route coverage, as columns over the shared `DataTable`.
 *
 * A client module because `DataTable` is one, and `DataTable` is one
 * because a column's `cell` is a function that cannot cross the RSC
 * boundary. The page above stays a server component and still does every
 * expensive thing — the query, the filter, the sort, the slice — so what
 * reaches the browser is the 25 rows being looked at, not the 99 the
 * table holds.
 */
export function CorridorsTable({
  rows,
  locale,
  sort,
  dir,
  purposes,
  total,
  unfilteredTotal,
  pagination,
}: {
  rows: CorridorRow[];
  locale: Locale;
  sort: CorridorSort;
  dir: SortDir;
  /** Every purpose present in the data, so the filter offers only real ones. */
  purposes: CorridorRow["purpose"][];
  total: number;
  unfilteredTotal: number;
  pagination: { page: number; pageCount: number; size: number };
}) {
  const columns: DataColumn<CorridorRow>[] = [
    {
      id: "route",
      width: "w-[26%]",
      label: OPS_CORRIDORS.tableHead.route[locale],
      sort: "text",
      // Same floor, same reason as `rule-sets-table`'s route column:
      // a country pair is one unbroken string, and without a floor
      // its whole width would be the column's minimum.
      floor: "min-w-[10rem]",
      cell: (row) => {
        const route = `${countryName(row.nationalityIso)} → ${countryName(row.destinationIso)}`;
        return (
          <>
            <Link
              href={`/ops/corridors/${row.id}`}
              title={route}
              className="block truncate font-semibold text-brand-text hover:underline"
            >
              {route}
            </Link>
            <span className="t-muted block truncate" title={row.visaName}>
              {row.visaName}
            </span>
          </>
        );
      },
    },
    {
      id: "purpose",
      width: "w-[11%]",
      label: OPS_CORRIDORS.tableHead.purpose[locale],
      sort: "text",
      cell: (row) => OPS_COMMON.purpose[row.purpose][locale],
    },
    {
      id: "version",
      width: "w-[10%]",
      label: OPS_CORRIDORS.tableHead.version[locale],
      sort: "number",
      className: "num",
      cell: (row) => `v${row.version}`,
    },
    {
      id: "state",
      width: "w-[19%]",
      label: OPS_CORRIDORS.tableHead.state[locale],
      // Ranked by status rather than by its words (`corridorSortKey`), so
      // the options name which status leads.
      sort: {
        asc: leadsFirst(corridorStatusLabel(CORRIDOR_STATUSES[0], locale), locale),
        desc: leadsFirst(corridorStatusLabel(CORRIDOR_STATUSES.at(-1)!, locale), locale),
      },
      pill: {
        labels: CORRIDOR_STATUSES.map((status) => corridorStatusLabel(status, locale)),
      },
      cell: (row) => {
        // One status, not "Approved" beside "Live": a superseded version
        // stays approved for the record and stops being served, and the
        // one word says both.
        const status = corridorStatus(row);
        return (
          <Badge variant={CORRIDOR_STATUS_VARIANT[status]}>
            {corridorStatusLabel(status, locale)}
          </Badge>
        );
      },
    },
    {
      id: "documents",
      width: "w-[13%]",
      label: OPS_CORRIDORS.tableHead.documents[locale],
      sort: "number",
      cell: (row) => (
        <span className={cn("num", row.requirementCount === 0 && "text-danger-ink")}>
          {row.requirementCount}
        </span>
      ),
    },
    {
      id: "checked",
      width: "w-[17%]",
      label: OPS_CORRIDORS.tableHead.lastChecked[locale],
      sort: "date",
      cell: (row) => {
        const fresh = freshnessLabel(row, locale);
        return <span className={fresh.tone}>{fresh.text}</span>;
      },
    },
  ];

  return (
    <DataTable
      className="mt-6"
      rows={rows}
      rowKey={(row) => row.id}
      numbered
      columns={columns}
      label={OPS_CORRIDORS.allVersionsPanel[locale]}
      basePath="/ops/corridors"
      sort={sort}
      dir={dir}
      locale={locale}
      total={total}
      unfilteredTotal={unfilteredTotal}
      toolbar={{
        placeholder: OPS_CORRIDORS.searchPlaceholder[locale],
        filters: [
          {
            param: "state",
            label: OPS_CORRIDORS.anyState[locale],
            options: corridorStateFilters(locale),
          },
          {
            param: "purpose",
            label: OPS_CORRIDORS.anyPurpose[locale],
            options: purposes.map((p) => ({
              value: p,
              label: OPS_COMMON.purpose[p][locale],
            })),
          },
        ],
      }}
      pagination={pagination}
      empty={
        <p className="t-muted max-w-[62ch]">
          {OPS_CORRIDORS.emptyPrefix[locale]} <code>npm run db:seed</code>
          {OPS_CORRIDORS.emptyMiddle[locale]} <code>scripts/draft-corridor.mts</code>.
        </p>
      }
    />
  );
}
