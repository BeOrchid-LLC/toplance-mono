import "server-only";

import { and, eq, exists, isNull, sql } from "drizzle-orm";

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
 * Both conditions live in the `where`, so the whole thing is one
 * statement under one row lock — the same argument `claimCase` makes,
 * for the same reason.
 *
 * `exists` on `org_members` is the safety. `assignee_id` stopped being a
 * label the moment `handlesCase` started reading it — assigning is now a
 * grant of access to somebody's passport — so a target who does not work
 * at the agency holding this case must not be writable, however the id
 * reached this function. Checking that in a separate `select` first
 * would leave a window in which the colleague is removed from the agency
 * between the check and the write; as a condition on the update there is
 * no window.
 *
 * `expectedAssigneeId` closes the other window. The caller's guard read
 * `assignee_id` to decide it was allowed to reassign at all, and an
 * unconditional update would quietly take the case off a colleague who
 * claimed it in between. Passing what the guard saw makes the write
 * refuse instead — `claimCase`'s race, on the other branch of the same
 * action.
 */
export async function assignCaseTo(
  applicationId: string,
  assigneeId: string,
  expectedAssigneeId: string | null
): Promise<AssignmentResult> {
  /** The target works at the agency that holds this case. */
  const worksHere = exists(
    db
      .select({ one: sql`1` })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, applications.orgId),
          eq(orgMembers.userId, assigneeId)
        )
      )
  );

  const [row] = await db
    .update(applications)
    .set({ assigneeId })
    .where(
      and(
        eq(applications.id, applicationId),
        expectedAssigneeId === null
          ? isNull(applications.assigneeId)
          : eq(applications.assigneeId, expectedAssigneeId),
        worksHere
      )
    )
    .returning({ id: applications.id });

  if (row) return { ok: true };

  // Nothing matched. Which of the two conditions failed only matters for
  // the sentence the reviewer reads, so it is worked out here on the
  // error path rather than costing a query on the path that succeeds.
  const [member] = await db
    .select({ userId: orgMembers.userId })
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

  if (!member) return { error: "That colleague is not at this agency." };
  return { error: "Someone else picked this case up. Reload and try again." };
}
