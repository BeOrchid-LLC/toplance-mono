"use client";

import Link from "next/link";

import { TakeCaseButton } from "@/components/agency/take-case-button";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { type ToolbarFilter } from "@/components/shared/table-toolbar";
import { StatusBadge } from "@/components/shared/status-badge";
import { countryFromIso2 } from "@/lib/domain/corridors";
import type { SortDir } from "@/lib/domain/sorting";
import type { ApplicationStatus } from "@/lib/domain/status";
import { AGENCY } from "@/lib/i18n/agency";
import { fill } from "@/lib/i18n/fill";
import { MESSAGES } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locales";

/**
 * One person on the roster, as `org_application_progress` returns them.
 *
 * Named structurally rather than inferred from the view, so the shape
 * this component may render is written down: there is no document
 * column here, and there is no column that could carry one. That is the
 * privacy promise the laminate makes, expressed as a type.
 */
export type RosterRow = {
  id: string;
  caseRef: string;
  fullName: string;
  status: ApplicationStatus;
  destinationIso: string | null;
  visaName: string | null;
  /** `null` until the traveller sends the file. Sorts and filters on it. */
  submittedAt: Date | null;
  documentsTotal: number | null;
  documentsVerified: number | null;
  completionPct: number | null;
};

/** The columns `/agency/clients` will order by, as `readSort`'s allow-list. */
export const CLIENT_SORTS = [
  "client",
  "route",
  "documents",
  "status",
  "submitted",
] as const;

export type ClientSort = (typeof CLIENT_SORTS)[number];

/**
 * The clients this agency is handling.
 *
 * A table, since the client's 7 September review: "what we want to
 * achieve here is a table that works excellently for numerous
 * applications". This was ruled rows before, on the argument that four
 * columns and a progress bar have no honest 390px form — which is true,
 * and is why `Table` scrolls its container below `lg` rather than
 * collapsing into unlabelled fragments. The guideline reading that came
 * with it does not survive contact with §6, which prefers rules to
 * *boxes* and says nothing about tables; `/ops/corridors` and
 * `/ops/tenants` have both been tables under the same guideline since
 * #68.
 *
 * Columns over the shared `DataTable` since 2026-09-08, rather than a
 * panel, header, badge, toolbar and table of its own. What it had that
 * `DataTable` did not was nothing; what `DataTable` has that it did not
 * is the two empty states — "no clients yet" and "nothing matched that
 * search" are different facts, and `/agency/clients` was carrying the
 * second one as a hand-built panel beside this component rather than
 * inside it.
 *
 * Client-side for the reason `DataTable` gives: a column's `cell` is a
 * function and cannot cross the server boundary. The rows still arrive
 * filtered, sorted and sliced by the page above.
 *
 * Sorting is the page's, not this component's: it arrives already
 * ordered, and `sort`/`dir` are passed only so the headers can render
 * which way they point. Omit them and the headers are plain — the
 * dashboard's two desk lists are short and have no URL to sort in.
 */
export function ClientRoster({
  rows,
  locale,
  label,
  empty,
  className,
  takeableBy,
  sort,
  dir,
  basePath,
  params,
  count,
  total,
  unfilteredTotal,
  toolbar,
}: {
  rows: RosterRow[];
  locale: Locale;
  /**
   * What this particular slice of the roster is. The clients page shows
   * the whole of it; a reviewer's dashboard shows the same rows cut two
   * ways — theirs, and the ones nobody has taken — and calling both
   * "Your clients" would be three lists claiming to be the same one.
   */
  label?: string;
  empty?: string;
  className?: string;
  /**
   * The viewer's own id, when these are cases they may take but not yet
   * open. The name stops being a link — the case screen would refuse
   * them — and the row carries the two things that are theirs instead:
   * the thread, and the claim.
   */
  takeableBy?: string;
  /** Present together, or not at all: the sort this table is showing. */
  sort?: ClientSort;
  dir?: SortDir;
  basePath?: string;
  params?: Record<string, string | undefined>;
  /** Overrides the badge figure when the list has been narrowed. */
  count?: number;
  /**
   * Rows after filtering across every page, and rows before any filter.
   * Both default to what was handed in, which is right for the two
   * dashboard slices: they are the whole of themselves, unfiltered and
   * unpaged. `/agency/clients` passes the real figures, and that is what
   * lets `DataTable` tell an empty roster from an emptied search.
   */
  total?: number;
  unfilteredTotal?: number;
  /**
   * Search and filters for this roster, in the panel header rather than
   * in the console bar. `AdminShell` dropped its search slot in #74 on
   * the grounds that a table's controls belong beside the columns they
   * act on, and `DataTable` puts them here for the same reason.
   *
   * Optional, because the two roster slices on the dashboard filter
   * nothing — a toolbar over a reviewer's own six cases is a control
   * with nothing to do.
   */
  toolbar?: { placeholder: string; filters: ToolbarFilter[] };
}) {
  const shown = count ?? total ?? rows.length;
  const sortable = sort !== undefined && dir !== undefined && basePath !== undefined;

  const columns: DataColumn<RosterRow>[] = [
    {
      id: "client",
      label: AGENCY.tableHead.client[locale],
      sortable,
      cell: (r) =>
        takeableBy ? (
          <>
            <p className="t-title truncate" title={r.fullName ?? ""}>
              {r.fullName}
            </p>
            <span className="special block">{r.caseRef}</span>
          </>
        ) : (
          /* The reference is inside the link, not beside it. It is how
             staff name a case to each other, so it belongs to the thing
             that opens it — which also makes the link announce which
             case it opens rather than only whose it is. */
          <Link
            href={`/agency/clients/${r.id}`}
            className="group/case block"
            title={r.fullName ?? ""}
          >
            <span className="block truncate font-semibold text-brand-text group-hover/case:underline">
              {r.fullName}
            </span>
            <span className="special block">{r.caseRef}</span>
          </Link>
        ),
    },
    {
      id: "route",
      label: AGENCY.tableHead.route[locale],
      sortable,
      cell: (r) => {
        const destination = countryFromIso2(r.destinationIso);
        return (
          <>
            <span className="block truncate">
              {destination?.name ??
                r.destinationIso?.toUpperCase() ??
                AGENCY.routeNotSet[locale]}
            </span>
            <span className="special block truncate" title={r.visaName ?? ""}>
              {r.visaName ?? AGENCY.routeNotSet[locale]}
            </span>
          </>
        );
      },
    },
    {
      id: "documents",
      label: AGENCY.tableHead.documents[locale],
      sortable,
      cell: (r) => {
        const pct = r.completionPct ?? 0;
        return (
          <>
            <div className="flex items-center gap-3">
              <Progress value={pct} className="w-24 flex-none" />
              <span className="num shrink-0 font-semibold">{pct}%</span>
            </div>
            <span className="special block">
              {fill(AGENCY.documentsVerified[locale], {
                verified: r.documentsVerified ?? 0,
                total: r.documentsTotal ?? 0,
              })}
            </span>
          </>
        );
      },
    },
    {
      id: "status",
      label: AGENCY.tableHead.status[locale],
      sortable,
      cell: (r) =>
        r.status ? <StatusBadge status={r.status} locale={locale} short /> : null,
    },
    {
      id: "submitted",
      label: AGENCY.tableHead.submitted[locale],
      sortable,
      className: "t-muted",
      // The same ISO date the platform console's tables print. A console
      // is read across ten locales and a localised short date is the one
      // format that means two different days to two readers.
      cell: (r) =>
        r.submittedAt
          ? r.submittedAt.toISOString().slice(0, 10)
          : AGENCY.dateNotSubmitted[locale],
    },
    ...(takeableBy
      ? [
          {
            id: "actions",
            label: MESSAGES.panelLabel[locale],
            labelHidden: true,
            align: "end" as const,
            cell: (r: RosterRow) => (
              <div className="flex items-center justify-end gap-3">
                {/* The one door into an unheld case that is not claiming
                    it. `reachesThread` opens the conversation to the
                    whole agency, so a traveller's question is answerable
                    without somebody taking a client to find out what it
                    was. The case screen still refuses them, which is why
                    this points at the thread route. */}
                <Link
                  href={`/agency/clients/${r.id}/messages`}
                  className="font-semibold text-brand-text hover:underline"
                >
                  {MESSAGES.panelLabel[locale]}
                </Link>
                <TakeCaseButton applicationId={r.id} viewerId={takeableBy} />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      className={className}
      rows={rows}
      rowKey={(r) => r.id}
      columns={columns}
      label={label ?? AGENCY.yourClientsLabel[locale]}
      count={shown}
      countLabel={(shown === 1 ? AGENCY.clientWord : AGENCY.clientsWord)[locale]}
      basePath={basePath}
      params={params}
      sort={sort}
      dir={dir}
      toolbar={toolbar}
      locale={locale}
      total={total ?? rows.length}
      unfilteredTotal={unfilteredTotal ?? rows.length}
      empty={
        <p className="t-muted max-w-[62ch]">{empty ?? AGENCY.rosterEmpty[locale]}</p>
      }
    />
  );
}
