"use client";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import type { TenantPendingInvite } from "@/lib/data/tenants";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format/date";

/**
 * One agency's unanswered invitations, as columns over `DataTable`.
 *
 * A client module for the same reason as its siblings: `cell` is a
 * function, and the detail page above is a server component.
 */
export function TenantInvitesTable({
  rows,
  locale,
  className,
  basePath,
  total,
  unfilteredTotal,
}: {
  /** The invitations left after the toolbar, already filtered. */
  rows: TenantPendingInvite[];
  locale: Locale;
  className?: string;
  /** This agency's own address — the toolbar writes its query onto it. */
  basePath?: string;
  total?: number;
  unfilteredTotal?: number;
}) {
  const columns: DataColumn<TenantPendingInvite>[] = [
    {
      id: "email",
      label: OPS_TENANTS.invitesHead.email[locale],
      // An invited address carries its token; see `DataColumn.floor`.
      floor: "min-w-[10rem]",
      cell: (i) => (
        <>
          <span className="block truncate" title={i.email}>
            {i.email}
          </span>
          {i.fullName && (
            <span className="t-muted block truncate" title={i.fullName}>
              {i.fullName}
            </span>
          )}
        </>
      ),
    },
    {
      id: "kind",
      label: OPS_TENANTS.invitesHead.kind[locale],
      cell: (i) =>
        i.kind === "staff" ? OPS_TENANTS.kindStaff[locale] : OPS_TENANTS.kindClient[locale],
    },
    {
      id: "sent",
      label: OPS_TENANTS.invitesHead.sent[locale],
      className: "t-muted",
      cell: (i) => formatDate(i.createdAt, locale),
    },
    {
      id: "expires",
      label: OPS_TENANTS.invitesHead.expires[locale],
      cell: (i) => (
        <span className={cn("t-muted", i.expired && "text-danger-ink")}>
          {formatDate(i.expiresAt, locale)}
          {/* Colour alone said this to sighted readers only, and said it
              in a language nobody translated. */}
          {i.expired && <span className="block">{OPS_TENANTS.inviteExpired[locale]}</span>}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      className={className}
      rows={rows}
      rowKey={(i) => i.id}
      numbered
      columns={columns}
      locale={locale}
      total={total ?? rows.length}
      unfilteredTotal={unfilteredTotal ?? rows.length}
      basePath={basePath}
      toolbar={
        basePath
          ? {
              placeholder: OPS_TENANTS.inviteSearchPlaceholder[locale],
              filters: [
                {
                  param: "kind",
                  label: OPS_TENANTS.anyKind[locale],
                  options: [
                    { value: "client", label: OPS_TENANTS.kindClient[locale] },
                    { value: "staff", label: OPS_TENANTS.kindStaff[locale] },
                  ],
                },
              ],
            }
          : undefined
      }
      label={OPS_TENANTS.invitesPanel[locale]}
      empty={<p className="t-muted max-w-[62ch]">{OPS_TENANTS.emptyInvites[locale]}</p>}
    />
  );
}
