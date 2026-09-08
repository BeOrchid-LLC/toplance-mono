import Link from "next/link";

import { TakeCaseButton } from "@/components/agency/take-case-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SortHead } from "@/components/shared/sort-head";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
}) {
  const shown = count ?? rows.length;
  const sortable = sort !== undefined && dir !== undefined && basePath !== undefined;

  const head = (column: ClientSort, text: string, className?: string) =>
    sortable ? (
      <SortHead
        key={column}
        label={text}
        column={column}
        sort={sort}
        dir={dir}
        basePath={basePath}
        params={params ?? {}}
        className={className}
      />
    ) : (
      <TableHead key={column} className={className}>
        {text}
      </TableHead>
    );

  return (
    <Panel className={className}>
      <PanelHeader
        label={label ?? AGENCY.yourClientsLabel[locale]}
        aside={
          <Badge variant="brand">
            <span className="num">{shown}</span>
            {(shown === 1 ? AGENCY.clientWord : AGENCY.clientsWord)[locale]}
          </Badge>
        }
      />

      {rows.length === 0 ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">
            {empty ?? AGENCY.rosterEmpty[locale]}
          </p>
        </PanelBody>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {head("client", AGENCY.tableHead.client[locale])}
              {head("route", AGENCY.tableHead.route[locale])}
              {head("documents", AGENCY.tableHead.documents[locale])}
              {head("status", AGENCY.tableHead.status[locale])}
              {head("submitted", AGENCY.tableHead.submitted[locale])}
              {takeableBy && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const destination = countryFromIso2(r.destinationIso);
              const pct = r.completionPct ?? 0;

              return (
                <TableRow key={r.id}>
                  <TableCell>
                    {takeableBy ? (
                      <>
                        <p className="t-title truncate" title={r.fullName ?? ""}>
                          {r.fullName}
                        </p>
                        <span className="special block">{r.caseRef}</span>
                      </>
                    ) : (
                      /* The reference is inside the link, not beside it.
                         It is how staff name a case to each other, so it
                         belongs to the thing that opens it — which also
                         makes the link announce which case it opens
                         rather than only whose it is. */
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
                    )}
                  </TableCell>

                  <TableCell>
                    <span className="block truncate">
                      {destination?.name ??
                        r.destinationIso?.toUpperCase() ??
                        AGENCY.routeNotSet[locale]}
                    </span>
                    <span
                      className="special block truncate"
                      title={r.visaName ?? ""}
                    >
                      {r.visaName ?? AGENCY.routeNotSet[locale]}
                    </span>
                  </TableCell>

                  <TableCell>
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
                  </TableCell>

                  <TableCell>
                    {r.status && <StatusBadge status={r.status} short />}
                  </TableCell>

                  <TableCell className="t-muted">
                    {/* The same ISO date the platform console's tables
                        print. A console is read across ten locales and a
                        localised short date is the one format that means
                        two different days to two readers. */}
                    {r.submittedAt
                      ? r.submittedAt.toISOString().slice(0, 10)
                      : AGENCY.dateNotSubmitted[locale]}
                  </TableCell>

                  {takeableBy && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        {/* The one door into an unheld case that is not
                            claiming it. `reachesThread` opens the
                            conversation to the whole agency, so a
                            traveller's question is answerable without
                            somebody taking a client to find out what it
                            was. The case screen still refuses them, which
                            is why this points at the thread route. */}
                        <Link
                          href={`/agency/clients/${r.id}/messages`}
                          className="font-semibold text-brand-text hover:underline"
                        >
                          {MESSAGES.panelLabel[locale]}
                        </Link>
                        <TakeCaseButton applicationId={r.id} viewerId={takeableBy} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
