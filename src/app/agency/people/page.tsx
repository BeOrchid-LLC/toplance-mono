import type { Metadata } from "next";

import { AppBar } from "@/components/app/app-bar";
import { agencyNav } from "@/components/agency/agency-nav";
import { ConsoleBand } from "@/components/agency/console-band";
import { InvitationRoster } from "@/components/agency/invitation-roster";
import { InviteDialog } from "@/components/agency/invite-dialog";
import { PeopleRoster } from "@/components/agency/people-roster";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listInvitations } from "@/lib/data/invitations";
import { listOrgRoster } from "@/lib/data/organisations";
import { AGENCY } from "@/lib/i18n/agency";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.navPeople[locale] };
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
export default async function AgencyPeoplePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  // Same "no org, no unfiltered read" reasoning in both: `listOrgRoster`
  // returns early on an empty list, and `listInvitations` has nothing to
  // filter by without one id.
  const [rows, invitations] = await Promise.all([
    listOrgRoster(actor.orgIds),
    orgId ? listInvitations(orgId) : Promise.resolve([]),
  ]);
  const clientInvitations = invitations.filter((i) => i.kind === "client");

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={agencyNav({ locale, hasOrganisation: true })}
        name={profile.fullName}
        email={profile.email}
        subtitle={`${membership.name} · ${AGENCY.roleLabel[membership.role][locale]}`}
      />

      <ConsoleBand
        title={AGENCY.navPeople[locale]}
        action={<InviteDialog canInviteStaff={membership.role === "owner"} />}
      >
        <p className="t-muted mt-2 max-w-[68ch]">
          {AGENCY.peopleCardBody[locale]}
        </p>
      </ConsoleBand>

      <main>
        <Shell className="py-12">
          <PeopleRoster rows={rows} locale={locale} />
          <InvitationRoster
            className="mt-8"
            invitations={clientInvitations}
            locale={locale}
            empty={AGENCY.invitationsEmpty[locale]}
          />
        </Shell>
      </main>
    </div>
  );
}
