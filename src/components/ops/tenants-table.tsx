"use client";

import Link from "next/link";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { TenantRow } from "@/lib/data/tenants";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

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
}: {
  rows: TenantRow[];
  locale: Locale;
  className?: string;
}) {
  const columns: DataColumn<TenantRow>[] = [
    {
      id: "agency",
      label: OPS_TENANTS.tableHead.agency[locale],
      cell: (t) => (
        <>
          <Link
            href={`/ops/tenants/${t.id}`}
            className="font-semibold text-brand-text hover:underline"
          >
            {t.name}
          </Link>
          {t.domain && <span className="t-muted block">{t.domain}</span>}
        </>
      ),
    },
    {
      id: "members",
      label: OPS_TENANTS.tableHead.members[locale],
      className: "num",
      cell: (t) => `${t.members} ${OPS_TENANTS.seatsOf[locale]} ${t.seatsPurchased}`,
    },
    {
      id: "applications",
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
      label: OPS_TENANTS.tableHead.state[locale],
      cell: (t) => (
        <Badge variant={t.suspendedAt ? "warning" : "success"}>
          {t.suspendedAt ? OPS_TENANTS.suspendedBadge[locale] : OPS_TENANTS.live[locale]}
        </Badge>
      ),
    },
    {
      id: "added",
      label: OPS_TENANTS.tableHead.added[locale],
      className: "t-muted",
      cell: (t) => t.createdAt.toISOString().slice(0, 10),
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
      total={rows.length}
      unfilteredTotal={rows.length}
      label={OPS_TENANTS.tenantsPanel[locale]}
      countLabel={OPS_TENANTS.agenciesWord[locale]}
      empty={<p className="t-muted max-w-[62ch]">{OPS_TENANTS.emptyTenants[locale]}</p>}
    />
  );
}
