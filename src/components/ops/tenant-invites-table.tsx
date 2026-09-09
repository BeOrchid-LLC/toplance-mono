"use client";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import type { TenantPendingInvite } from "@/lib/data/tenants";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";
import { cn } from "@/lib/utils";

/**
 * One agency's unanswered invitations, as columns over `DataTable`.
 *
 * A client module for the same reason as its siblings: `cell` is a
 * function, and the detail page above is a server component.
 */
export function TenantInvitesTable({
  rows,
  locale,
  /** What the panel badge counts — the agency's own pending total. */
  pendingCount,
  className,
}: {
  rows: TenantPendingInvite[];
  locale: Locale;
  pendingCount: number;
  className?: string;
}) {
  const columns: DataColumn<TenantPendingInvite>[] = [
    {
      id: "email",
      label: OPS_TENANTS.invitesHead.email[locale],
      cell: (i) => (
        <>
          {i.email}
          {i.fullName && <span className="t-muted block">{i.fullName}</span>}
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
      cell: (i) => i.createdAt.toISOString().slice(0, 10),
    },
    {
      id: "expires",
      label: OPS_TENANTS.invitesHead.expires[locale],
      cell: (i) => (
        <span className={cn("t-muted", i.expired && "text-danger-ink")}>
          {i.expiresAt.toISOString().slice(0, 10)}
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
      total={rows.length}
      unfilteredTotal={rows.length}
      // The live count, not the row count: the panel is titled "Pending
      // invitations", and an expired row is listed below (nothing here
      // can resend one, so the operator needs to see it) but labelled
      // rather than counted. Same number the agencies list shows.
      count={pendingCount}
      label={OPS_TENANTS.invitesPanel[locale]}
      countLabel=""
      empty={<p className="t-muted max-w-[62ch]">{OPS_TENANTS.emptyInvites[locale]}</p>}
    />
  );
}
