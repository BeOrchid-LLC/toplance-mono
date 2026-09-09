"use client";

import Link from "next/link";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { KYB_STANDING } from "@/components/ops/kyb-standing";
import type { KybQueueRow } from "@/lib/data/kyb";
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
 * The rows arrive oldest-first from `kybQueue` and are not re-sorted
 * here. Sorting a queue by how far along its rows are buries the one
 * that has been waiting longest, which is the row it exists to surface.
 */
export function KybTable({
  rows,
  locale,
  className,
}: {
  rows: KybQueueRow[];
  locale: Locale;
  className?: string;
}) {
  const columns: DataColumn<KybQueueRow>[] = [
    {
      id: "agency",
      label: OPS_KYB.tableHead.agency[locale],
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
      className: "num",
      // The bare fraction, not a bar. A bar would need a legend to say
      // whether a rejected row counts, and the fraction simply does not
      // raise the question.
      cell: (row) => `${row.verified} / ${row.total}`,
    },
    {
      id: "standing",
      label: OPS_KYB.tableHead.standing[locale],
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
      className: "t-muted",
      cell: (row) => row.createdAt.toISOString().slice(0, 10),
    },
  ];

  return (
    <DataTable
      className={className}
      rows={rows}
      rowKey={(row) => row.orgId}
      columns={columns}
      locale={locale}
      total={rows.length}
      unfilteredTotal={rows.length}
      label={OPS_KYB.queuePanel[locale]}
      countLabel={OPS_KYB.agenciesWord[locale]}
      empty={<p className="t-muted max-w-[62ch]">{OPS_KYB.emptyQueue[locale]}</p>}
    />
  );
}
