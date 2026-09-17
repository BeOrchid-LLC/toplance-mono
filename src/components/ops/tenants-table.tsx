"use client";

import Link from "next/link";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { leadsFirst } from "@/lib/domain/sort-options";
import { Badge } from "@/components/ui/badge";
import type { TenantRow } from "@/lib/data/tenants";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";
import { formatDate } from "@/lib/format/date";

/**
 * Every agency on the platform, as columns over the shared `DataTable`.
 *
 * A client module holding nothing but column definitions, because a
 * column's `cell` is a function and the page above is a server
 * component. The query stays up there; only the rows come down.
 */
export function TenantsTable({
  rows,
  locale,
  className,
  sort,
  dir,
  total,
  unfilteredTotal,
  pagination,
}: {
  /** The current page of agencies: already filtered, sorted and sliced. */
  rows: TenantRow[];
  locale: Locale;
  className?: string;
  sort?: string;
  dir?: "asc" | "desc";
  total?: number;
  unfilteredTotal?: number;
  pagination?: { page: number; pageCount: number; size: number };
}) {
  const columns: DataColumn<TenantRow>[] = [
    {
      id: "agency",
      sort: "text",
      label: OPS_TENANTS.tableHead.agency[locale],
      width: "w-[28%]",
      // An agency's name and domain are whatever was typed at
      // provisioning; see `DataColumn.floor`.
      floor: "min-w-[9rem]",
      cell: (t) => (
        <>
          <Link
            href={`/ops/tenants/${t.id}`}
            title={t.name}
            className="block truncate font-semibold text-brand-text hover:underline"
          >
            {t.name}
          </Link>
          {t.domain && (
            <span className="t-muted block truncate" title={t.domain}>
              {t.domain}
            </span>
          )}
        </>
      ),
    },
    {
      id: "members",
      sort: "number",
      label: OPS_TENANTS.tableHead.members[locale],
      className: "num",
      cell: (t) => String(t.members),
    },
    {
      id: "applications",
      sort: "number",
      label: OPS_TENANTS.tableHead.applications[locale],
      className: "num",
      cell: (t) => t.applicationsTotal,
    },
    {
      id: "progress",
      label: OPS_TENANTS.tableHead.progress[locale],
      className: "t-muted",
      cell: (t) => (
        <>
          {/* Four numbers, not four badges: this is a scan column, and
              colour here would compete with the state pill beside it. */}
          <span className="num">{t.inProgress}</span> ·{" "}
          <span className="num">{t.withReviewer}</span> ·{" "}
          <span className="num">{t.approved}</span> ·{" "}
          <span className="num">{t.rejected}</span>
        </>
      ),
    },
    {
      id: "state",
      // Ordered live-then-suspended (`tenantSortKey`), not by the
      // words, so the options name which state leads.
      sort: {
        asc: leadsFirst(OPS_TENANTS.live[locale], locale),
        desc: leadsFirst(OPS_TENANTS.suspendedBadge[locale], locale),
      },
      label: OPS_TENANTS.tableHead.state[locale],
      cell: (t) => (
        <Badge variant={t.suspendedAt ? "warning" : "success"}>
          {t.suspendedAt ? OPS_TENANTS.suspendedBadge[locale] : OPS_TENANTS.live[locale]}
        </Badge>
      ),
    },
    {
      id: "added",
      sort: "date",
      label: OPS_TENANTS.tableHead.added[locale],
      className: "t-muted",
      cell: (t) => formatDate(t.createdAt, locale),
    },
  ];

  return (
    <DataTable
      className={className}
      rows={rows}
      rowKey={(t) => t.id}
      numbered
      columns={columns}
      locale={locale}
      total={total ?? rows.length}
      unfilteredTotal={unfilteredTotal ?? rows.length}
      label={OPS_TENANTS.tenantsPanel[locale]}
      basePath="/ops/tenants"
      sort={sort}
      dir={dir}
      pagination={pagination}
      toolbar={{
        placeholder: OPS_TENANTS.searchPlaceholder[locale],
        filters: [
          {
            param: "state",
            label: OPS_TENANTS.anyStatus[locale],
            options: [
              { value: "live", label: OPS_TENANTS.live[locale] },
              { value: "suspended", label: OPS_TENANTS.suspendedBadge[locale] },
            ],
          },
        ],
      }}
      empty={<p className="t-muted max-w-[62ch]">{OPS_TENANTS.emptyTenants[locale]}</p>}
    />
  );
}
