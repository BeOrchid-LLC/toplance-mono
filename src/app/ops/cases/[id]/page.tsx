import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { AppBar } from "@/components/app/app-bar";
import { MessageComposer } from "@/components/app/message-composer";
import { MessageThread } from "@/components/app/message-thread";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { AddCaseNote } from "@/components/ops/add-case-note";
import { ClaimButton } from "@/components/ops/claim-button";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { localizedOpsNav } from "@/components/ops/ops-nav";
import { ReviewRow } from "@/components/ops/review-row";
import { StatusControl } from "@/components/ops/status-control";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { TripList } from "@/components/shared/trip-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { Shell } from "@/components/shared/shell";
import { SetupNotice } from "@/components/shared/setup-notice";
import { db, hasDatabaseEnv } from "@/lib/db/client";
import { applications, corridors, profiles } from "@/lib/db/schema";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { isUuid } from "@/lib/domain/uuid";
import { completionOf, getDocuments } from "@/lib/data/applications";
import { getCaseNotes } from "@/lib/data/case-notes";
import { listMessages, markThreadRead } from "@/lib/data/messages";
import { listTravelRecords } from "@/lib/data/travel-records";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { isOwner } from "@/lib/auth/policy";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CASE } from "@/lib/i18n/ops-case";
import { MESSAGES } from "@/lib/i18n/messages";

const assignee = alias(profiles, "assignee");

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_CASE.metaTitle[locale] };
}

export default async function OpsCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { id } = await params;

  // A typed URL like /ops/cases/1 would make Postgres throw on the uuid
  // cast below — a 500 where a wrong-but-well-formed id is already a
  // 404. A malformed id is the same answer as a missing one.
  if (!isUuid(id)) notFound();

  // The same gate the queue applies — see /ops.
  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const [row] = await db
    .select({
      id: applications.id,
      caseRef: applications.caseRef,
      status: applications.status,
      assigneeId: applications.assigneeId,
      assigneeName: assignee.fullName,
      travelerId: applications.travelerId,
      travelerName: profiles.fullName,
      travelerCountryIso: profiles.countryIso,
      visaName: corridors.visaName,
      destinationIso: corridors.destinationIso,
    })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    .leftJoin(corridors, eq(corridors.id, applications.corridorId))
    .leftJoin(assignee, eq(assignee.id, applications.assigneeId))
    .where(eq(applications.id, id))
    .limit(1);

  if (!row) notFound();

  const [docs, notes, thread, notifications, unreadCount, trips] =
    await Promise.all([
      getDocuments(row.id),
      getCaseNotes(row.id),
      listMessages(row.id),
      getNotifications(actor.userId),
      unreadNotificationCount(actor.userId),
      // Keyed on the traveller, not the case: a past trip belongs to the
      // person, and a returning applicant's history should not restart
      // because this is their second application.
      listTravelRecords(row.travelerId),
    ]);
  const completion = completionOf(docs);
  const destination = countryFromIso2(row.destinationIso);

  // A write, not something the case screen's own response should wait
  // on — moved off the render path, same idiom as the traveller's
  // messages page.
  after(() => markThreadRead(row.id, "staff"));

  /**
   * The reviewer's working order, which is not the traveller's: what is
   * waiting on a verdict first, then what has already been judged, then
   * what has not arrived. The queue exists to empty the first set.
   */
  const sets = [
    {
      label: OPS_CASE.docSets.awaitingReview[locale],
      docs: docs.filter(
        (d) => d.state === "checking" || d.state === "uploaded"
      ),
    },
    {
      label: OPS_CASE.docSets.alreadyJudged[locale],
      docs: docs.filter(
        (d) => d.state === "verified" || d.state === "flagged"
      ),
    },
    {
      label: OPS_CASE.docSets.notUploadedYet[locale],
      docs: docs.filter(
        (d) => d.state === "not_started" || d.state === "failed"
      ),
    },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={localizedOpsNav(locale)}
        name={profile.fullName}
        email={profile.email}
        subtitle={`${OPS_COMMON.subtitlePrefix[locale]} · ${OPS_COMMON.staffRole[actor.staffRole ?? "reviewer"][locale]}`}
        notifications={
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/ops"
          />
        }
      />

      <main>
        <Shell className="py-10 md:py-12">
          <Link
            href="/ops"
            className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-text hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden /> {OPS_CASE.backToQueue[locale]}
          </Link>

          {/* The same identity sheet the traveller's own profile opens
              with — the reviewer is looking at the same person, so the
              case head reads the same way on both sides of the desk. */}
          <Panel className="mt-6">
            <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4 px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <h1 className="t-h2">{row.travelerName || OPS_COMMON.unnamed[locale]}</h1>
                <p className="t-muted mt-2">
                  {row.travelerCountryIso.toUpperCase()} ·{" "}
                  {destination?.name ?? OPS_COMMON.routeNotSet[locale]}
                  {row.visaName ? ` · ${row.visaName}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={row.status} />
                  <Badge variant="outline">
                    <span className="num">{row.caseRef.toUpperCase()}</span>
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="t-muted">
                    {row.assigneeId ? (
                      <>
                        {OPS_CASE.ownedByPrefix[locale]}{" "}
                        <span className="font-semibold text-ink">
                          {row.assigneeName ?? OPS_COMMON.formerStaff[locale]}
                        </span>
                      </>
                    ) : (
                      OPS_CASE.unassignedNoOwner[locale]
                    )}
                  </p>
                  <ClaimButton
                    applicationId={row.id}
                    isAssigned={row.assigneeId !== null}
                    canRelease={row.assigneeId === actor.userId || isOwner(actor)}
                  />
                </div>
              </div>
              <p className="t-muted">
                <span className="num font-semibold text-ink">
                  {completion.verified}
                </span>{" "}
                {OPS_CASE.completion.of[locale]}{" "}
                <span className="num">{completion.total}</span>{" "}
                {OPS_CASE.completion.verified[locale]} ·{" "}
                <span className="num">{completion.collected}</span>{" "}
                {OPS_CASE.completion.uploaded[locale]}
              </p>
            </div>
          </Panel>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-6">
              {/* Notes are traveller-visible, so the panel says so — a
                  reviewer must never mistake this for an internal
                  scratchpad. */}
              <Panel>
                <PanelHeader
                  label={OPS_CASE.caseNotesPanel[locale]}
                  aside={<Badge variant="neutral">{OPS_CASE.travelerReadsThese[locale]}</Badge>}
                />
                <PanelBody>
                  <AddCaseNote applicationId={row.id} />
                  {notes.length > 0 && (
                    <ul className="mt-5 border-t border-border">
                      {notes.map((note) => (
                        <li
                          key={note.id}
                          className="border-b border-border py-3 last:border-b-0"
                        >
                          <p className="t-body max-w-[74ch]">{note.body}</p>
                          <p className="special mt-1.5">
                            {note.authorName ?? OPS_COMMON.formerStaff[locale]} ·{" "}
                            {note.createdAt.toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </PanelBody>
              </Panel>

              {docs.length === 0 && (
                <p className="t-muted max-w-[62ch]">{OPS_CASE.noChecklistYet[locale]}</p>
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
                            {OPS_COMMON.documentWord[set.docs.length === 1 ? "one" : "other"][locale]}
                          </Badge>
                        }
                      />
                      <div>
                        {set.docs.map((doc) => (
                          <ReviewRow
                            key={doc.id}
                            doc={doc}
                            applicationId={row.id}
                          />
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
                <PanelHeader label={OPS_CASE.decisionPanel[locale]} />
                <PanelBody>
                  <StatusControl applicationId={row.id} status={row.status} />
                </PanelBody>
              </Panel>

              {/* The same thread the traveller reads at `/app/messages`
                  — one composer, guarded by `canWriteMessages` on the
                  shared `sendMessage` action, not a staff-only copy of
                  it. */}
              <Panel>
                <PanelHeader label={MESSAGES.panelLabel[locale]} />
                <PanelBody>
                  <MessageThread messages={thread} />
                  <div className="mt-5 border-t border-border pt-5">
                    <MessageComposer applicationId={row.id} />
                  </div>
                </PanelBody>
              </Panel>

              {/* The traveller's declared travel history, which the desk
                  could not see until now — it existed only on the
                  traveller's own profile, so a reviewer checking a visa
                  form's "have you visited before" against the passport in
                  front of them had to ask for something already recorded.

                  Read-only, and not because staff cannot be trusted: this
                  is the traveller's own declaration, and a desk that can
                  quietly edit it destroys the only thing it is good for.
                  `TripList` takes no `action` here, so there is no
                  control to press — and `addTravelRecord` and
                  `removeTravelRecord` scope every write to the session's
                  own id regardless, so there is no route to one. */}
              <Panel>
                <PanelHeader
                  label={OPS_CASE.travelHistoryPanel[locale]}
                  aside={
                    trips.length > 0 ? (
                      <Badge variant="neutral">
                        <span className="num">{trips.length}</span>
                        {OPS_COMMON.tripWord[trips.length === 1 ? "one" : "other"][locale]}
                      </Badge>
                    ) : undefined
                  }
                />
                <PanelBody>
                  <TripList
                    trips={trips}
                    empty={OPS_CASE.noTrips[locale]}
                  />
                </PanelBody>
              </Panel>
            </div>
          </div>
        </Shell>
      </main>
    </div>
  );
}
