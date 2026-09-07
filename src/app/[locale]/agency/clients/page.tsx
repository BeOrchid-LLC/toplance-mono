import type { Metadata } from "next";

import { AgencyBar } from "@/components/agency/agency-bar";
import { ConsoleBand } from "@/components/agency/console-band";
import { InvitationRoster } from "@/components/agency/invitation-roster";
import { InviteDialog } from "@/components/agency/invite-dialog";
import { ClientRoster } from "@/components/agency/client-roster";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listInvitations } from "@/lib/data/invitations";
import { listOrgRoster } from "@/lib/data/organisations";
import { AGENCY } from "@/lib/i18n/agency";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

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
 */
export default async function AgencyClientsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  const isDirector = membership.role === "owner";

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

  return (
    <div className="min-h-dvh bg-bg">
      <AgencyBar profile={profile} membership={membership} locale={locale} />

      <ConsoleBand
        title={AGENCY.navClients[locale]}
        action={<InviteDialog kind="client" />}
      >
        <p className="t-muted mt-2 max-w-[68ch]">
          {AGENCY.clientsCardBody[locale]}
        </p>
      </ConsoleBand>

      <main>
        <Shell className="py-12">
          <ClientRoster
            rows={rows}
            locale={locale}
            empty={isDirector ? undefined : AGENCY.noAssignedClients[locale]}
          />
          {/* Invitations are the agency's outstanding business, so they
              are the director's panel: an address nobody has accepted is
              not yet a client, and certainly not this reviewer's. */}
          {isDirector && (
            <InvitationRoster
              className="mt-8"
              invitations={clientInvitations}
              locale={locale}
              empty={AGENCY.invitationsEmpty[locale]}
            />
          )}
        </Shell>
      </main>
    </div>
  );
}
