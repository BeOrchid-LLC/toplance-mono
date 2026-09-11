"use client";

import Link from "next/link";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { KYB_STANDING } from "@/components/ops/kyb-standing";
import type { KybQueueRow } from "@/lib/data/kyb";
import { kybStandingFilters, type KybSort } from "@/lib/domain/kyb-table";
import type { SortDir } from "@/lib/domain/sorting";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_KYB } from "@/lib/i18n/ops-kyb";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

/**
 * The verification queue, as columns over the shared `DataTable`.
 *
 * A client module holding nothing but column definitions, for the reason
 * `TenantsTable` gives: a column's `cell` is a function and the page
 * above is a server component, so only the rows come down.
 *
 * The page sorts by `added`, newest first, unless a header says
 * otherwise — the client asked for that on 2026-09-11, replacing
 * `kybQueue`'s own "owed a decision first" order as the default. A
 * reviewer after the rows waiting on them has the Status filter and the
 * Status header, which ranks `ready` first.
 *
 * The search, the standing filter and the pager arrived on 2026-09-09,
 * with the rest of the console: the client asked for them on every
 * admin table on 8 September, and this queue was written after that
 * pass and missed it.
 */
export function KybTable({
  rows,
  locale,
  className,
  sort,
  dir,
  params,
  total,
  unfilteredTotal,
  filteredLabel,
  pagination,
}: {
  rows: KybQueueRow[];
  locale: Locale;
  className?: string;
  sort?: KybSort;
  dir?: SortDir;
  params?: Record<string, string | undefined>;
  total?: number;
  unfilteredTotal?: number;
  filteredLabel?: string;
  pagination?: { page: number; pageCount: number; size: number };
}) {
  const columns: DataColumn<KybQueueRow>[] = [
    {
      id: "agency",
      label: OPS_KYB.tableHead.agency[locale],
      sortable: true,
      cell: (row) => (
        <Link
          href={`/ops/kyb/${row.orgId}`}
          className="font-semibold text-brand-text hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      id: "progress",
      label: OPS_KYB.tableHead.progress[locale],
      sortable: true,
      className: "num",
      // The bare fraction, not a bar. A bar would need a legend to say
      // whether a rejected row counts, and the fraction simply does not
      // raise the question.
      cell: (row) => `${row.verified} / ${row.total}`,
    },
    {
      id: "standing",
      label: OPS_KYB.tableHead.standing[locale],
      sortable: true,
      cell: (row) => {
        const standing = KYB_STANDING[row.standing];
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={standing.variant}>
              {OPS_KYB.standing[standing.key][locale]}
            </Badge>
            {/* A suspended agency sorts with the settled rows and owes
                nobody a decision, so it must say why it is not near the
                top — otherwise "Not started" at the bottom of the list
                reads as a row somebody forgot.

                `OPS_TENANTS.suspendedBadge` rather than a word of our
                own: it is the same state on the adjacent screen, and
                `ops-tenants.ts` says it plainly — a second copy of a
                word is a word that will disagree with itself. */}
            {row.suspendedAt && (
              <Badge variant="warning">{OPS_TENANTS.suspendedBadge[locale]}</Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "added",
      label: OPS_KYB.tableHead.added[locale],
      sortable: true,
      className: "t-muted",
      cell: (row) => row.createdAt.toISOString().slice(0, 10),
    },
  ];

  return (
    <DataTable
      className={className}
      rows={rows}
      rowKey={(row) => row.orgId}
      numbered
      columns={columns}
      locale={locale}
      total={total ?? rows.length}
      unfilteredTotal={unfilteredTotal ?? rows.length}
      label={OPS_KYB.queuePanel[locale]}
      filteredLabel={filteredLabel}
      countLabel={OPS_KYB.agenciesWord[locale]}
      basePath="/ops/kyb"
      params={params}
      sort={sort}
      dir={dir}
      pagination={pagination}
      toolbar={{
        placeholder: OPS_KYB.searchPlaceholder[locale],
        filters: [
          {
            param: "standing",
            label: OPS_KYB.anyStanding[locale],
            options: kybStandingFilters(locale),
          },
        ],
      }}
      empty={<p className="t-muted max-w-[62ch]">{OPS_KYB.emptyQueue[locale]}</p>}
    />
  );
}
