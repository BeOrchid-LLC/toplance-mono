import type { Metadata } from "next";

import { AgencyShell } from "@/components/agency/agency-shell";
import { InviteDialog } from "@/components/agency/invite-dialog";
import { ClientRoster } from "@/components/agency/client-roster";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listOrgRoster } from "@/lib/data/organisations";
import { CLIENT_SORTS } from "@/lib/domain/client-table";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { matchesDateWindow, windowCutoff } from "@/lib/domain/date-window";
import { readDir, readPageSize, readSort, resolvePage, sortRows } from "@/lib/domain/sorting";
import type { ApplicationStatus } from "@/lib/domain/status";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { AGENCY } from "@/lib/i18n/agency";
import { STATUS_COPY } from "@/lib/i18n/status";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.navClients[locale] };
}

/**
 * The clients: everyone whose visa this agency is handling.
 *
 * The invitations that have not been accepted yet were a second panel
 * below this one until 2026-09-08, when the client asked for the two to
 * be pages. They are two states of one thing and the old comment here
 * said so — but the roster has since grown a search box, two filters,
 * five sortable columns and a pager, and scrolling past all of it to
 * find out whether an email was answered is one screen doing two jobs.
 * `/agency/clients/invitations` is the second, and the rail row for it
 * sits directly under this one.
 *
 * This stays the section's front door: the roster is what an agency
 * opens the console to look at.
 *
 * The search, the two filters and the sort all live in the query string,
 * for the reasons `TableToolbar` gives: a narrowed roster is a link a
 * director can send to whoever should be working it, and the back button
 * undoes a filter the way it undoes everything else.
 */
export default async function AgencyClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    date?: string;
    sort?: string;
    dir?: string;
    page?: string;
    size?: string;
  }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  const isDirector = membership.role === "owner";

  const params = await searchParams;
  const { q, status, date } = params;
  const search = (q ?? "").trim().toLowerCase();
  const sort = readSort(params.sort, CLIENT_SORTS, "client");
  const dir = readDir(params.dir, "asc");

  // A reviewer's clients are the ones they were given. The agency's
  // whole book is the director's screen — a colleague reaching a client
  // they do not handle is exactly what `handlesCase` refuses, and a
  // roster that lists them anyway is an invitation to try.
  //
  // Same "no org, no unfiltered read" reasoning in both reads:
  // `listOrgRoster` returns early on an empty list, and
  // `listInvitations` has nothing to filter by without one id.
  const rows = await listOrgRoster(
    actor,
    isDirector ? undefined : { handledBy: actor.userId }
  );

  // Any narrowing at all, however many rows survive it — the same
  // distinction `/ops/corridors` draws. A filter matching every row
  // still filtered, and saying "All clients" over it would tell somebody
  // the search box is empty when it is not.
  const narrowed = Boolean(search || status || date);

  // Read once, not per row: `windowCutoff` is where the clock is read,
  // so the filter below stays pure and the whole rule is testable.
  const cutoff = windowCutoff(date);

  const visible = rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (!matchesDateWindow(r.submittedAt, date, cutoff)) return false;
    if (!search) return true;
    return [r.fullName, r.caseRef, r.visaName, countryFromIso2(r.destinationIso)?.name]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(search));
  });

  // Defined once and handed to whichever panel is on the screen: the
  // roster, or the "nothing matched" panel that replaces it.
  const filters = [
    {
      param: "status",
      label: AGENCY.anyStatus[locale],
      options: (Object.keys(STATUS_COPY) as ApplicationStatus[]).map((s) => ({
        value: s,
        // The badge's own word, in the reader's own language, so the
        // filter and the cell it filters cannot drift apart.
        label: STATUS_COPY[s].label[locale],
      })),
    },
    {
      param: "date",
      label: AGENCY.anyDate[locale],
      options: [
        { value: "7", label: AGENCY.dateLast7[locale] },
        { value: "30", label: AGENCY.dateLast30[locale] },
        { value: "90", label: AGENCY.dateLast90[locale] },
        { value: "none", label: AGENCY.dateNotSubmitted[locale] },
      ],
    },
  ];

  const sorted = sortRows(
    visible,
    (r) => {
      switch (sort) {
        case "route":
          return countryFromIso2(r.destinationIso)?.name ?? r.destinationIso;
        case "documents":
          return r.completionPct;
        case "status":
          return STATUS_COPY[r.status].label[locale];
        case "submitted":
          return r.submittedAt;
        default:
          return r.fullName;
      }
    },
    dir
  );

  // Sliced after the sort, so page two is the second page of the order
  // the reader chose. Allow-listed size, so `?size=1000000` cannot ask
  // an agency's whole book onto one screen.
  const size = readPageSize(params.size);
  const { page, pageCount, start, end } = resolvePage(params.page, sorted.length, size);

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="clients"
      title={AGENCY.navClients[locale]}
      lead={AGENCY.clientsCardBody[locale]}
      actions={<InviteDialog kind="client" />}
    >
      {/* Filtered to nothing is `DataTable`'s own branch now, not a
          second panel beside this one: it keeps the toolbar on the screen
          above the way out, which is the moment the reader most needs the
          control that did it. `total` and `unfilteredTotal` are what let
          it tell that from an agency with no clients at all. */}
      <ClientRoster
        rows={sorted.slice(start, end)}
        locale={locale}
        toolbar={{ placeholder: AGENCY.searchClients[locale], filters }}
        empty={isDirector ? undefined : AGENCY.noAssignedClients[locale]}
        label={
          narrowed
            ? ADMIN_CONSOLE.showingTemplate[locale]
                .replace("{shown}", String(visible.length))
                .replace("{total}", String(rows.length))
            : undefined
        }
        count={visible.length}
        total={visible.length}
        unfilteredTotal={rows.length}
        sort={sort}
        dir={dir}
        basePath="/agency/clients"
        params={params}
        pagination={{ page, pageCount, size }}
      />
    </AgencyShell>
  );
}
