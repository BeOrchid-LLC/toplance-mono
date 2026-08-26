import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { desc, eq, inArray } from "drizzle-orm";

import { AppBar } from "@/components/app/app-bar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { InvitationStatusBadge, StatusBadge } from "@/components/shared/status-badge";
import { Shell } from "@/components/shared/shell";
import { CreateOrganisation } from "@/components/employer/create-organisation";
import { InviteDialog } from "@/components/employer/invite-dialog";
import { RevokeInvitationButton } from "@/components/employer/revoke-invitation-button";
import { db, hasDatabaseEnv } from "@/lib/db/client";
import {
  orgApplicationProgress,
  orgMembers,
  organisations,
} from "@/lib/db/schema";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getActor, getProfile } from "@/lib/data/applications";
import { listInvitations } from "@/lib/data/invitations";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Organisation console" };

export default async function EmployerConsolePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const [profile, actor] = await Promise.all([getProfile(), getActor()]);
  if (!profile || !actor) redirect("/employer/sign-in?next=/employer");

  const [membership] = await db
    .select({
      role: orgMembers.role,
      name: organisations.name,
      seatsPurchased: organisations.seatsPurchased,
    })
    .from(orgMembers)
    .innerJoin(organisations, eq(organisations.id, orgMembers.orgId))
    .where(eq(orgMembers.userId, profile.id))
    .limit(1);

  // No org row for this person yet — sign-up created the account but
  // not the organisation, or seed data never ran. The roster, seat
  // count and privacy laminate below all assume an organisation exists;
  // rendering them here would either crash on `org.name` or show a
  // "0 people" roster for an org that was never created. This is the
  // only door in: name one, then the branch below takes over.
  if (!membership) {
    return (
      <div className="min-h-dvh bg-bg">
        <AppBar
          nav={[{ href: "/employer", label: "People" }]}
          name={profile.fullName}
          email={profile.email}
          subtitle="Organisation console"
        />
        <main>
          <Shell className="py-12">
            <Panel className="mx-auto max-w-[560px]">
              <PanelHeader label="Name your organisation" />
              <PanelBody>
                <p className="t-muted max-w-[62ch]">
                  Once it exists you can sponsor seats and invite your
                  people by email — they complete their own intake, and
                  you see their progress here, never their documents.
                </p>
                <div className="mt-6">
                  <CreateOrganisation />
                </div>
              </PanelBody>
            </Panel>
          </Shell>
        </main>
      </div>
    );
  }

  /**
   * Read through the progress view, never the applications table
   * directly. The view carries no column that could reveal a document,
   * so this console cannot leak one even by accident.
   *
   * The `where` is not a convenience. RLS used to scope this view to the
   * caller's own organisation; with RLS gone, an unfiltered select
   * returns every sponsored traveller on the platform. An empty
   * `orgIds` therefore has to return early rather than fall through to a
   * query with no restriction.
   */
  const rows = actor.orgIds.length
    ? await db
        .select()
        .from(orgApplicationProgress)
        .where(inArray(orgApplicationProgress.orgId, [...actor.orgIds]))
        .orderBy(desc(orgApplicationProgress.completionPct))
    : [];

  // Same "no org, no unfiltered read" reasoning as the roster above:
  // `listInvitations` takes one org id and has nothing to filter by
  // without it.
  const orgId = actor.orgIds[0];
  const invitations = orgId ? await listInvitations(orgId) : [];
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  const org = membership ?? undefined;
  const used = rows.length;
  const seats = org?.seatsPurchased ?? 0;

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={[{ href: "/employer", label: "People" }]}
        name={profile.fullName}
        email={profile.email}
        subtitle={org ? `${org.name} · HR` : "Organisation console"}
      />

      {/* The ruled ground the laminate below refracts. Without it the
          backdrop-filter has nothing to bend and costs a frame to draw
          nothing. */}
      <div className="relative isolate">
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px]"
        />

        <Shell className="pt-10">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <h1 className="t-h2">{org?.name ?? "Your organisation"}</h1>
              {/*
                "0 of 0 seats in use" is a sentence made of two facts we
                do not have. Seats are a placeholder until the client
                sets them (§7), so with no seat count the line states the
                number that is real and says the other is not set.
              */}
              <p className="t-muted mt-2">
                {seats > 0
                  ? `${used} of ${seats} seats in use`
                  : `${used} ${used === 1 ? "person" : "people"} · seat count not set yet`}
                {pendingInvitations.length > 0 &&
                  ` · ${pendingInvitations.length} invitation${pendingInvitations.length === 1 ? "" : "s"} pending`}
              </p>
              {seats > 0 && (
                <Progress
                  value={(used / seats) * 100}
                  className="mt-4 max-w-[320px]"
                />
              )}
            </div>
            <InviteDialog />
          </div>

          {/*
            The signature moment for this console, per guideline §4. It is
            the right one: the single thing an HR administrator most needs
            to believe about this screen is the thing it will not show
            them, and that promise is what the whole roster is built
            around. One laminate, at the top, and none below it.

            No MRZ. The mark carries a corridor, and this screen is a
            roster of many — there is no one corridor here to encode.
          */}
          <div className="laminate mt-10 overflow-hidden rounded-lg">
            <span aria-hidden className="laminate-sheen" />
            <div className="relative z-[1] flex items-start gap-4 p-6">
              <Shield className="mt-0.5 size-6 shrink-0 text-brand-text" aria-hidden />
              <div className="min-w-0">
                <p className="tag">The privacy boundary</p>
                <p className="d-sm mt-2 text-ink">
                  You see progress, never documents
                </p>
                <p className="t-muted mt-2 max-w-[74ch]">
                  Passports, bank statements and police certificates stay
                  between the traveller and Toplance. You see the completion
                  score, the status and whether someone is stuck.
                </p>
              </div>
            </div>
          </div>
        </Shell>
      </div>

      <main>
        <Shell className="py-12">
          {/* One sheet in the case file: the roster is a single object —
              the people this organisation is responsible for — so it is
              one card with ruled rows inside, not a stack of boxes. */}
          <Panel>
            <PanelHeader
              label="Your people"
              aside={
                <Badge variant="brand">
                  <span className="num">{used}</span>
                  {used === 1 ? "person" : "people"}
                </Badge>
              }
            />

          {rows.length === 0 ? (
            <PanelBody>
              <p className="t-muted max-w-[62ch]">
                Nobody yet. Once you invite someone and they finish intake, they
                appear here with a live completion score.
              </p>
            </PanelBody>
          ) : (
            /*
              Ruled rows, not a table. Four columns with a progress bar in
              one of them has no honest 390px form — it either scrolls
              sideways or collapses into unlabelled fragments — and §6
              prefers rules anyway. Each person is one row that reflows.
            */
            <ul>
              {rows.map((r) => {
                const destination = countryFromIso2(r.destinationIso);
                const pct = r.completionPct ?? 0;
                return (
                  <li
                    key={r.id}
                    className="grid gap-x-8 gap-y-3 border-b border-border px-5 py-5 last:border-b-0 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="t-title truncate" title={r.fullName ?? ""}>
                        {r.fullName}
                      </p>
                      <p className="special mt-1">{r.caseRef}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="t-body truncate">
                        {destination?.name ??
                          r.destinationIso?.toUpperCase() ??
                          "Corridor not set"}
                      </p>
                      <p className="special mt-1 truncate" title={r.visaName ?? ""}>
                        {r.visaName ?? "Corridor not set"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <Progress value={pct} className="flex-1" />
                        <span className="w-12 shrink-0 text-right text-base font-semibold">
                          {pct}%
                        </span>
                      </div>
                      <p className="special mt-1">
                        {r.documentsVerified ?? 0} of {r.documentsTotal ?? 0}{" "}
                        verified
                      </p>
                    </div>

                    <div className="lg:justify-self-end">
                      {r.status && <StatusBadge status={r.status} short />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </Panel>

          {/* A second sheet, not a section inside the first: invitations
              and the roster are different objects — one is people who
              exist, the other is emails nobody has answered yet. */}
          <Panel className="mt-8">
            <PanelHeader
              label="Invitations"
              aside={
                <Badge variant="neutral">
                  <span className="num">{pendingInvitations.length}</span>
                  pending
                </Badge>
              }
            />

            {invitations.length === 0 ? (
              <PanelBody>
                <p className="t-muted max-w-[62ch]">
                  Nobody has been invited yet. Send an invitation and it
                  appears here until it is accepted, revoked or expires.
                </p>
              </PanelBody>
            ) : (
              <ul>
                {invitations.map((invite) => {
                  const destination = countryFromIso2(invite.destinationIso);
                  return (
                    <li
                      key={invite.id}
                      className="grid gap-x-8 gap-y-3 border-b border-border px-5 py-5 last:border-b-0 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="t-title truncate" title={invite.email}>
                          {invite.fullName || invite.email}
                        </p>
                        {invite.fullName && (
                          <p className="special mt-1 truncate">{invite.email}</p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="t-body truncate">
                          {destination?.name ??
                            invite.destinationIso?.toUpperCase() ??
                            "Not set"}
                        </p>
                      </div>

                      <div className="lg:justify-self-end">
                        <InvitationStatusBadge status={invite.status} />
                      </div>

                      <div className="lg:justify-self-end">
                        {invite.status === "pending" && (
                          <RevokeInvitationButton invitationId={invite.id} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </Shell>
      </main>
    </div>
  );
}
