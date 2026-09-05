import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
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
import { ResendInvitationButton } from "@/components/employer/resend-invitation-button";
import { RevokeInvitationButton } from "@/components/employer/revoke-invitation-button";
import { homeFor } from "@/lib/auth/routes";
import {
  createOrganisationTx,
  provisionEmployerProfile,
} from "@/lib/data/organisations";
import { db, hasDatabaseEnv } from "@/lib/db/client";
import {
  applications,
  orgApplicationProgress,
  orgMembers,
  organisations,
} from "@/lib/db/schema";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { readPendingProfile } from "@/lib/domain/pending-profile";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getActor, getProfile } from "@/lib/data/applications";
import { listInvitations } from "@/lib/data/invitations";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Organisation console" };

/**
 * The `org_role` enum in words. This bar used to print a hard-coded
 * "HR" beside the organisation name — for everyone, including the
 * director who had just created the organisation and whom
 * `createOrganisationTx` writes as `owner`. So the one place the product
 * named your role was the one place it was reliably wrong, and it read
 * as a title assigned behind your back rather than a fact about the
 * account.
 */
const ROLE_LABEL: Record<"owner" | "hr_admin", string> = {
  owner: "Owner",
  hr_admin: "Administrator",
};

/** Why the account carries that role, said where the role is shown. */
const ROLE_REASON: Record<"owner" | "hr_admin", string> = {
  owner:
    "You are the owner because you created this organisation. Owners can invite people, manage the account and see everyone's progress.",
  hr_admin:
    "You are an administrator because an owner invited you into this organisation. Administrators can invite people and see everyone's progress.",
};

function formatDay(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** One line of lifecycle per invitation — the dates its status makes true. */
function invitationTimeline(invite: {
  status: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
}): string {
  switch (invite.status) {
    case "pending":
      return `Invited ${formatDay(invite.createdAt)} · expires ${formatDay(invite.expiresAt)}`;
    case "accepted":
      return `Accepted ${formatDay(invite.acceptedAt ?? invite.createdAt)}`;
    case "expired":
      return `Expired ${formatDay(invite.expiresAt)}`;
    default:
      return `Invited ${formatDay(invite.createdAt)}`;
  }
}

/**
 * Finish the profile write the sign-up form started, for a session that
 * arrived here holding credentials and nothing else. Returns whatever
 * exists afterwards, so the caller's own `/go` fallback still catches a
 * session Clerk cannot even name.
 */
async function recoverEmployer(): Promise<
  [Awaited<ReturnType<typeof getProfile>>, Awaited<ReturnType<typeof getActor>>]
> {
  const { userId } = await auth();
  if (!userId) return [null, null];

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return [null, null];

  await provisionEmployerProfile(
    userId,
    email,
    [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    readPendingProfile(user?.unsafeMetadata)
  );

  return Promise.all([getProfile(), getActor()]);
}

export default async function EmployerConsolePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  let [profile, actor] = await Promise.all([getProfile(), getActor()]);

  // A sign-up whose profile write was cancelled lands here moments after
  // creating an account, so try to finish that write before giving up on
  // it — see `provisionEmployerProfile`. Only then is `/go` the honest
  // answer, and `/go` rather than the employer door because the proxy
  // walks a signed-in visitor off every auth page and the two would
  // bounce at each other forever.
  if (!profile || !actor) {
    [profile, actor] = await recoverEmployer();
  }
  if (!profile || !actor) redirect("/go");

  // Staff belong in `/ops`, whatever else is true of their account.
  //
  // This used to sit inside the `!membership` branch below, which meant
  // it only fired for a staff account that owned no organisation — and
  // an account can hold both. A director who signs up, names an
  // organisation and is later promoted to reviewer has an `org_members`
  // row and the `staff` role at once, and walked straight into the
  // employer console: the one persona whose whole job is reading
  // documents, on the one screen built to promise that nobody here
  // reads them. Nothing was leaked (the console selects from the
  // progress view, which carries no document column) but the routing
  // said the opposite of what the product does.
  if (actor.role === "staff") redirect(homeFor(actor.role));

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
    // The organisation the director named on the sign-up form, finished
    // here rather than there.
    //
    // Everything after Clerk's `finalize()` is a POST from a page the
    // proxy is already walking the newly signed-in visitor off, so it
    // gets cancelled in flight often enough to be the normal case, not
    // the edge one — which is why `completeProfile` is retried and why
    // `recoverEmployer` above exists at all. A client call to
    // `createOrganisation` sat in exactly that gap and lost the name.
    //
    // So the name crosses inside Clerk's own record, and the first
    // server render that finds no membership spends it. Idempotent by
    // construction: `createOrganisationTx` locks the profile row and
    // refuses a second organisation, so a double render cannot make two.
    const { orgName } = readPendingProfile((await currentUser())?.unsafeMetadata);
    let pendingOrgError: string | null = null;
    if (orgName) {
      const created = await createOrganisationTx(profile.id, orgName);
      // Straight back through the front door, so the roster below reads
      // the membership this just wrote rather than a stale `undefined`.
      if (!("error" in created)) redirect("/employer");
      // Kept, not swallowed. This branch used to drop the refusal on the
      // floor: a director whose registered name ran past `NAME_MAX`
      // signed up successfully, landed here, and was shown a blank
      // "Name of organisation" form with no sign that what they had
      // already typed was rejected, or why. The form below says it.
      pendingOrgError = created.error;
    }

    // …but not everyone holding a session belongs at that door. Since
    // travellers became invite-only (2026-08-31) a new employer arrives
    // already holding `org_member`, written by `completeProfile` — but
    // the membership row still begins in `createOrganisationTx`, so the
    // role alone cannot decide who belongs here.
    //
    // Staff are already gone by this point. What is left to refuse is
    // the account `createOrganisationTx` refuses anyway, rather than
    // hand it a form guaranteed to fail at submit: a traveller already
    // mid-case, whose account is committed to the other side of the
    // privacy boundary. Keep this in step with that transaction — a
    // rule relaxed there and not here shows a dead form; the reverse
    // hides a live one.
    const [ownCase] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.travelerId, profile.id))
      .limit(1);
    if (ownCase) redirect(homeFor("traveler"));

    return (
      <div className="min-h-dvh bg-bg">
        <AppBar
          nav={[{ href: "/employer", label: "Dashboard" }]}
          name={profile.fullName}
          email={profile.email}
          subtitle="Organisation console"
        />
        <main>
          <Shell className="py-12">
            <Panel className="mx-auto max-w-[560px]">
              {/* "Name of", not "Name your". The field asks for the
                  registered name of a licensed travel agency, which is a
                  fact to be matched against a register — "name your
                  organisation" invites a label the director makes up. */}
              <PanelHeader label="Name of organisation" />
              <PanelBody>
                <p className="t-muted max-w-[62ch]">
                  Give the registered name, as it appears on your trading
                  licence. Once it exists you can invite your clients by
                  email — they complete their own intake, and you see
                  their progress here without their documents.
                </p>
                {/* Why the name they already gave did not take. Said
                    here rather than as a toast: this render is the first
                    thing they see after sign-up, and a toast fired
                    during it would be gone before they had read the
                    form. */}
                {pendingOrgError && (
                  <p
                    role="alert"
                    className="t-body mt-4 max-w-[62ch] text-danger-ink"
                  >
                    {pendingOrgError}
                  </p>
                )}
                <div className="mt-6">
                  <CreateOrganisation defaultName={orgName ?? ""} />
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
        nav={[{ href: "/employer", label: "Dashboard" }]}
        name={profile.fullName}
        email={profile.email}
        subtitle={org ? `${org.name} · ${ROLE_LABEL[org.role]}` : "Organisation console"}
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
              {/* The bar names your role; this says how you got it.
                  Seeing "Owner" appended to your account without ever
                  having chosen it is the kind of thing that reads as the
                  product knowing something about you that you don't. */}
              <p className="t-muted mt-2 max-w-[68ch]">
                {ROLE_REASON[org.role]}
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
                  You see progress, not documents
                </p>
                <p className="t-muted mt-2 max-w-[74ch]">
                  Passports, bank statements and police certificates stay
                  between the traveler and Toplance. You see the completion
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
                          "Route not set"}
                      </p>
                      <p className="special mt-1 truncate" title={r.visaName ?? ""}>
                        {r.visaName ?? "Route not set"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <Progress value={pct} className="flex-1" />
                        <span className="w-12 shrink-0 text-end text-base font-semibold">
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
                            "Destination not set"}
                        </p>
                        <p className="special mt-1 truncate">
                          {invitationTimeline(invite)}
                        </p>
                      </div>

                      <div className="lg:justify-self-end">
                        <InvitationStatusBadge status={invite.status} />
                      </div>

                      <div className="lg:justify-self-end">
                        {invite.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <ResendInvitationButton
                              invitationId={invite.id}
                              email={invite.email}
                            />
                            <RevokeInvitationButton invitationId={invite.id} />
                          </div>
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
