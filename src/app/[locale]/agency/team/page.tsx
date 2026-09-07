import type { Metadata } from "next";

import { AppBar } from "@/components/app/app-bar";
import { agencyNav } from "@/components/agency/agency-nav";
import { ConsoleBand } from "@/components/agency/console-band";
import { InvitationRoster } from "@/components/agency/invitation-roster";
import { InviteDialog } from "@/components/agency/invite-dialog";
import { TeamRoster } from "@/components/agency/team-roster";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listInvitations } from "@/lib/data/invitations";
import { listOrgMembers } from "@/lib/data/organisations";
import { AGENCY } from "@/lib/i18n/agency";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.navTeam[locale] };
}

/**
 * The colleagues: who works at this agency, and who has been asked to.
 *
 * Nothing rendered here existed before — an agency could invite a
 * colleague from the first day of the v1.3 tenancy, and then had
 * nowhere to see who had accepted. The membership rows were only ever
 * read one at a time, to answer "may this person do that", so a
 * reviewer who joined last month was invisible to the owner who
 * invited them.
 *
 * The invite dialog is here too, and offers the colleague option only
 * to an owner — `inviteTraveller` enforces that server-side, and the
 * dialog hides what it would refuse.
 */
export default async function AgencyTeamPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, membership, orgId } = await requireAgencyConsole();

  // `orgId` comes from `actor.orgIds`, which excludes suspended
  // agencies — so a suspended agency's console shows no colleagues
  // rather than reading a roster it is no longer entitled to.
  const [members, invitations] = await Promise.all([
    orgId ? listOrgMembers(orgId) : Promise.resolve([]),
    orgId ? listInvitations(orgId) : Promise.resolve([]),
  ]);
  const staffInvitations = invitations.filter((i) => i.kind === "staff");

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={agencyNav({ locale, hasOrganisation: true })}
        name={profile.fullName}
        email={profile.email}
        subtitle={`${membership.name} · ${AGENCY.roleLabel[membership.role][locale]}`}
      />

      <ConsoleBand
        title={AGENCY.navTeam[locale]}
        action={<InviteDialog canInviteStaff={membership.role === "owner"} />}
      >
        <p className="t-muted mt-2 max-w-[68ch]">{AGENCY.teamCardBody[locale]}</p>
      </ConsoleBand>

      <main>
        <Shell className="py-12">
          <TeamRoster members={members} locale={locale} />
          <InvitationRoster
            className="mt-8"
            invitations={staffInvitations}
            locale={locale}
            empty={AGENCY.teamInvitationsEmpty[locale]}
          />
        </Shell>
      </main>
    </div>
  );
}
