import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AgencyShell } from "@/components/agency/agency-shell";
import { InvitationRoster } from "@/components/shared/invitation-roster";
import { InviteDialog } from "@/components/agency/invite-dialog";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listInvitations } from "@/lib/data/invitations";
import { AGENCY } from "@/lib/i18n/agency";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";
import { resendInvitation, revokeInvitation } from "@/app/[locale]/agency/actions";
import { withLocalePrefix } from "@/lib/i18n/paths";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.invitationsLabel[locale] };
}

/**
 * The addresses invited to become clients, and what became of each.
 *
 * A page of its own since 2026-09-08, at the client's request. It was a
 * second panel at the foot of `/agency/clients`, on the argument that a
 * pending invitation is a person who is not on the roster *yet* — which
 * is true, and stopped being the useful framing once the roster grew a
 * search box, two filters, five sortable columns and a pager. A director
 * scrolling past all of that to see whether an email was answered was
 * reading one screen for two jobs.
 *
 * `/agency/clients` stays the section's front door: the roster is what
 * an agency opens the console to look at, and this is what it comes to
 * when something is missing from it.
 *
 * A sibling of `clients/[id]` in the router. Next resolves a static
 * segment ahead of a dynamic one, so "invitations" never reaches the
 * case screen — and it could not be a case in any event, since that
 * route takes a uuid.
 *
 * Director-only, and the redirect is the guard rather than the hidden
 * rail row: an address nobody has accepted is not yet a client, and
 * certainly not this reviewer's. `resendInvitation` and
 * `revokeInvitation` check the rank again themselves — they are POST
 * endpoints, and this page is not their gate.
 */
export default async function AgencyInvitationsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  if (membership.role !== "owner") redirect(withLocalePrefix("/agency/clients", await getLocale()));

  // Staff invitations are `/agency/team`'s, and platform ones are
  // `/ops/staff`'s. Filtering here rather than in the query for the
  // reason `AgencyShell` gives about its own counts: one read of an
  // agency's invitations per request, cut by whoever needs a slice.
  const invitations = orgId ? await listInvitations(orgId) : [];
  const clientInvitations = invitations.filter((i) => i.kind === "client");

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="invitations"
      title={AGENCY.invitationsLabel[locale]}
      lead={AGENCY.invitationsPageBody[locale]}
      actions={<InviteDialog kind="client" />}
    >
      <InvitationRoster
        label={AGENCY.invitationsLabel[locale]}
        resendAction={resendInvitation}
        revokeAction={revokeInvitation}
        detailLabel={AGENCY.tableHead.destination[locale]}
        invitations={clientInvitations}
        locale={locale}
        empty={AGENCY.invitationsEmpty[locale]}
      />
    </AgencyShell>
  );
}
