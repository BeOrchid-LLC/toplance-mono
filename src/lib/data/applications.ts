import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  corridors,
  documents,
  intakeAnswers,
  orgMembers,
  profiles,
  type Application,
  type DocumentRow,
  type Profile,
} from "@/lib/db/schema";
import type { Actor } from "@/lib/auth/policy";

export type { Application, DocumentRow, Profile };

export type Completion = { total: number; verified: number; pct: number };

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

  const [created] = await db
    .insert(applications)
    .values({ travelerId: profile.id })
    .returning();

  return created ?? null;
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
 */
export function completionOf(docs: DocumentRow[]): Completion {
  const required = docs.filter((d) => d.isRequired);
  const verified = required.filter((d) => d.state === "verified").length;
  const total = required.length;
  return {
    total,
    verified,
    pct: total === 0 ? 0 : Math.round((100 * verified) / total),
  };
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
