"use client";

import { InviteStaff } from "@/components/ops/invite-staff";
import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { StaffColleague } from "@/lib/data/staff";
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
 * Who actually works at BeOrchid, as columns over the shared `DataTable`.
 *
 * The half of this screen that was missing. `/ops/staff` opened with
 * "Who works at BeOrchid, and who has been asked to" over a single panel
 * of invitations — so an invitation accepted a month ago still read as
 * an invitation, and there was nowhere at all to see the people holding
 * console accounts today. `InvitationTable` beside it now answers only
 * the second half of that sentence.
 *
 * No toolbar, no sort links, no pager, unlike its neighbour. Both tables
 * live at `/ops/staff` and would write the same `?sort=` and `?q=` into
 * one URL — two controls fighting over one parameter. The roster is also
 * a list of colleagues rather than a queue: it is read down in one go,
 * and BeOrchid would have to grow a great deal before that stopped being
 * true. Give this one its own params when it does.
 *
 * The invite button rides in the panel header rather than the console
 * bar, at the client's request on 2026-09-08. It makes a row in the
 * table below it and nothing else on the screen, which is the test
 * `PanelHeader`'s right-hand slot sets.
 */
export function ColleaguesTable({
  rows,
  locale,
  className,
}: {
  rows: StaffColleague[];
  locale: Locale;
  className?: string;
}) {
  const columns: DataColumn<StaffColleague>[] = [
    {
      id: "person",
      label: OPS_STAFF.tableHead.person[locale],
      cell: (person) => (
        <>
          <p className="t-title truncate" title={person.email}>
            {person.fullName || person.email}
          </p>
          {person.fullName && (
            <span className="special block truncate">{person.email}</span>
          )}
        </>
      ),
    },
    {
      id: "rank",
      label: OPS_STAFF.tableHead.rank[locale],
      // A director is the rank that can approve a corridor and invite
      // the next colleague, so it is the one worth picking out of a
      // column somebody scans. A reviewer reads as plain text because
      // that is the ordinary case, and a badge on every row is
      // decoration.
      cell: (person) =>
        person.staffRole === "owner" ? (
          <Badge variant="brand">{OPS_COMMON.staffRole.owner[locale]}</Badge>
        ) : (
          OPS_COMMON.staffRole.reviewer[locale]
        ),
    },
    {
      id: "joined",
      label: OPS_STAFF.tableHead.joined[locale],
      className: "num whitespace-nowrap",
      cell: (person) => formatDay(person.createdAt),
    },
  ];

  return (
    <DataTable
      className={className}
      rows={rows}
      rowKey={(person) => person.id}
      numbered
      columns={columns}
      label={OPS_STAFF.colleaguesPanel[locale]}
      locale={locale}
      total={rows.length}
      unfilteredTotal={rows.length}
      action={<InviteStaff />}
      empty={<p className="t-muted max-w-[62ch]">{OPS_STAFF.colleaguesEmpty[locale]}</p>}
    />
  );
}
