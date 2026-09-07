import "server-only";

import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { homeFor } from "@/lib/auth/routes";
import { canReadDocuments, type Actor } from "@/lib/auth/policy";
import { getActor, getProfile } from "@/lib/data/applications";
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

/** The agency this console is showing, as its own bar and header need it. */
export type AgencyMembership = {
  role: (typeof orgMembers.$inferSelect)["role"];
  name: string;
  seatsPurchased: number;
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
export async function resolveAgencyConsole(): Promise<AgencyConsole> {
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

  return {
    profile,
    actor,
    membership: membership ?? null,
    orgId: actor.orgIds[0] ?? null,
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
  if (!console_.membership) redirect("/agency");

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
  if (!canReadDocuments(console_.actor, row)) notFound();

  return { console: console_, case: row };
}
