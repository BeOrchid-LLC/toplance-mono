import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  corridors,
  documents,
  intakeAnswers,
  itineraries,
  orgMembers,
  organisations,
  profiles,
  statusEvents,
  type Application,
  type DocumentRow,
  type Profile,
} from "@/lib/db/schema";
import type { Actor } from "@/lib/auth/policy";

export type { Application, DocumentRow, Profile };

export type Completion = {
  total: number;
  verified: number;
  collected: number;
  pct: number;
};

/**
 * The signed-in user's profile, created on first sight.
 *
 * Provisioning happens here rather than in a Clerk webhook so a user can
 * never reach the app without a profile row: a webhook that is slow,
 * retried or misconfigured would leave them in exactly that state, and
 * every foreign key in this schema points at `profiles.id`.
 */
export async function getProfile(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (existing) return existing;

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const [created] = await db
    .insert(profiles)
    .values({
      id: userId,
      email,
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    })
    .onConflictDoNothing()
    .returning();

  // `onConflictDoNothing` returns nothing when another request won the
  // race, so fall back to reading the row it wrote rather than telling
  // the caller there is no profile.
  if (created) return created;

  const [raced] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return raced ?? null;
}

/**
 * The profile plus everything an access decision needs, in the shape
 * `@/lib/auth/policy` expects. Roles live in Postgres, never in Clerk
 * metadata, so this is the only place they are read from.
 */
export async function getActor(): Promise<Actor | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const memberships = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, profile.id));

  return {
    userId: profile.id,
    role: profile.role,
    staffRole: profile.staffRole ?? null,
    orgIds: memberships.map((m) => m.orgId),
  };
}

/**
 * A traveller has one application in flight at a time. This returns it,
 * creating a draft on first visit so the intake agent always has
 * somewhere to write answers.
 */
export async function getOrCreateApplication(): Promise<Application | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const [existing] = await db
    .select()
    .from(applications)
    .where(eq(applications.travelerId, profile.id))
    .orderBy(desc(applications.createdAt))
    .limit(1);

  if (existing) return existing;

  // Only a traveller owns an application. The `(app)` layout already
  // turns anyone else away, but a layout's `redirect()` does not stop
  // the segments beneath it — Next renders them concurrently, and they
  // call this too — so the invariant is kept here, at the write, rather
  // than at one of nine call sites.
  if (profile.role !== "traveler") return null;

  // The layout and the page it wraps both resolve the application
  // concurrently, so first visits race here. Same shape as the profile
  // provisioning above: whoever loses the insert reads the winner's row.
  const [created] = await db
    .insert(applications)
    .values({ travelerId: profile.id })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [raced] = await db
    .select()
    .from(applications)
    .where(eq(applications.travelerId, profile.id))
    .limit(1);

  return raced ?? null;
}

export async function getIntakeAnswers(applicationId: string) {
  const rows = await db
    .select({
      questionKey: intakeAnswers.questionKey,
      value: intakeAnswers.value,
    })
    .from(intakeAnswers)
    .where(eq(intakeAnswers.applicationId, applicationId));

  return Object.fromEntries(rows.map((r) => [r.questionKey, r.value]));
}

export async function getDocuments(applicationId: string): Promise<DocumentRow[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.applicationId, applicationId))
    .orderBy(documents.sortOrder);
}

/**
 * One definition of "percent complete", shared by the traveller's
 * dashboard, the reviewer's queue and the employer's roster. Optional
 * documents are excluded so an applicant is never held below 100% by a
 * document nobody requires.
 *
 * The percentage measures *collecting*: a document counts once it is
 * uploaded and either awaiting or past review. Keying it on `verified`
 * alone held the ring at 0% for the whole collecting phase, which reads
 * as "nothing happened" right after an upload. `verified` is still
 * reported on its own because submission gates on it — a file full of
 * `checking` documents is 100% collected and still not submittable.
 */
export function completionOf(docs: DocumentRow[]): Completion {
  const required = docs.filter((d) => d.isRequired);
  const verified = required.filter((d) => d.state === "verified").length;
  const collected = required.filter(
    (d) => d.state === "checking" || d.state === "verified"
  ).length;
  const total = required.length;
  return {
    total,
    verified,
    collected,
    pct: total === 0 ? 0 : Math.round((100 * collected) / total),
  };
}

/**
 * The application's status history, newest first. Written on every
 * transition (`submitApplicationTx` today); read by the profile's
 * timeline behind `canReadStatusEvents`.
 */
export async function getStatusEvents(applicationId: string) {
  return db
    .select()
    .from(statusEvents)
    .where(eq(statusEvents.applicationId, applicationId))
    .orderBy(desc(statusEvents.createdAt));
}

/**
 * The application's itinerary, if one has been generated.
 * `generateAndStoreItinerary` in `@/lib/ai/itinerary` is the only
 * writer; nothing calls it yet, so every caller today still renders the
 * empty state, but the read surface and its `canReadItinerary` guard are
 * exactly where that generation lands its output.
 */
export async function getItinerary(applicationId: string) {
  const [row] = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.applicationId, applicationId))
    .limit(1);
  return row ?? null;
}

/**
 * A traveller's profile, resolved through the application row rather
 * than the caller's own session. `getProfile` above only ever answers
 * "who is signed in"; the itinerary generator runs for the approval
 * that triggers it, not for the traveller, so it has an application id
 * and needs the profile on the other end of it.
 */
export async function getTravellerProfile(
  applicationId: string
): Promise<Profile | null> {
  const [row] = await db
    .select({ profile: profiles })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    .where(eq(applications.id, applicationId))
    .limit(1);

  return row?.profile ?? null;
}

export async function getCorridorFor(applicationId: string) {
  const [row] = await db
    .select({ corridor: corridors })
    .from(applications)
    .innerJoin(corridors, eq(corridors.id, applications.corridorId))
    .where(eq(applications.id, applicationId))
    .limit(1);

  return row?.corridor ?? null;
}

/**
 * The sponsoring organisation's name, for the one line the profile page
 * shows a traveller whose application carries an `orgId` — "Sponsored by
 * «name»". A `null` `orgId` (the common case: most travellers pay for
 * themselves) short-circuits before touching the database, since there
 * is nothing to look up.
 */
export async function getOrgName(orgId: string | null): Promise<string | null> {
  if (!orgId) return null;

  const [row] = await db
    .select({ name: organisations.name })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);

  return row?.name ?? null;
}
