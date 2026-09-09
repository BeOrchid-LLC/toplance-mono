import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AgencyShell } from "@/components/agency/agency-shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { SupportReply } from "@/components/shared/support-reply";
import { SupportResolve } from "@/components/shared/support-resolve";
import { SupportThread } from "@/components/shared/support-thread";
import { Badge } from "@/components/ui/badge";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getSupportRequest, listSupportMessages } from "@/lib/data/support";
import { canPostSupportMessage } from "@/lib/domain/support-thread";
import { isUuid } from "@/lib/domain/uuid";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";
import { replyAsAgency, resolveAsAgency } from "@/app/[locale]/agency/support/actions";

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
 * The agency's side of one conversation.
 *
 * `notFound` for a request belonging to another agency, not a refusal:
 * the table is one queue across every tenant, and telling somebody
 * their guess exists but is not theirs is the confirmation the guess
 * was for.
 */
export default async function AgencySupportRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  const request = await getSupportRequest(id);
  if (!request || request.orgId !== orgId) notFound();

  const messages = await listSupportMessages(id);
  const open = canPostSupportMessage(request, { kind: "agency", orgId });

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="support"
      title={request.subject}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/agency/support" className="font-semibold text-brand-text hover:underline">
          ← {OPS_SUPPORT.backToSupport[locale]}
        </Link>
        <Badge variant={STATE_VARIANT[request.state]}>
          {STATE_LABEL[request.state][locale]}
        </Badge>
      </div>

      <Panel className="mt-8">
        <PanelHeader label={OPS_SUPPORT.threadLabel[locale]} />
        <PanelBody>
          <SupportThread
            opening={{
              body: request.body,
              authorName: request.raisedByName,
              createdAt: request.createdAt,
            }}
            messages={messages}
            locale={locale}
          />
        </PanelBody>
      </Panel>

      <Panel className="mt-8 mb-16">
        <PanelBody>
          {open ? (
            <div className="flex flex-col gap-6">
              <SupportReply requestId={request.id} action={replyAsAgency} />
              {/* The agency closes its own request. They usually know
                  first that it is sorted, and leaving that to an
                  operator keeps a settled dispute sitting in the queue
                  as work. */}
              <div className="border-t border-border pt-6">
                <SupportResolve requestId={request.id} action={resolveAsAgency} />
              </div>
            </div>
          ) : (
            <p className="t-muted max-w-[62ch]">{OPS_SUPPORT.resolvedNote[locale]}</p>
          )}
        </PanelBody>
      </Panel>
    </AgencyShell>
  );
}
