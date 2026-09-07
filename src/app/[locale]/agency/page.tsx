import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ArrowRight, Shield } from "lucide-react";
import { eq } from "drizzle-orm";

import { AppBar } from "@/components/app/app-bar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Shell } from "@/components/shared/shell";
import { CreateOrganisation } from "@/components/agency/create-organisation";
import { agencyNav } from "@/components/agency/agency-nav";
import { ConsoleBand } from "@/components/agency/console-band";
import { InviteDialog } from "@/components/agency/invite-dialog";
import { homeFor } from "@/lib/auth/routes";
import { createOrganisationTx } from "@/lib/data/organisations";
import { db, hasDatabaseEnv } from "@/lib/db/client";
import { applications } from "@/lib/db/schema";
import { readPendingProfile } from "@/lib/domain/pending-profile";
import { SetupNotice } from "@/components/shared/setup-notice";
import { listInvitations } from "@/lib/data/invitations";
import { countOrgClients, listOrgMembers } from "@/lib/data/organisations";
import { getLocale } from "@/lib/i18n/server";
import { AGENCY } from "@/lib/i18n/agency";
import { fill } from "@/lib/i18n/fill";
import { resolveAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.pageTitle[locale] };
}

/**
 * The `org_role` enum in words, in every locale — see `AGENCY.roleLabel`
 * in `src/lib/i18n/agency.ts`. This bar used to print a hard-coded "HR"
 * beside the organisation name — for everyone, including the director who
 * had just created the organisation and whom `createOrganisationTx`
 * writes as `owner`. So the one place the product named your role was the
 * one place it was reliably wrong, and it read as a title assigned behind
 * your back rather than a fact about the account.
 */
const ROLE_LABEL = AGENCY.roleLabel;

/**
 * Why the account carries that role, said where the role is shown — see
 * `AGENCY.roleReason`.
 */
const ROLE_REASON = AGENCY.roleReason;

/**
 * One of the two rosters, as a card that says how big it is and opens
 * it. The console's front page is a summary now that the roster and the
 * team each have a route of their own — the counts here are the only
 * thing this page can honestly say about two lists it no longer holds.
 */
function RosterCard({
  href,
  label,
  body,
  count,
  countWord,
}: {
  href: string;
  label: string;
  body: string;
  count: number;
  countWord: string;
}) {
  return (
    <Link href={href} className="group block rounded-lg">
      <Panel className="h-full transition-colors group-hover:border-border-strong">
        <PanelHeader
          label={label}
          // The arrow rather than a second "People" under the body: the
          // card is one link, and naming the destination twice inside it
          // reads as two.
          aside={
            <span className="flex items-center gap-3">
              <Badge variant="brand">
                <span className="num">{count}</span>
                {countWord}
              </Badge>
              <ArrowRight
                className="size-5 shrink-0 text-brand-text transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          }
        />
        <PanelBody>
          <p className="t-muted max-w-[62ch]">{body}</p>
        </PanelBody>
      </Panel>
    </Link>
  );
}

export default async function EmployerConsolePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  // Identity, role and membership — the preamble every page under
  // `/agency` shares, and the redirects that go with it.
  const { profile, actor, membership, orgId } = await resolveAgencyConsole();

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
    // `recoverEmployer` in `console.ts` exists at all. A client call to
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
      if (!("error" in created)) redirect("/agency");
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
          nav={agencyNav({ locale, hasOrganisation: false })}
          name={profile.fullName}
          email={profile.email}
          subtitle={AGENCY.pageTitle[locale]}
        />
        <main>
          <Shell className="py-12">
            <Panel className="mx-auto max-w-[560px]">
              {/* "Name of", not "Name your". The field asks for the
                  registered name of a licensed travel agency, which is a
                  fact to be matched against a register — "name your
                  organisation" invites a label the director makes up. */}
              <PanelHeader label={AGENCY.nameOrgLabel[locale]} />
              <PanelBody>
                <p className="t-muted max-w-[62ch]">
                  {AGENCY.nameOrgBody[locale]}
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

  // Counts, not contents. The rows themselves are rendered by
  // `/agency/clients` and `/agency/team`; what this page needs from each
  // list is its length, and one query per list is what it takes to know
  // that honestly.
  //
  // The client count is the agency's, not the viewer's: it is divided by
  // `seats_purchased` below, and `listOrgRoster` is scoped to the cases
  // this member may open — which would make seat usage read differently
  // for a reviewer than for their director.
  const [used, members, invitations] = await Promise.all([
    countOrgClients(actor.orgIds),
    // Same "no org, no unfiltered read" reasoning as the roster: both of
    // these take one org id and have nothing to filter by without it.
    orgId ? listOrgMembers(orgId) : Promise.resolve([]),
    orgId ? listInvitations(orgId) : Promise.resolve([]),
  ]);
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  const org = membership;
  const seats = org.seatsPurchased ?? 0;

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={agencyNav({ locale, hasOrganisation: true })}
        name={profile.fullName}
        email={profile.email}
        subtitle={`${org.name} · ${ROLE_LABEL[org.role][locale]}`}
      />

      <ConsoleBand
        title={org.name || AGENCY.yourOrganisationFallback[locale]}
        action={<InviteDialog canInviteStaff={org.role === "owner"} />}
      >
        {/*
          "0 of 0 seats in use" is a sentence made of two facts we
          do not have. Seats are a placeholder until the client
          sets them (§7), so with no seat count the line states the
          number that is real and says the other is not set.
        */}
        <p className="t-muted mt-2">
          {seats > 0
            ? fill(AGENCY.seatsInUse[locale], { used, seats })
            : fill(
                (used === 1
                  ? AGENCY.seatCountNotSetOne
                  : AGENCY.seatCountNotSetOther)[locale],
                { used }
              )}
          {pendingInvitations.length > 0 &&
            fill(
              (pendingInvitations.length === 1
                ? AGENCY.pendingSuffixOne
                : AGENCY.pendingSuffixOther)[locale],
              { n: pendingInvitations.length }
            )}
        </p>
        {/* The bar names your role; this says how you got it.
            Seeing "Owner" appended to your account without ever
            having chosen it is the kind of thing that reads as the
            product knowing something about you that you don't. */}
        <p className="t-muted mt-2 max-w-[68ch]">{ROLE_REASON[org.role][locale]}</p>
        {seats > 0 && (
          <Progress value={(used / seats) * 100} className="mt-4 max-w-[320px]" />
        )}
      </ConsoleBand>

      <main>
        <Shell className="py-12">
          {/*
            The signature moment for this console, per guideline §4, and
            still the right one — though no longer for the reason it was
            written. It used to promise the reader that this screen would
            never show them a passport; v1.3 moved the review boundary to
            the agency, so now it does. What a director most needs to
            believe is therefore no longer "not me" but "not anyone
            else": nobody at BeOrchid can open these documents, and
            inside their own agency a claimed case narrows to its handler
            and to them. One laminate, on the page you land on, and none
            below it — which is also why the two roster pages do not
            repeat it.

            No MRZ. The mark carries a corridor, and this screen is a
            roster of many — there is no one corridor here to encode.
          */}
          <div className="laminate overflow-hidden rounded-lg">
            <span aria-hidden className="laminate-sheen" />
            <div className="relative z-[1] flex items-start gap-4 p-6">
              <Shield className="mt-0.5 size-6 shrink-0 text-brand-text" aria-hidden />
              <div className="min-w-0">
                <p className="tag">{AGENCY.privacyTag[locale]}</p>
                <p className="d-sm mt-2 text-ink">{AGENCY.privacyHeading[locale]}</p>
                <p className="t-muted mt-2 max-w-[74ch]">
                  {AGENCY.privacyBody[locale]}
                </p>
              </div>
            </div>
          </div>

          {/* The two rosters, as the doors to their own pages. Equal
              weight on purpose: an agency is its clients and the people
              who serve them, and the console used to show only the
              first. */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <RosterCard
              href="/agency/clients"
              label={AGENCY.navClients[locale]}
              body={AGENCY.clientsCardBody[locale]}
              count={used}
              countWord={(used === 1 ? AGENCY.clientWord : AGENCY.clientsWord)[locale]}
            />
            <RosterCard
              href="/agency/team"
              label={AGENCY.navTeam[locale]}
              body={AGENCY.teamCardBody[locale]}
              count={members.length}
              countWord={
                (members.length === 1 ? AGENCY.memberWord : AGENCY.membersWord)[locale]
              }
            />
          </div>
        </Shell>
      </main>
    </div>
  );
}
