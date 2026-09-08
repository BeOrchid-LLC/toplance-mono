import type { Metadata } from "next";
import Link from "next/link";

import { AgencyShell } from "@/components/agency/agency-shell";
import { InvitationRoster } from "@/components/shared/invitation-roster";
import { InviteDialog } from "@/components/agency/invite-dialog";
import { ClientRoster, CLIENT_SORTS } from "@/components/agency/client-roster";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { Panel, PanelBody } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listInvitations } from "@/lib/data/invitations";
import { listOrgRoster } from "@/lib/data/organisations";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { matchesDateWindow, windowCutoff } from "@/lib/domain/date-window";
import { readDir, readSort, sortRows } from "@/lib/domain/sorting";
import type { ApplicationStatus } from "@/lib/domain/status";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { AGENCY } from "@/lib/i18n/agency";
import { STATUS_COPY } from "@/lib/i18n/status";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";
import { resendInvitation, revokeInvitation } from "@/app/[locale]/agency/actions";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.navClients[locale] };
}

/**
 * The clients: everyone whose visa this agency is handling, and the
 * addresses invited to become one.
 *
 * Both on one page because they are two states of the same thing — a
 * pending invitation is a person who is not on the roster *yet* — and
 * an agency chasing an unaccepted invitation should not have to
 * remember which of two screens it lives on.
 *
 * Staff invitations are filtered out here and shown on `/agency/team`
 * instead. They used to share one list with these, which meant the
 * count under the organisation name mixed colleagues into a number the
 * page called people.
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
  const [rows, invitations] = await Promise.all([
    listOrgRoster(actor, isDirector ? undefined : { handledBy: actor.userId }),
    orgId && isDirector ? listInvitations(orgId) : Promise.resolve([]),
  ]);
  const clientInvitations = invitations.filter((i) => i.kind === "client");

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
      {rows.length > 0 && visible.length === 0 ? (
        // Filtered to nothing, which is the moment the reader most needs
        // the control that did it — so the toolbar stays on the screen
        // above the way out.
        <Panel>
          <TableToolbar
            placeholder={AGENCY.searchClients[locale]}
            filters={filters}
            className="border-b border-border px-5 py-3 sm:px-6"
          />
          <PanelBody>
            <p className="t-muted max-w-[62ch]">
              {ADMIN_CONSOLE.noMatch[locale]}{" "}
              <Link
                href="/agency/clients"
                className="font-semibold text-brand-text hover:underline"
              >
                {ADMIN_CONSOLE.clearFilters[locale]}
              </Link>
            </p>
          </PanelBody>
        </Panel>
      ) : (
        <ClientRoster
          rows={sorted}
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
          sort={sort}
          dir={dir}
          basePath="/agency/clients"
          params={params}
        />
      )}

      {/* Invitations are the agency's outstanding business, so they
          are the director's panel: an address nobody has accepted is
          not yet a client, and certainly not this reviewer's. */}
      {isDirector && (
        <InvitationRoster
          resendAction={resendInvitation}
          revokeAction={revokeInvitation}
          className="mt-8"
          detailLabel={AGENCY.tableHead.destination[locale]}
          invitations={clientInvitations}
          locale={locale}
          empty={AGENCY.invitationsEmpty[locale]}
        />
      )}
    </AgencyShell>
  );
}
