import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AgencyShell } from "@/components/agency/agency-shell";
import { InvitationRoster } from "@/components/shared/invitation-roster";
import { InviteDialog } from "@/components/agency/invite-dialog";
import { TeamRoster } from "@/components/agency/team-roster";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listInvitations } from "@/lib/data/invitations";
import { listOrgMembers } from "@/lib/data/organisations";
import { AGENCY } from "@/lib/i18n/agency";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";
import { resendInvitation, revokeInvitation } from "@/app/[locale]/agency/actions";

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
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  // The roster of colleagues is the director's screen. A reviewer has no
  // tab for it, and typing the path is not a way around that — who works
  // here, and at what rank, is a fact about running the agency rather
  // than about handling a case.
  if (membership.role !== "owner") redirect("/agency");

  // `orgId` comes from `actor.orgIds`, which excludes suspended
  // agencies — so a suspended agency's console shows no colleagues
  // rather than reading a roster it is no longer entitled to.
  const [members, invitations] = await Promise.all([
    orgId ? listOrgMembers(orgId) : Promise.resolve([]),
    orgId ? listInvitations(orgId) : Promise.resolve([]),
  ]);
  const staffInvitations = invitations.filter((i) => i.kind === "staff");

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="team"
      title={AGENCY.navTeam[locale]}
      lead={AGENCY.teamCardBody[locale]}
    >
      <TeamRoster
        members={members}
        locale={locale}
        action={
          // On the roster's own header row since 8 September, not the
          // console bar. See `TeamRoster.action` for why the button
          // belongs beside the count rather than in the chrome.
          //
          // Only the director may invite a colleague, and on a page
          // whose one action is exactly that, a reviewer is better shown
          // no button than one that refuses. The redirect above already
          // means nobody else is reading this, so the check is a second
          // lock on a door rather than the door — kept because the day
          // the redirect moves is the day it stops being redundant.
          membership.role === "owner" ? (
            <InviteDialog kind="staff" size="sm" />
          ) : undefined
        }
      />
      <InvitationRoster
        resendAction={resendInvitation}
        revokeAction={revokeInvitation}
        className="mt-8"
        invitations={staffInvitations}
        detailLabel={AGENCY.tableHead.jobTitle[locale]}
        locale={locale}
        empty={AGENCY.teamInvitationsEmpty[locale]}
      />
    </AgencyShell>
  );
}
