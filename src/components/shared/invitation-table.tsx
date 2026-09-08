"use client";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { InvitationStatusBadge } from "@/components/shared/status-badge";
import {
  ResendInvitationButton,
  RevokeInvitationButton,
  type ResendResult,
  type RevokeResult,
} from "@/components/shared/invitation-actions";
import type { ListedInvitation } from "@/lib/data/invitations";
import type { SortDir } from "@/lib/domain/sorting";
import type { StaffSort } from "@/lib/domain/invitation-table";
import { INVITATION_STATUS_COPY } from "@/lib/i18n/status";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_STAFF } from "@/lib/i18n/ops-staff";

function formatDay(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Who has been asked to work at BeOrchid, as columns over `DataTable`.
 *
 * A sibling of `InvitationRoster` rather than a `variant` on it. The
 * roster still renders on the two agency screens, which the client
 * scoped out of the console table treatment (guideline §1) — and one
 * component carrying both a card list and a data table would be two
 * layouts sharing nothing but a props object.
 *
 * The lifecycle sentence the roster prints under each name is dropped
 * here on purpose: a table has a column for the date, and the sentence
 * was doing the job a column header does.
 */
export function InvitationTable({
  rows,
  locale,
  sort,
  dir,
  params,
  total,
  unfilteredTotal,
  filteredLabel,
  pagination,
  resendAction,
  revokeAction,
}: {
  rows: ListedInvitation[];
  locale: Locale;
  sort: StaffSort;
  dir: SortDir;
  params: Record<string, string | undefined>;
  total: number;
  unfilteredTotal: number;
  filteredLabel?: string;
  pagination: { page: number; pageCount: number; size: number };
  resendAction: (formData: FormData) => Promise<ResendResult>;
  revokeAction: (formData: FormData) => Promise<RevokeResult>;
}) {
  const columns: DataColumn<ListedInvitation>[] = [
    {
      id: "person",
      label: OPS_STAFF.tableHead.person[locale],
      sortable: true,
      cell: (invite) => (
        <>
          <p className="t-title truncate" title={invite.email}>
            {invite.fullName || invite.email}
          </p>
          {invite.fullName && (
            <span className="special block truncate">{invite.email}</span>
          )}
        </>
      ),
    },
    {
      id: "rank",
      label: OPS_STAFF.tableHead.rank[locale],
      sortable: true,
      cell: (invite) => OPS_COMMON.staffRole[invite.staffRank ?? "reviewer"][locale],
    },
    {
      id: "status",
      label: OPS_STAFF.tableHead.status[locale],
      sortable: true,
      cell: (invite) => (
        <InvitationStatusBadge status={invite.status} locale={locale} />
      ),
    },
    {
      id: "invited",
      label: OPS_STAFF.tableHead.invited[locale],
      sortable: true,
      className: "num whitespace-nowrap",
      cell: (invite) => formatDay(invite.createdAt),
    },
    {
      id: "actions",
      label: OPS_STAFF.tableHead.actions[locale],
      labelHidden: true,
      align: "end",
      cell: (invite) =>
        invite.status === "pending" ? (
          <div className="flex items-center justify-end gap-1">
            <ResendInvitationButton
              invitationId={invite.id}
              email={invite.email}
              action={resendAction}
            />
            <RevokeInvitationButton
              invitationId={invite.id}
              email={invite.email}
              action={revokeAction}
            />
          </div>
        ) : null,
    },
  ];

  return (
    <DataTable
      className="mt-8 mb-16"
      rows={rows}
      rowKey={(invite) => invite.id}
      columns={columns}
      label={OPS_STAFF.colleaguesPanel[locale]}
      filteredLabel={filteredLabel}
      basePath="/ops/staff"
      params={params}
      sort={sort}
      dir={dir}
      locale={locale}
      total={total}
      unfilteredTotal={unfilteredTotal}
      toolbar={{
        placeholder: OPS_STAFF.searchPlaceholder[locale],
        filters: [
          {
            param: "status",
            label: OPS_STAFF.anyStatus[locale],
            // Every status the enum has, because the copy record is
            // keyed on `InvitationStatus` — so a status added there
            // reaches this filter without anybody remembering to list it.
            options: Object.entries(INVITATION_STATUS_COPY).map(
              ([value, copy]) => ({
                value,
                // The badge's own word, in the reader's language, so the
                // filter and the cell it filters on never disagree. See
                // `staffSortKey`.
                label: copy.label[locale],
              })
            ),
          },
          {
            param: "rank",
            label: OPS_STAFF.anyRank[locale],
            options: (["owner", "reviewer"] as const).map((value) => ({
              value,
              label: OPS_COMMON.staffRole[value][locale],
            })),
          },
        ],
      }}
      pagination={pagination}
      empty={<p className="t-muted max-w-[62ch]">{OPS_STAFF.invitationsEmpty[locale]}</p>}
    />
  );
}
