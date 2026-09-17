"use client";

import Link from "next/link";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { leadsFirst } from "@/lib/domain/sort-options";
import { Badge } from "@/components/ui/badge";
import { KYB_STANDING } from "@/components/ops/kyb-standing";
import type { KybQueueRow } from "@/lib/data/kyb";
import { AgencyStatusBadge } from "@/components/ops/agency-status-badge";
import { kybQueueStatus, kybStandingFilters, type KybSort } from "@/lib/domain/kyb-table";
import type { SortDir } from "@/lib/domain/sorting";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_KYB } from "@/lib/i18n/ops-kyb";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";
import { formatDate } from "@/lib/format/date";

/**
 * The verification queue, as columns over the shared `DataTable`.
 *
 * A client module holding nothing but column definitions, for the reason
 * `TenantsTable` gives: a column's `cell` is a function and the page
 * above is a server component, so only the rows come down.
 *
 * The page sorts by `added`, newest first, unless the sort control says
 * otherwise — the client asked for that on 2026-09-11, replacing
 * `kybQueue`'s own "owed a decision first" order as the default. A
 * reviewer after the rows waiting on them has the Status filter and the
 * "Ready first" sort.
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
  total,
  unfilteredTotal,
  pagination,
}: {
  rows: KybQueueRow[];
  locale: Locale;
  className?: string;
  sort?: KybSort;
  dir?: SortDir;
  total?: number;
  unfilteredTotal?: number;
  pagination?: { page: number; pageCount: number; size: number };
}) {
  const columns: DataColumn<KybQueueRow>[] = [
    {
      id: "agency",
      label: OPS_KYB.tableHead.agency[locale],
      sort: "text",
      width: "w-[40%]",
      floor: "min-w-[9rem]",
      cell: (row) => (
        <Link
          href={`/ops/kyb/${row.orgId}`}
          title={row.name}
          className="block truncate font-semibold text-brand-text hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      id: "progress",
      label: OPS_KYB.tableHead.progress[locale],
      sort: "number",
      className: "num",
      // The bare fraction, not a bar. A bar would need a legend to say
      // whether a rejected row counts, and the fraction simply does not
      // raise the question.
      cell: (row) => `${row.verified} / ${row.total}`,
    },
    {
      id: "standing",
      label: OPS_KYB.tableHead.standing[locale],
      // Ranked ready → in review → not started → activated → suspended
      // (`kybSortKey`), so the options name which end leads.
      sort: {
        asc: leadsFirst(OPS_KYB.standing.ready[locale], locale),
        desc: leadsFirst(OPS_TENANTS.status.suspended[locale], locale),
      },
      pill: {
        labels: [
          ...Object.values(OPS_KYB.standing).map((l) => l[locale]),
          OPS_TENANTS.status.suspended[locale],
        ],
      },
      cell: (row) => {
        // One pill. A suspended agency owes nobody a decision, so it says
        // why it is not near the top rather than printing a standing and
        // a second "Suspended" pill beside it. The word and colour are
        // the Agencies screen's own (`AgencyStatusBadge`), since it is
        // the same state.
        if (kybQueueStatus(row) === "suspended") {
          return <AgencyStatusBadge status="suspended" locale={locale} />;
        }
        const standing = KYB_STANDING[row.standing];
        return (
          <Badge variant={standing.variant}>{OPS_KYB.standing[standing.key][locale]}</Badge>
        );
      },
    },
    {
      id: "added",
      label: OPS_KYB.tableHead.added[locale],
      sort: "date",
      className: "t-muted",
      cell: (row) => formatDate(row.createdAt, locale),
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
      basePath="/ops/kyb"
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
