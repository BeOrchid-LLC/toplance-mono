import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ArrowLeft } from "lucide-react";

import { AgencyShell } from "@/components/agency/agency-shell";
import { CaseHandlerControl } from "@/components/agency/case-handler-control";
import { ReviewRow } from "@/components/agency/review-row";
import { AskAboutCase } from "@/components/agency/ask-about-case";
import { InviteAttendance } from "@/components/agency/invite-attendance";
import { StatusControl } from "@/components/agency/status-control";
import { MessageComposer } from "@/components/app/message-composer";
import {
  MessageThread,
  relativeTime,
  senderLabel,
} from "@/components/app/message-thread";
import { ThreadViewport } from "@/components/app/thread-viewport";
import { Badge } from "@/components/ui/badge";
import {
  DisclosurePanel,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/shared/panel";
import { DownloadDocuments } from "@/components/shared/download-documents";
import { SetupNotice } from "@/components/shared/setup-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { hasDatabaseEnv } from "@/lib/db/client";
import { completionOf, getDocuments } from "@/lib/data/applications";
import { listMessages, markThreadRead } from "@/lib/data/messages";
import { listOrgMembers } from "@/lib/data/organisations";
import { isAgencyDirectorFor } from "@/lib/auth/policy";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { AGENCY } from "@/lib/i18n/agency";
import { ARCHIVE } from "@/lib/i18n/archive";
import { CASE_REVIEW } from "@/lib/i18n/case-review";
import { STATUS_CONTROL } from "@/lib/i18n/case-review-actions";
import { MESSAGES } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import { exportableDocuments } from "@/lib/storage/archive";
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
 *
 * ## The file on the left, the desk on the right
 *
 * The two columns are two different things, and the client's 2026-09-09
 * note is what separated them. The left column is the traveller's file —
 * who they are and what they have sent: long, read top to bottom, and
 * the reason the page scrolls at all. The right column is the desk —
 * the tools a reviewer reaches for while reading it — so it is `sticky`,
 * and stays put while the file moves past it.
 *
 * The head belongs to the file and sits in its column, at its width,
 * rather than across the top of both. A sheet that spans the page reads
 * as a title for everything under it, and this one is not: it is the
 * first page of the dossier, and the desk is not part of the dossier.
 * Squaring its edge with the document sets below says so, and it buys
 * the desk the two hundred pixels the head used to stand on.
 *
 * The desk's own order is by how often a reviewer needs each tool, which
 * is not the order a case moves in. That inversion is the whole change:
 * the rail used to open with Decision and end with the conversation four
 * panels down, and `STAFF_TRANSITIONS` gives *no* exits from five of the
 * eight statuses — `draft`, `collecting_documents`, `additional_documents`,
 * `approved` and `rejected`. So the rail's first slot held a panel that
 * on most cases reads "No action from this state — it is either decided,
 * or waiting on the traveler", above the one tool that could stop the
 * traveller being waited on. The conversation is available in every
 * state; it goes first.
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

  // Files that exist, not required documents collected — an optional
  // document is still something the embassy pack should carry.
  const uploaded = exportableDocuments(docs).length;

  // The last line of the thread, promoted to the panel header. Who spoke
  // last and how long ago is the case's most perishable fact and the one
  // a reviewer scanning the rail wants first: read as "Traveler · 2h
  // ago", it says the ball is in your court. Stated rather than
  // coloured — a traveller's last word is sometimes "thanks", and a
  // warning pill would be the page insisting a reply is owed when it is
  // not.
  const latest = thread.at(-1);

  // A write, not something this screen's own response should wait on —
  // the same idiom the traveller's messages page uses.
  after(() => markThreadRead(row.id, "agency"));

  /**
   * The reviewer's working order, which is not the traveller's: what is
   * waiting on a verdict first, then what has already been judged, then
   * what has not arrived. The point of the screen is to empty the first
   * set.
   *
   * Which sets stand open follows from that. A set holding work — a
   * verdict to give, a document to chase — is open. Verdicts already
   * given are settled, and on a case near the end they are nearly the
   * whole file, so they fold: eleven rows the reviewer has finished with
   * were most of what stood between them and the desk on a laptop, and
   * all of it on a phone. The exception is a case where they are the
   * only set with anything in it, because nothing folds away the whole
   * screen.
   */
  const awaiting = docs.filter((d) => d.state === "checking" || d.state === "uploaded");
  const reviewed = docs.filter((d) => d.state === "verified" || d.state === "flagged");
  const missing = docs.filter((d) => d.state === "not_started" || d.state === "failed");

  const sets = [
    {
      label: CASE_REVIEW.docSets.awaitingReview[locale],
      docs: awaiting,
      defaultOpen: true,
    },
    {
      label: CASE_REVIEW.docSets.alreadyReviewed[locale],
      docs: reviewed,
      defaultOpen: awaiting.length === 0 && missing.length === 0,
    },
    {
      label: CASE_REVIEW.docSets.notUploadedYet[locale],
      docs: missing,
      defaultOpen: true,
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

      {/* Two columns from `lg`, and the desk is narrower there than it
          is at `xl`. The console rail takes 256px before this grid sees
          the page at all, so a 1024px screen has 744px to split — and a
          380px desk left the file 341px, narrow enough to break the
          traveller's name across two lines and stand the head up at 384
          pixels. 340px is the width at which the name fits on one line
          again. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* The same identity sheet the traveller's own profile opens
            with — the reviewer is looking at the same person, so the
            case head reads the same way on both sides of the desk. */}
        <Panel className="lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <h1 className="t-h2">{row.travelerName || row.travelerEmail}</h1>
              <p className="t-muted mt-2">
                {row.travelerCountryIso?.toUpperCase() ?? "—"} ·{" "}
                {destination?.name ?? AGENCY.routeNotSet[locale]}
                {row.visaName ? ` · ${row.visaName}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={row.status} locale={locale} />
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
            <div>
              <p className="t-muted">
                <span className="num font-semibold text-ink">{completion.verified}</span>{" "}
                {CASE_REVIEW.completion.of[locale]}{" "}
                <span className="num">{completion.total}</span>{" "}
                {CASE_REVIEW.completion.verified[locale]} ·{" "}
                <span className="num">{completion.collected}</span>{" "}
                {CASE_REVIEW.completion.uploaded[locale]}
              </p>
              {/* Beside the counts rather than in the decision rail: this
                  is reading the case, not deciding it, and a reviewer
                  taking the pack to an embassy does it before the verdict
                  exists. Hidden until something has been uploaded, the
                  same condition the traveller's page uses. */}
              {uploaded > 0 && (
                <div className="mt-4">
                  <DownloadDocuments
                    applicationId={row.id}
                    label={ARCHIVE.agencyLabel[locale]}
                    preparingLabel={ARCHIVE.preparingLabel[locale]}
                  />
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* The desk, spanning both of the left column's rows so that it
            starts level with the case head rather than under it, and
            sticky from `lg` so the tools stay with whichever part of
            the file is being read. The row span is what keeps the two
            columns independent: without it the head's row would size
            to the desk beside it and open a screen's worth of blank
            paper between the head and the first document set.

            `grid-rows-[auto_1fr]` is the other half of that. A spanning
            item taller than the rows it covers hands its surplus back
            to those rows, and two `auto` rows split it — which put two
            hundred pixels of nothing under the head. Sized `auto` then
            `1fr`, the head's row hugs the head and the surplus lands in
            the file's row instead, below the last document rather than
            above the first.

            Below `lg` there is one column and no rail to be beside, so
            it falls into document order between the head and the file —
            the person, then what they said, then their papers. A phone
            is where a message gets answered, not where eleven scans get
            compared.

            It carries its own ceiling and scrollbar for the short
            screens where a decision with four exits plus the
            conversation is taller than the viewport. Without one, a
            sticky column taller than the screen simply hides its own
            foot: the page scroll cannot reach it. The negative margin
            and matching padding give focus rings the two pixels they
            need outside the panels, which a scroll container would
            otherwise clip. */}
        <div className="grid gap-6 lg:sticky lg:top-[calc(var(--bar-h)+2rem)] lg:-mx-2 lg:max-h-[calc(100dvh-var(--bar-h)-3.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:overflow-y-auto lg:px-2">
          {/* The same thread the traveller reads at `/app/messages` —
              one composer, guarded by `canWriteMessages` on the
              shared `sendMessage` action, not an agency-side copy of
              it. */}
          <Panel>
            <PanelHeader
              label={MESSAGES.panelLabel[locale]}
              aside={
                latest ? (
                  <span className="special">
                    {senderLabel(latest, locale)} ·{" "}
                    {relativeTime(latest.createdAt, locale)}
                  </span>
                ) : undefined
              }
            />
            <PanelBody>
              <ThreadViewport count={thread.length} label={MESSAGES.panelLabel[locale]}>
                <MessageThread messages={thread} />
              </ThreadViewport>
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

          {/* The decision: the case's exit, and so under the tool that
              gets it there rather than above it. Still in the rail, and
              still in view as the reviewer scrolls the checklist —
              which is what the rail going sticky is for. */}
          <Panel>
            <PanelHeader label={CASE_REVIEW.decisionPanel[locale]} />
            <PanelBody>
              {/* The export nudge, and the only place the exported
                  stamp is read. Drawn only while the case is still
                  `under_review`: once it is lodged the question has
                  been answered, and on a decided case it would be
                  asking about a case that is over. */}
              {row.documentsExportedAt && row.status === "under_review" && (
                <p className="t-muted mb-4 max-w-[62ch]">
                  {STATUS_CONTROL.exportedNudge[locale].replace(
                    "{date}",
                    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                      row.documentsExportedAt
                    )
                  )}
                </p>
              )}
              <StatusControl applicationId={row.id} status={row.status} />
            </PanelBody>
          </Panel>

          {/* The two detours, as two buttons rather than two sheets.
              Both open a form somewhere else and come back — calling
              the traveller into an office, asking BeOrchid about the
              case — and both happen once or twice in a case's life
              against a rail whose other tenants are used continuously.
              Standing open they were about four hundred pixels of form
              between the reviewer and the decision. Each one's lead
              sentence moved into its own dialog, where it is read at
              the moment it applies rather than every time the page
              loads. No sheet around them, and so no label to invent:
              they are controls on the desk, not another sheet in the
              file. */}
          <div className="flex flex-wrap gap-3">
            <InviteAttendance applicationId={row.id} />
            <AskAboutCase applicationId={row.id} />
          </div>
        </div>

        <div className="grid gap-6 lg:col-start-1 lg:row-start-2">
          {docs.length === 0 && (
            <p className="t-muted max-w-[62ch]">
              {CASE_REVIEW.noChecklistYet[locale]}
            </p>
          )}

          {sets.map(
            (set) =>
              set.docs.length > 0 && (
                <DisclosurePanel
                  key={set.label}
                  label={set.label}
                  defaultOpen={set.defaultOpen}
                  aside={
                    <Badge variant="neutral">
                      <span className="num">{set.docs.length}</span>
                    </Badge>
                  }
                >
                  <div>
                    {set.docs.map((doc) => (
                      <ReviewRow key={doc.id} doc={doc} applicationId={row.id} />
                    ))}
                  </div>
                </DisclosurePanel>
              )
          )}
        </div>
      </div>
    </AgencyShell>
  );
}
