import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ArrowLeft } from "lucide-react";

import { AgencyShell } from "@/components/agency/agency-shell";
import { CaseHandlerControl } from "@/components/agency/case-handler-control";
import { ReviewRow } from "@/components/agency/review-row";
import { StatusControl } from "@/components/agency/status-control";
import { MessageComposer } from "@/components/app/message-composer";
import { MessageThread } from "@/components/app/message-thread";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { hasDatabaseEnv } from "@/lib/db/client";
import { completionOf, getDocuments } from "@/lib/data/applications";
import { listMessages, markThreadRead } from "@/lib/data/messages";
import { listOrgMembers } from "@/lib/data/organisations";
import { isAgencyDirectorFor } from "@/lib/auth/policy";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { AGENCY } from "@/lib/i18n/agency";
import { CASE_REVIEW } from "@/lib/i18n/case-review";
import { MESSAGES } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyCase } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: CASE_REVIEW.metaTitle[locale] };
}

/**
 * One client's case, and everything the agency does to it: the
 * checklist with a verdict on each document, the decision that moves the
 * case, the thread with the traveller, and who is handling it.
 *
 * This screen is the missing half of #51. That change moved review from
 * BeOrchid to the agency and deleted the platform's case surface —
 * correctly, because it read documents without passing through
 * `requireApplicationAccess` — but the console it moved the work *to*
 * never got a case screen, so `reviewDocumentTx`, `changeStatusTx`,
 * `claimCase` and `releaseCase` have sat here with no caller since. The
 * links in `notifyAgency` have been pointing at a path that does not
 * exist for the same reason.
 *
 * Every panel is guarded by `requireAgencyCase`, which refuses with
 * `notFound()` rather than a 403 — see its own note.
 */
export default async function AgencyCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { id } = await params;

  const { console: agency, case: row } = await requireAgencyCase(id);
  const { profile, actor, membership, orgId } = agency;

  const [docs, thread, colleagues] = await Promise.all([
    getDocuments(row.id),
    listMessages(row.id),
    // The *case's* agency, not the console's. They are the same for
    // almost everyone, but a member of two agencies has one console org
    // (`actor.orgIds[0]`) and can be standing on a case belonging to the
    // other — in which case this list named the wrong agency's people
    // and `assignCaseTo` refused every pick as "not at this agency".
    row.orgId ? listOrgMembers(row.orgId) : Promise.resolve([]),
  ]);

  const completion = completionOf(docs);
  const destination = countryFromIso2(row.destinationIso);

  // A write, not something this screen's own response should wait on —
  // the same idiom the traveller's messages page uses.
  after(() => markThreadRead(row.id, "agency"));

  /**
   * The reviewer's working order, which is not the traveller's: what is
   * waiting on a verdict first, then what has already been judged, then
   * what has not arrived. The point of the screen is to empty the first
   * set.
   */
  const sets = [
    {
      label: CASE_REVIEW.docSets.awaitingReview[locale],
      docs: docs.filter((d) => d.state === "checking" || d.state === "uploaded"),
    },
    {
      label: CASE_REVIEW.docSets.alreadyJudged[locale],
      docs: docs.filter((d) => d.state === "verified" || d.state === "flagged"),
    },
    {
      label: CASE_REVIEW.docSets.notUploadedYet[locale],
      docs: docs.filter((d) => d.state === "not_started" || d.state === "failed"),
    },
  ];

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="clients"
    >
      <Link
        href="/agency/clients"
        className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-text hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />{" "}
        {CASE_REVIEW.backToClients[locale]}
      </Link>

      {/* The same identity sheet the traveller's own profile opens
          with — the reviewer is looking at the same person, so the
          case head reads the same way on both sides of the desk. */}
      <Panel className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h1 className="t-h2">{row.travelerName || row.travelerEmail}</h1>
            <p className="t-muted mt-2">
              {row.travelerCountryIso?.toUpperCase() ?? "—"} ·{" "}
              {destination?.name ?? AGENCY.routeNotSet[locale]}
              {row.visaName ? ` · ${row.visaName}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={row.status} />
              <Badge variant="outline">
                <span className="num">{row.caseRef.toUpperCase()}</span>
              </Badge>
            </div>
            <div className="mt-4">
              <CaseHandlerControl
                applicationId={row.id}
                assigneeId={row.assigneeId}
                assigneeName={row.assigneeName}
                viewerId={actor.userId}
                isDirector={isAgencyDirectorFor(actor, row)}
                colleagues={colleagues.map((c) => ({
                  userId: c.userId,
                  fullName: c.fullName,
                  email: c.email,
                }))}
              />
            </div>
          </div>
          <p className="t-muted">
            <span className="num font-semibold text-ink">{completion.verified}</span>{" "}
            {CASE_REVIEW.completion.of[locale]}{" "}
            <span className="num">{completion.total}</span>{" "}
            {CASE_REVIEW.completion.verified[locale]} ·{" "}
            <span className="num">{completion.collected}</span>{" "}
            {CASE_REVIEW.completion.uploaded[locale]}
          </p>
        </div>
      </Panel>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          {docs.length === 0 && (
            <p className="t-muted max-w-[62ch]">
              {CASE_REVIEW.noChecklistYet[locale]}
            </p>
          )}

          {sets.map(
            (set) =>
              set.docs.length > 0 && (
                <Panel key={set.label}>
                  <PanelHeader
                    label={set.label}
                    aside={
                      <Badge variant="neutral">
                        <span className="num">{set.docs.length}</span>
                      </Badge>
                    }
                  />
                  <div>
                    {set.docs.map((doc) => (
                      <ReviewRow key={doc.id} doc={doc} applicationId={row.id} />
                    ))}
                  </div>
                </Panel>
              )
          )}
        </div>

        <div className="grid gap-6">
          {/* The decision, kept in the rail so it stays in view as
              the reviewer scrolls the checklist — the whole reason
              this screen exists. */}
          <Panel>
            <PanelHeader label={CASE_REVIEW.decisionPanel[locale]} />
            <PanelBody>
              <StatusControl applicationId={row.id} status={row.status} />
            </PanelBody>
          </Panel>

          {/* The same thread the traveller reads at `/app/messages` —
              one composer, guarded by `canWriteMessages` on the
              shared `sendMessage` action, not an agency-side copy of
              it. */}
          <Panel>
            <PanelHeader label={MESSAGES.panelLabel[locale]} />
            <PanelBody>
              <MessageThread messages={thread} />
              {/* Same shape as the traveller's side, same reason —
                  one `canWriteMessages`, so neither end sees a
                  conversation it cannot answer in. Unheld, the note
                  says whose thread this is rather than refusing:
                  the whole agency's until somebody takes it. */}
              <div className="mt-5 border-t border-border pt-5">
                {!row.assigneeId && (
                  <p className="t-muted mb-4 max-w-[74ch]">
                    {CASE_REVIEW.messagesUnheld[locale]}
                  </p>
                )}
                <MessageComposer applicationId={row.id} />
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </AgencyShell>
  );
}
