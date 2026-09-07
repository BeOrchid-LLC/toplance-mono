import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, orgMembers } from "@/lib/db/schema";

export type AssignmentResult = { ok: true } | { error: string };

/**
 * Take an unheld case. A single `update ... where assignee_id is null`
 * is already atomic — Postgres evaluates the `where` and applies the
 * write under the same row lock, so two reviewers racing this at once
 * can never both win. No explicit transaction needed; there is only one
 * statement to wrap.
 */
export async function claimCase(
  applicationId: string,
  handlerId: string
): Promise<AssignmentResult> {
  const [row] = await db
    .update(applications)
    .set({ assigneeId: handlerId })
    .where(and(eq(applications.id, applicationId), isNull(applications.assigneeId)))
    .returning({ id: applications.id });

  if (!row) return { error: "Someone already owns this case." };
  return { ok: true };
}

/**
 * Hand a case back to the agency's pool. A reviewer may only release
 * their own — `where assignee_id = :handlerId` scopes the update so
 * releasing someone else's case simply matches no row. The agency's
 * director may release any of them, so their update carries no such
 * scope.
 *
 * Single statement, same atomicity argument as `claimCase`: nothing
 * between the check and the write for a concurrent claim to land in.
 */
export async function releaseCase(
  applicationId: string,
  handlerId: string,
  isDirector: boolean
): Promise<AssignmentResult> {
  const [row] = await db
    .update(applications)
    .set({ assigneeId: null })
    .where(
      and(
        eq(applications.id, applicationId),
        isDirector ? undefined : eq(applications.assigneeId, handlerId)
      )
    )
    .returning({ id: applications.id });

  if (!row) return { error: "This case is not yours to release." };
  return { ok: true };
}

/**
 * Hand a case to a named colleague.
 *
 * The join is the whole of the safety here. `assignee_id` stopped being
 * a label the moment `handlesCase` started reading it — assigning is
 * now a grant of access to somebody's passport — so a target who does
 * not work at the agency holding this case must not be writable, however
 * the id reached this function. A typo cannot hand a client's file to a
 * stranger; it matches no row and is refused.
 *
 * Unlike `claimCase` this overwrites an existing holder, because its
 * caller is guarded on `canAssignCase`: for an assigned case that is the
 * director alone, and reassigning is the thing a director does.
 */
export async function assignCaseTo(
  applicationId: string,
  assigneeId: string
): Promise<AssignmentResult> {
  const [target] = await db
    .select({ id: applications.id })
    .from(applications)
    .innerJoin(
      orgMembers,
      and(
        eq(orgMembers.orgId, applications.orgId),
        eq(orgMembers.userId, assigneeId)
      )
    )
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!target) return { error: "That colleague is not at this agency." };

  await db
    .update(applications)
    .set({ assigneeId })
    .where(eq(applications.id, applicationId));

  return { ok: true };
}
