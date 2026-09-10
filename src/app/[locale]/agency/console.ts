import "server-only";

import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { homeFor } from "@/lib/auth/routes";
import {
  canReadDocuments,
  canReadMessages,
  type Actor,
  type Permission,
} from "@/lib/auth/policy";
import { getActor, getProfile } from "@/lib/data/applications";
import { hasActiveSubscription } from "@/lib/data/payments";
import { decideAgencyBilling } from "@/lib/payments/gates";
import { provisionEmployerProfile } from "@/lib/data/organisations";
import { db } from "@/lib/db/client";
import {
  applications,
  corridors,
  orgMembers,
  organisations,
  profiles,
  type Profile,
} from "@/lib/db/schema";
import { readPendingProfile } from "@/lib/domain/pending-profile";
import { isUuid } from "@/lib/domain/uuid";
import { withLocalePrefix } from "@/lib/i18n/paths";
import { getLocale } from "@/lib/i18n/server";

/** The agency this console is showing, as its own bar and header need it. */
export type AgencyMembership = {
  role: (typeof orgMembers.$inferSelect)["role"];
  name: string;
  seatsPurchased: number;
  /** When BeOrchid let this agency in, or `null` while KYB is open. */
  activatedAt: Date | null;
  /**
   * Storage key of the agency's logo, or `null` while it has none. Read
   * here rather than by `AgencyShell` on its own, because the director's
   * profile screen needs the same key to show them what they uploaded —
   * two reads of one column on one request is the drift this preamble
   * exists to prevent.
   */
  logoPath: string | null;
};

export type AgencyConsole = {
  profile: Profile;
  actor: Actor;
  /**
   * `null` for a director who has signed up but not yet named an
   * organisation. Only `/agency` renders that state — every other page
   * in the console is about a roster that does not exist yet.
   */
  membership: AgencyMembership | null;
  /**
   * The agency to read rosters for, from `actor.orgIds` rather than from
   * `membership` — that list already excludes suspended agencies, and a
   * membership row survives suspension. `null` means every roster read
   * on the page must return early rather than run unfiltered.
   */
  orgId: string | null;
  /**
   * Whether this agency has paid for the period it is in.
   *
   * Resolved on every console page because every console page is behind
   * it — see the redirect in `resolveAgencyConsole`. `false` for a
   * director who has not named an organisation yet, since there is
   * nothing to have paid for.
   */
  subscriptionActive: boolean;
  /**
   * Whether BeOrchid has finished this agency's KYB and opened its
   * console — `organisations.activated_at` is set.
   *
   * `false` for a director with no agency yet, for the same reason
   * `subscriptionActive` is: there is nothing to have been verified.
   */
  kybActivated: boolean;
};

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

/**
 * Who is at the organisation console, and which organisation it is.
 *
 * Every page under `/agency` opens with this. It used to be the top of
 * `page.tsx` and nothing else, because there was nothing else — the
 * roster and the invitations were panels on one screen. Splitting them
 * into their own routes turns that preamble into a rule three pages have
 * to agree on, and a guard pasted three times is a guard that is
 * eventually only enforced twice.
 */
export async function resolveAgencyConsole(
  /**
   * `allowUnpaid` exists for exactly one caller: `/agency/billing`, the
   * screen an unpaid agency is sent to. Without it that page would
   * redirect to itself, which is a loop rather than a paywall.
   *
   * `allowPending` is the same exemption one gate earlier, for
   * `/agency/verification` — the screen an agency BeOrchid has not let
   * in yet is sent to, which would likewise redirect to itself. The two
   * flags do not imply each other: see the checks below.
   */
  {
    allowUnpaid = false,
    allowPending = false,
  }: { allowUnpaid?: boolean; allowPending?: boolean } = {}
): Promise<AgencyConsole> {
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
  if (!profile || !actor) redirect(withLocalePrefix("/go", await getLocale()));

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

  const orgId = actor.orgIds[0] ?? null;

  /**
   * The membership row, correlated to `orgId` whenever there is one.
   *
   * The `where` used to be `userId` alone with a bare `limit(1)`, which
   * is an unordered pick over every `org_members` row the person holds.
   * That was survivable while the row was read only to put a name in the
   * bar. It stopped being survivable when `activated_at` joined the
   * select: an account holding a stale membership in a suspended,
   * never-activated agency alongside a live one would have the KYB gate
   * decided by whichever row Postgres happened to return — parking a
   * director on the holding screen for an agency that *is* activated,
   * with no way out.
   *
   * `hasActiveSubscription` and `purchaseSubscription` both ask about
   * `actor.orgIds[0]`, so asking anything else here is two guards
   * disagreeing about which agency the visitor is in — the exact shape
   * of bug #77, which the comment below this one is about.
   *
   * The `userId`-only fallback survives for the one case that needs it:
   * a member of a suspended agency has no live `orgId`, and the bar
   * still names the agency they belong to.
   */
  const [membership] = await db
    .select({
      role: orgMembers.role,
      name: organisations.name,
      seatsPurchased: organisations.seatsPurchased,
      logoPath: organisations.logoPath,
      activatedAt: organisations.activatedAt,
    })
    .from(orgMembers)
    .innerJoin(organisations, eq(organisations.id, orgMembers.orgId))
    .where(
      orgId
        ? and(eq(orgMembers.userId, profile.id), eq(orgMembers.orgId, orgId))
        : eq(orgMembers.userId, profile.id)
    )
    .limit(1);

  const subscriptionActive = orgId ? await hasActiveSubscription(orgId) : false;

  // The paywall, and it is here rather than in `requireAgencyConsole`
  // because the dashboard resolves the console directly. An unpaid
  // agency that could still read its own client roster would be a
  // paywall in name only.
  //
  // `name-organisation` is not redirected: that state is the dashboard's
  // to render, and it is the one page a director with no agency has.
  //
  // The question is asked of `orgId`, not of `membership`, and the two
  // differ for exactly one person: a member of a suspended agency, who
  // holds an `org_members` row that `liveMembershipsFor` has already
  // dropped. Reading the membership row here decided they owed money and
  // sent them to `/agency/billing` — a page that cannot open without an
  // `orgId` and redirects back, which the browser ends with
  // ERR_TOO_MANY_REDIRECTS. A suspended agency has no plan to buy: the
  // membership row below is read only so the bar can still name it.
  const kybActivated = !!membership?.activatedAt;
  const decision = decideAgencyBilling({
    hasOrganisation: !!orgId,
    kybActivated,
    subscriptionActive,
  });

  // Two independent checks, deliberately not a ladder.
  //
  // `/agency/billing` passes `allowUnpaid` and not `allowPending`, so a
  // director whose agency has not been let in yet is walked off the
  // billing screen to the holding screen — rather than shown a Pay
  // button by the very flag that exists to let the paywall render its
  // own escape hatch. Nesting the KYB check inside `!allowUnpaid` would
  // make the paywall's exemption the hole in the gate in front of it.
  /**
   * Prefixed, all three of them. The locale lives in the URL and nowhere
   * else — `src/proxy.ts` reads it off the path and there is no cookie
   * behind that — so a bare `redirect("/agency/verification")` does not
   * send a Hausa director to the holding screen. It sends them to the
   * English one.
   *
   * Every gated redirect in the product had this wrong, and the console
   * sweep is what found it: `/ar/agency/verification` reported
   * `dir="ltr"`, because an activated agency is redirected off that
   * screen and the redirect dropped the prefix.
   * `src/lib/i18n/redirects.test.ts` is the guard rail.
   */
  if (!allowPending && decision === "pending-verification") {
    redirect(withLocalePrefix("/agency/verification", await getLocale()));
  }
  if (!allowUnpaid && decision === "checkout") {
    redirect(withLocalePrefix("/agency/billing", await getLocale()));
  }

  return {
    profile,
    actor,
    membership: membership ?? null,
    orgId,
    subscriptionActive,
    kybActivated,
  };
}

/**
 * The same, for the pages that are nothing without an organisation.
 *
 * `/agency` is the one door in: it is where the organisation gets named,
 * and where a session that turns out to belong to a traveller mid-case
 * is sent onward. So a membership-less visitor to `/agency/clients` or
 * `/agency/team` is walked back to it rather than shown an empty roster
 * for an agency that does not exist.
 */
export async function requireAgencyConsole(): Promise<
  AgencyConsole & { membership: AgencyMembership }
> {
  const console_ = await resolveAgencyConsole();
  if (!console_.membership) redirect(withLocalePrefix("/agency", await getLocale()));

  return { ...console_, membership: console_.membership };
}

/** The assignee joined by a second alias — `profiles` is already the traveller. */
const handler = alias(profiles, "handler");

/** One client's case, as the case screen's header and panels need it. */
export type AgencyCase = {
  id: string;
  caseRef: string;
  status: (typeof applications.$inferSelect)["status"];
  orgId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  travelerId: string;
  travelerName: string;
  travelerEmail: string;
  travelerCountryIso: string | null;
  documentsExportedAt: Date | null;
  visaName: string | null;
  destinationIso: string | null;
};

/**
 * The case screen's gate: the console's own preamble, then the case,
 * then the question of whether this member may open it.
 *
 * `notFound()` for both a case that does not exist and one this person
 * may not read. The two must be indistinguishable — a 403 on a real id
 * and a 404 on a made-up one is an oracle for "does this agency have a
 * client with this case id", answerable by anyone with a session.
 *
 * The permission asked for is `canReadDocuments` rather than
 * `canReadApplication`, because documents are what this screen is: it
 * exists to show the files and take a verdict on them, so the narrowest
 * thing it renders is the right thing to gate the whole of it on.
 */
export async function requireAgencyCase(applicationId: string): Promise<{
  console: AgencyConsole & { membership: AgencyMembership };
  case: AgencyCase;
}> {
  return requireAgencyCaseFor(applicationId, canReadDocuments);
}

/**
 * The same gate for the thread-only screen, asked of `canReadMessages`.
 *
 * A separate door because the permissions are genuinely different sizes
 * now: an unheld case is the whole agency's to answer and nobody's to
 * read, so a colleague who may reach the conversation would be turned
 * away by `requireAgencyCase` — correctly, since that screen is the
 * documents.
 *
 * Two guards rather than one screen that renders differently per
 * viewer: a page whose panels each decide whether to appear is a page
 * where the next panel added decides nothing, and this is the boundary
 * that must not leak.
 */
export async function requireAgencyThread(applicationId: string): Promise<{
  console: AgencyConsole & { membership: AgencyMembership };
  case: AgencyCase;
}> {
  return requireAgencyCaseFor(applicationId, canReadMessages);
}

async function requireAgencyCaseFor(
  applicationId: string,
  permission: Permission
): Promise<{
  console: AgencyConsole & { membership: AgencyMembership };
  case: AgencyCase;
}> {
  // A typed URL like /agency/clients/1 would make Postgres throw on the
  // uuid cast below — a 500 where a wrong-but-well-formed id is already
  // a 404. A malformed id is the same answer as a missing one.
  if (!isUuid(applicationId)) notFound();

  const console_ = await requireAgencyConsole();

  const [row] = await db
    .select({
      id: applications.id,
      caseRef: applications.caseRef,
      status: applications.status,
      orgId: applications.orgId,
      assigneeId: applications.assigneeId,
      assigneeName: handler.fullName,
      travelerId: applications.travelerId,
      travelerName: profiles.fullName,
      travelerEmail: profiles.email,
      travelerCountryIso: profiles.countryIso,
      // When the pack was first taken away, which is the whole of what
      // licenses the decision panel to ask whether the case is lodged.
      // See the column's own note in `schema.ts`.
      documentsExportedAt: applications.documentsExportedAt,
      visaName: corridors.visaName,
      destinationIso: corridors.destinationIso,
    })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    .leftJoin(corridors, eq(corridors.id, applications.corridorId))
    .leftJoin(handler, eq(handler.id, applications.assigneeId))
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!row) notFound();
  if (!permission(console_.actor, row)) notFound();

  return { console: console_, case: row };
}
