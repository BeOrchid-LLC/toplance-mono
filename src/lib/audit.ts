import "server-only";

import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

/**
 * Record one audit-trail entry: who did what, to which subject.
 *
 * Modelled on `track()` in `@/lib/analytics/track` — the body is a whole
 * try/catch and this never throws. The audit trail is a record of an
 * action, not a precondition for it: a document verdict or a status
 * change must land even if the audit insert that describes it fails.
 * The failure is logged and swallowed, same as analytics.
 *
 * The table is `audit_log`, singular — AGENTS.md records that as a
 * deviation from the platform's plural-table naming convention, not a
 * precedent to copy elsewhere.
 */
export async function audit(
  actorId: string | null,
  action: string,
  subjectType: string,
  subjectId: string | null,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.insert(auditLog).values({ actorId, action, subjectType, subjectId, meta });
  } catch (error) {
    console.error(`[audit] could not record "${action}" on ${subjectType}`, error);
  }
}
