import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { ReviewRow } from "@/components/ops/review-row";
import { StatusControl } from "@/components/ops/status-control";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Shell } from "@/components/shared/shell";
import { SetupNotice } from "@/components/shared/setup-notice";
import { db, hasDatabaseEnv } from "@/lib/db/client";
import { applications, corridors, profiles } from "@/lib/db/schema";
import { countryFromIso2 } from "@/lib/domain/corridors";
import {
  completionOf,
  getActor,
  getDocuments,
  getProfile,
} from "@/lib/data/applications";
import { getCaseNotes } from "@/lib/data/case-notes";
import { listMessages, markThreadRead } from "@/lib/data/messages";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { isOwner, isStaff } from "@/lib/auth/policy";

const assignee = alias(profiles, "assignee");

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Case review" };

export default async function OpsCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const { id } = await params;

  const [profile, actor] = await Promise.all([getProfile(), getActor()]);
  if (!profile || !actor) redirect(`/ops/sign-in?next=/ops`);

  // The same honest refusal the queue shows — see /ops.
  if (!isStaff(actor)) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="max-w-[440px] text-center">
          <h1 className="t-h2">This console is for Toplance staff</h1>
          <p className="t-muted mt-3">
            Your account does not have operations access. If that is wrong, ask
            a Director to set your role — it cannot be granted from this screen.
          </p>
        </div>
      </div>
    );
  }

  const [row] = await db
    .select({
      id: applications.id,
      caseRef: applications.caseRef,
      status: applications.status,
      assigneeId: applications.assigneeId,
      assigneeName: assignee.fullName,
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

  const [docs, notes, thread, notifications, unreadCount] = await Promise.all([
    getDocuments(row.id),
    getCaseNotes(row.id),
    listMessages(row.id),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
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
      label: "Awaiting review",
      docs: docs.filter(
        (d) => d.state === "checking" || d.state === "uploaded"
      ),
    },
    {
      label: "Already judged",
      docs: docs.filter(
        (d) => d.state === "verified" || d.state === "flagged"
      ),
    },
    {
      label: "Not uploaded yet",
      docs: docs.filter(
        (d) => d.state === "not_started" || d.state === "failed"
      ),
    },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={[{ href: "/ops", label: "Case queue" }]}
        name={profile.fullName}
        email={profile.email}
        subtitle={`Toplance operations · ${actor.staffRole ?? "reviewer"}`}
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
            <ArrowLeft className="size-4" aria-hidden /> Back to the queue
          </Link>

          {/* The same identity sheet the traveller's own profile opens
              with — the reviewer is looking at the same person, so the
              case head reads the same way on both sides of the desk. */}
          <Panel className="mt-6">
            <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4 px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <h1 className="t-h2">{row.travelerName || "Unnamed"}</h1>
                <p className="t-muted mt-2">
                  {row.travelerCountryIso.toUpperCase()} ·{" "}
                  {destination?.name ?? "Corridor not set"}
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
                        Owned by{" "}
                        <span className="font-semibold text-ink">
                          {row.assigneeName ?? "Former staff"}
                        </span>
                      </>
                    ) : (
                      "Unassigned — no owner yet"
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
                of <span className="num">{completion.total}</span> verified ·{" "}
                <span className="num">{completion.collected}</span> uploaded
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
                  label="Case notes"
                  aside={<Badge variant="neutral">Traveller reads these</Badge>}
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
                            {note.authorName ?? "Former staff"} ·{" "}
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
                <p className="t-muted max-w-[62ch]">
                  No checklist yet — this traveller has not finished intake.
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
                            {set.docs.length === 1 ? "document" : "documents"}
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
                <PanelHeader label="Decision" />
                <PanelBody>
                  <StatusControl applicationId={row.id} status={row.status} />
                </PanelBody>
              </Panel>

              {/* The same thread the traveller reads at `/app/messages`
                  — one composer, guarded by `canWriteMessages` on the
                  shared `sendMessage` action, not a staff-only copy of
                  it. */}
              <Panel>
                <PanelHeader label="Messages" />
                <PanelBody>
                  <MessageThread messages={thread} />
                  <div className="mt-5 border-t border-border pt-5">
                    <MessageComposer applicationId={row.id} />
                  </div>
                </PanelBody>
              </Panel>
            </div>
          </div>
        </Shell>
      </main>
    </div>
  );
}
