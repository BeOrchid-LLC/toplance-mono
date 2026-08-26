import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications } from "@/lib/db/schema";

export type AssignmentResult = { ok: true } | { error: string };

/**
 * Take an unowned case. A single `update ... where assignee_id is null`
 * is already atomic — Postgres evaluates the `where` and applies the
 * write under the same row lock, so two reviewers racing this at once
 * can never both win. No explicit transaction needed; there is only one
 * statement to wrap.
 */
export async function claimCase(
  applicationId: string,
  staffId: string
): Promise<AssignmentResult> {
  const [row] = await db
    .update(applications)
    .set({ assigneeId: staffId })
    .where(and(eq(applications.id, applicationId), isNull(applications.assigneeId)))
    .returning({ id: applications.id });

  if (!row) return { error: "Someone already owns this case." };
  return { ok: true };
}

/**
 * Hand a case back to the queue. A reviewer may only release their own
 * — `where assignee_id = :staffId` scopes the update so releasing
 * someone else's case simply matches no row. An owner (`staff_role
 * 'owner'`) may release any case, so their update carries no such
 * scope.
 *
 * Single statement, same atomicity argument as `claimCase`: nothing
 * between the check and the write for a concurrent claim to land in.
 */
export async function releaseCase(
  applicationId: string,
  staffId: string,
  isOwner: boolean
): Promise<AssignmentResult> {
  const [row] = await db
    .update(applications)
    .set({ assigneeId: null })
    .where(
      and(
        eq(applications.id, applicationId),
        isOwner ? undefined : eq(applications.assigneeId, staffId)
      )
    )
    .returning({ id: applications.id });

  if (!row) return { error: "This case is not yours to release." };
  return { ok: true };
}
