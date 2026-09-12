"use client";

import Link from "next/link";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { CorridorRow } from "@/lib/data/corridors";
import {
  CORRIDOR_STATE_VARIANT,
  corridorStateFilters,
  countryName,
  freshnessLabel,
  stateLabel,
  type CorridorSort,
} from "@/lib/domain/corridor-table";
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
  params,
  purposes,
  total,
  unfilteredTotal,
  filteredLabel,
  pagination,
}: {
  rows: CorridorRow[];
  locale: Locale;
  sort: CorridorSort;
  dir: SortDir;
  params: Record<string, string | undefined>;
  /** Every purpose present in the data, so the filter offers only real ones. */
  purposes: CorridorRow["purpose"][];
  total: number;
  unfilteredTotal: number;
  filteredLabel?: string;
  pagination: { page: number; pageCount: number; size: number };
}) {
  const columns: DataColumn<CorridorRow>[] = [
    {
      id: "route",
      width: "w-[26%]",
      label: OPS_CORRIDORS.tableHead.route[locale],
      sortable: true,
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
      sortable: true,
      cell: (row) => OPS_COMMON.purpose[row.purpose][locale],
    },
    {
      id: "version",
      width: "w-[10%]",
      label: OPS_CORRIDORS.tableHead.version[locale],
      sortable: true,
      className: "num",
      cell: (row) => `v${row.version}`,
    },
    {
      id: "state",
      width: "w-[19%]",
      label: OPS_CORRIDORS.tableHead.state[locale],
      sortable: true,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={CORRIDOR_STATE_VARIANT[row.reviewState]}>
            {stateLabel(row.reviewState, locale)}
          </Badge>
          {/* Live is a separate fact from approved: a superseded version
              stays approved for the record and stops being served. */}
          {row.isLive && <Badge variant="brand">{OPS_COMMON.live[locale]}</Badge>}
        </div>
      ),
    },
    {
      id: "documents",
      width: "w-[13%]",
      label: OPS_CORRIDORS.tableHead.documents[locale],
      sortable: true,
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
      sortable: true,
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
      filteredLabel={filteredLabel}
      countLabel={OPS_CORRIDORS.rowsWord[locale]}
      basePath="/ops/corridors"
      params={params}
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
