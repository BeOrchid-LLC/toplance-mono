import "server-only";

import { asc, eq } from "drizzle-orm";

import type { StaffRole } from "@/lib/auth/policy";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import {
  refuseColleagueAct,
  type ColleagueAct,
  type ColleagueRefusal,
} from "@/lib/domain/colleague-actions";

/**
 * One person who actually holds a BeOrchid console account.
 *
 * Distinct from `PlatformStaff` in `@/lib/data/demo-requests`, which is
 * the assignee picker's shape and carries no rank: a picker needs a name
 * to put in a dropdown, and the colleagues roster needs to say who is a
 * director. Kept apart rather than widened, so the enquiry screen does
 * not start reading a column it has no use for.
 */
export type StaffColleague = {
  id: string;
  fullName: string;
  email: string;
  /**
   * `null` for a staff account made before `staff_role` was written by
   * anything but hand-run SQL. Read as "reviewer" wherever it is shown,
   * the same default `isOwner` applies — the rank that grants nothing.
   */
  staffRole: StaffRole | null;
  /**
   * When a director closed this account, or null while it is live. The
   * roster shows every colleague either way — a suspended person is
   * still a colleague, and hiding them is how somebody stays suspended
   * for a month because nobody could see it had happened.
   */
  suspendedAt: Date | null;
  createdAt: Date;
};

/**
 * Everyone who works at BeOrchid, newest last.
 *
 * `role = 'staff'` is the whole filter, because it is the whole
 * definition: `staff_role_only_for_staff` already forbids a rank on any
 * other row, so there is no such thing as a director who is not staff.
 *
 * Ordered by arrival rather than by name. The list is short and its
 * question is "who joined, and when" — a roster sorted alphabetically
 * puts the person hired this morning in the middle of it.
 */
export async function listStaffColleagues(): Promise<StaffColleague[]> {
  return db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      staffRole: profiles.staffRole,
      suspendedAt: profiles.suspendedAt,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.role, "staff"))
    .orderBy(asc(profiles.createdAt));
}

/**
 * Whether this account is suspended — one indexed primary-key lookup,
 * for `requireStaffAction`.
 *
 * A boolean rather than the timestamp, because the gate has no use for
 * the date and returning it would invite a caller to render it on a
 * screen a suspended person cannot open.
 */
export async function isSuspendedColleague(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ suspendedAt: profiles.suspendedAt })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return Boolean(row?.suspendedAt);
}

/**
 * Every act on a colleague, decided and committed under one lock.
 *
 * The lock covers every staff row, not the one being written, for the
 * reason `setMemberRole` sets out at length: "is there another director
 * left" is a question about the whole owner set, and locking only the
 * target lets two directors demote each other on counts that were each
 * true when read and false when committed. Here the owner set is the
 * staff table itself — `role = 'staff'` is the whole of it — so that is
 * what `for("update")` holds.
 *
 * Every act takes the same lock over the same row set, so two of them
 * queue rather than race, and they always attempt it in the same order,
 * so they cannot form a cycle.
 *
 * The rules themselves live in `@/lib/domain/colleague-actions`, pure
 * and unit-tested; this function's job is only to make sure the roster
 * they were decided on is the roster that is still true at commit.
 */
export async function commitColleagueAct(input: {
  act: ColleagueAct;
  actorId: string;
  subjectId: string;
}): Promise<{ ok: true } | { error: ColleagueRefusal }> {
  const { act, actorId, subjectId } = input;

  return db.transaction(async (tx) => {
    const colleagues = await tx
      .select({
        id: profiles.id,
        staffRole: profiles.staffRole,
        suspendedAt: profiles.suspendedAt,
      })
      .from(profiles)
      .where(eq(profiles.role, "staff"))
      .for("update");

    const refusal = refuseColleagueAct({ act, actorId, subjectId, colleagues });
    if (refusal) return { error: refusal };

    if (act === "reset_two_factor") {
      // Nothing of ours to write — the factors are Clerk's. The lock was
      // still worth taking: the act is refused for the same reasons the
      // others are, and it must be refused against the same roster.
      return { ok: true };
    }

    if (act === "remove") {
      await tx
        .update(profiles)
        .set({
          role: "traveler",
          staffRole: null,
          // Cleared in the same statement. A removed account is a
          // traveller, and `suspended_at_only_for_staff` would reject
          // the row if a suspension rode along with it.
          suspendedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, subjectId));

      return { ok: true };
    }

    await tx
      .update(profiles)
      .set({
        suspendedAt: act === "suspend" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, subjectId));

    return { ok: true };
  });
}
