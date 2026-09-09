import type { Metadata } from "next";

import { AgencyShell } from "@/components/agency/agency-shell";
import { ContactSupport } from "@/components/agency/contact-support";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listSupportRequestsForOrg } from "@/lib/data/support";
import { getLocale } from "@/lib/i18n/server";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_SUPPORT.agencyHeading[locale] };
}

const STATE_LABEL = {
  open: OPS_SUPPORT.stateOpen,
  claimed: OPS_SUPPORT.stateClaimed,
  resolved: OPS_SUPPORT.stateResolved,
} as const;

const STATE_VARIANT = {
  open: "warning" as const,
  claimed: "brand" as const,
  resolved: "success" as const,
};

/**
 * The agency's way of reaching BeOrchid.
 *
 * Every member, not only a director. A handler whose case has been
 * claimed by the wrong colleague is the person with the problem, and
 * routing the only channel out through their director would make the
 * dispute wait on somebody else's calendar.
 *
 * The agency's own past requests sit underneath the form, with the
 * state the platform team has put them in. Two reasons: nobody sends
 * the same thing twice on Monday because Friday's went unanswered, and
 * "somebody has this" is most of what a person wants to know after
 * asking for help.
 */
export default async function AgencySupportPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  const requests = orgId ? await listSupportRequestsForOrg(orgId) : [];

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="support"
      title={OPS_SUPPORT.agencyHeading[locale]}
      lead={OPS_SUPPORT.agencyLead[locale]}
    >
      <Panel>
        <PanelBody>
          <ContactSupport />
        </PanelBody>
      </Panel>

      <Panel className="mt-8">
        <PanelHeader label={OPS_SUPPORT.yourRequests[locale]} />
        <PanelBody>
          {requests.length === 0 ? (
            <p className="t-muted max-w-[62ch]">{OPS_SUPPORT.noneYet[locale]}</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {requests.map((r) => (
                <li key={r.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="t-title">{r.subject}</span>
                    <Badge variant={STATE_VARIANT[r.state]}>
                      {STATE_LABEL[r.state][locale]}
                    </Badge>
                    <span className="t-muted num">
                      {r.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <p className="t-muted mt-2 whitespace-pre-wrap">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </AgencyShell>
  );
}
