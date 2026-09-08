import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AgencyShell } from "@/components/agency/agency-shell";
import { ClientRoster } from "@/components/agency/client-roster";
import { MemberRankControl } from "@/components/agency/member-rank-control";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listOrgMembers, listOrgRoster } from "@/lib/data/organisations";
import { AGENCY } from "@/lib/i18n/agency";
import { fill } from "@/lib/i18n/fill";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.navTeam[locale] };
}

function formatDay(value: Date) {
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * One colleague: who they are, what rank they hold, and what they are
 * carrying.
 *
 * The rank control lives here rather than inline on the roster because
 * changing somebody's authority is not a thing to do while scanning a
 * list — and because the page has to say what the two ranks mean before
 * offering to swap them, which is a sentence a table cell has no room
 * for.
 *
 * Director-only, like the roster it is reached from. `/agency/team`
 * turns a reviewer away with the argument that who works here and at
 * what rank is a fact about running the agency rather than about
 * handling a case; one colleague's page is the same fact, so the same
 * redirect. A page reachable by typing a path its own list refuses is
 * the hole, not the convenience.
 *
 * The cases are the same rows `/agency/clients` renders, read through
 * the same `listOrgRoster` and therefore the same scoping. Nothing here
 * widens anybody's reach — it re-cuts a list the director already has.
 */
export default async function AgencyTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();
  const { id } = await params;

  // Same guard, same reason, as `/agency/team`.
  if (membership.role !== "owner") redirect("/agency");

  const members = orgId ? await listOrgMembers(orgId) : [];
  const member = members.find((m) => m.userId === id);

  const shell = {
    profile,
    membership,
    actor,
    orgId,
    locale,
    activeId: "team",
  } as const;

  const back = (
    <Link
      href="/agency/team"
      className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-text hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden /> {AGENCY.backToTeam[locale]}
    </Link>
  );

  if (!member) {
    return (
      <AgencyShell {...shell}>
        {back}
        <Panel className="mt-6">
          <PanelBody>
            <p className="t-muted max-w-[62ch]">{AGENCY.memberNotFound[locale]}</p>
          </PanelBody>
        </Panel>
      </AgencyShell>
    );
  }

  const held = await listOrgRoster(actor, { handledBy: member.userId });

  return (
    <AgencyShell {...shell} title={member.fullName || member.email}>
      {back}

      <Panel className="mt-6">
        <PanelHeader
          label={AGENCY.profileDetailsLabel[locale]}
          aside={<Badge variant="neutral">{AGENCY.roleLabel[member.role][locale]}</Badge>}
        />
        <PanelBody>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="special">{AGENCY.tableHead.colleague[locale]}</dt>
              <dd className="mt-1 break-words text-base font-semibold">
                {member.email}
              </dd>
            </div>
            <div>
              <dt className="special">{AGENCY.tableHead.joined[locale]}</dt>
              <dd className="mt-1 text-base font-semibold">
                {fill(AGENCY.joinedOn[locale], { date: formatDay(member.joinedAt) })}
              </dd>
            </div>
          </dl>

          {/* Only a director reaches this page at all, so the control
              is not conditional here. It is still checked again inside
              `setTeamMemberRank`: this is a POST endpoint reachable
              without rendering the page, and a page gate is not its
              gate. */}
          <div className="mt-8 border-t border-border pt-6">
            <MemberRankControl userId={member.userId} rank={member.role} />
          </div>
        </PanelBody>
      </Panel>

      <ClientRoster
        className="mt-8"
        rows={held}
        locale={locale}
        label={AGENCY.casesTheyHold[locale]}
        empty={AGENCY.holdsNoCases[locale]}
      />
    </AgencyShell>
  );
}
