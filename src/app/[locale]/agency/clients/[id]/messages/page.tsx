import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ArrowLeft } from "lucide-react";

import { AgencyBar } from "@/components/agency/agency-bar";
import { TakeCaseButton } from "@/components/agency/take-case-button";
import { MessageComposer } from "@/components/app/message-composer";
import { MessageThread } from "@/components/app/message-thread";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Shell } from "@/components/shared/shell";
import { SetupNotice } from "@/components/shared/setup-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listMessages, markThreadRead } from "@/lib/data/messages";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { CASE_REVIEW } from "@/lib/i18n/case-review";
import { MESSAGES } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyThread } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: MESSAGES.title[locale] };
}

/**
 * The thread on its own, for a colleague who may answer it but not open
 * the case around it.
 *
 * This screen exists because the two permissions stopped being the same
 * size. `reachesThread` opens an unheld case's conversation to the whole
 * agency — so somebody is there when a traveller writes on the day they
 * finish onboarding — while `handlesCase` keeps that same case's
 * documents shut until a name is on it. `/agency/clients/[id]` is the
 * documents, so it still refuses these viewers; without this route their
 * only door to the message would be to claim a client in order to read a
 * question that might not be theirs.
 *
 * So: the thread, the composer, and the one action that would widen
 * anything — taking the case. Nothing here reads `documents`, and the
 * guard would not have let them through if it did.
 */
export default async function AgencyCaseThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { id } = await params;

  const { console: agency, case: row } = await requireAgencyThread(id);
  const { profile, actor, membership } = agency;

  const thread = await listMessages(row.id);
  const destination = countryFromIso2(row.destinationIso);

  // A write, not something this screen's own response should wait on —
  // the same idiom the case screen and the traveller's page use.
  after(() => markThreadRead(row.id, "agency"));

  return (
    <div className="min-h-dvh bg-bg">
      <AgencyBar profile={profile} membership={membership} locale={locale} />

      <main>
        <Shell className="py-10 md:py-12">
          <Link
            href="/agency/clients"
            className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-text hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />{" "}
            {CASE_REVIEW.backToClients[locale]}
          </Link>

          {/* The header the case screen opens with, minus everything it
              draws from the file: a name, a route and a status, which is
              the same slice `org_application_progress` lets the roster
              show these viewers. */}
          <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="t-h2">{row.travelerName}</h1>
            <p className="special">{row.caseRef}</p>
            <StatusBadge status={row.status} locale={locale} />
          </div>
          <p className="t-muted mt-2">
            {destination?.name ??
              row.destinationIso?.toUpperCase() ??
              CASE_REVIEW.unassignedNoOwner[locale]}
            {row.visaName ? ` · ${row.visaName}` : ""}
          </p>

          <Panel className="mt-8">
            <PanelHeader label={MESSAGES.panelLabel[locale]} />
            <PanelBody>
              {/* Why this page is shorter than the case screen. It is
                  above the thread rather than below it because a
                  colleague arriving from a notification needs to know
                  what they are looking at before they read it. */}
              {!row.assigneeId && (
                <div className="mb-5 flex flex-wrap items-center gap-4 border-b border-border pb-5">
                  <p className="t-muted max-w-[62ch]">
                    {CASE_REVIEW.threadOnly[locale]}
                  </p>
                  <TakeCaseButton applicationId={row.id} viewerId={actor.userId} />
                </div>
              )}

              <MessageThread messages={thread} />
              <div className="mt-5 border-t border-border pt-5">
                <MessageComposer applicationId={row.id} />
              </div>
            </PanelBody>
          </Panel>
        </Shell>
      </main>
    </div>
  );
}
