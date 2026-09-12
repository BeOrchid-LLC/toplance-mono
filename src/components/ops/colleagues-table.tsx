"use client";

import { ColleagueActions } from "@/components/ops/colleague-actions";
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
  allRows,
  viewerId,
  locale,
  className,
  params,
  total,
  unfilteredTotal,
  filteredLabel,
}: {
  /** The colleagues left after the toolbar, already filtered. */
  rows: StaffColleague[];
  /**
   * Every colleague, filter or no filter. `rows` is what the table
   * draws; this is what the row actions decide against, because "is
   * this the last director" is a question about the whole roster and
   * a search box must not be able to change its answer.
   */
  allRows: StaffColleague[];
  /** The director reading the screen — nobody may act on their own row. */
  viewerId: string;
  locale: Locale;
  className?: string;
  params?: Record<string, string | undefined>;
  total?: number;
  unfilteredTotal?: number;
  filteredLabel?: string;
}) {
  const columns: DataColumn<StaffColleague>[] = [
    {
      id: "person",
      width: "w-[30%]",
      className: "max-w-[280px]",
      label: OPS_STAFF.tableHead.person[locale],
      cell: (person) => (
        <>
          <p className="t-title truncate" title={person.email}>
            {person.fullName || person.email}
            {/* Beside the name rather than in a column of its own.
                Suspension is the exception on this roster — one row in
                twenty — and a column would spend width on "live, live,
                live" to say it. It has to be on the screen somewhere:
                a suspension taken here and invisible here is one whose
                only symptom is a colleague saying they cannot sign in. */}
            {person.suspendedAt && (
              <Badge variant="neutral" className="ml-2 align-middle">
                {OPS_STAFF.suspendedBadge[locale]}
              </Badge>
            )}
          </p>
          {person.fullName && (
            <span className="special block truncate">{person.email}</span>
          )}
        </>
      ),
    },
    {
      id: "rank",
      width: "w-[12%]",
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
      width: "w-[14%]",
      label: OPS_STAFF.tableHead.joined[locale],
      className: "num whitespace-nowrap",
      cell: (person) => formatDay(person.createdAt),
    },
    {
      id: "actions",
      // No width hint; `ColleagueActions` is an unshrinkable row of
      // buttons and sizes itself. The 39% this used to carry was that
      // measurement done by hand, and only for English.
      label: OPS_STAFF.tableHead.actions[locale],
      // Hidden, aligned right — the shape `InvitationTable` sets on the
      // same screen. A header over three buttons labels the obvious.
      labelHidden: true,
      align: "end",
      cell: (person) => (
        <ColleagueActions
          colleague={person}
          colleagues={allRows}
          viewerId={viewerId}
          locale={locale}
        />
      ),
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
      filteredLabel={filteredLabel}
      locale={locale}
      total={total ?? rows.length}
      unfilteredTotal={unfilteredTotal ?? rows.length}
      basePath="/ops/staff"
      params={params}
      toolbar={{
        placeholder: OPS_STAFF.colleagueSearchPlaceholder[locale],
        filters: [
          {
            /* `crank`, not `rank`: the invitations table below this one
               already owns `rank` on the same page, and two toolbars
               sharing a parameter would filter each other. */
            param: "crank",
            label: OPS_STAFF.anyRank[locale],
            options: [
              { value: "owner", label: OPS_COMMON.staffRole.owner[locale] },
              { value: "reviewer", label: OPS_COMMON.staffRole.reviewer[locale] },
            ],
          },
        ],
      }}
      action={<InviteStaff />}
      empty={<p className="t-muted max-w-[62ch]">{OPS_STAFF.colleaguesEmpty[locale]}</p>}
    />
  );
}
