import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { companionUpdates, type CompanionUpdate } from "@/lib/db/schema";

/**
 * Cached AI-generated companion content — one row per application per
 * `kind` (today only `"local_tips"`, per the schema default). Both the
 * page's own render and the weekly digest cron read and refresh through
 * these three functions, so the two never diverge on what "stale" means
 * or how a refresh is written.
 */

export async function getCompanionUpdate(
  applicationId: string,
  kind: string
): Promise<CompanionUpdate | null> {
  const [row] = await db
    .select()
    .from(companionUpdates)
    .where(
      and(
        eq(companionUpdates.applicationId, applicationId),
        eq(companionUpdates.kind, kind)
      )
    )
    .limit(1);

  return row ?? null;
}

/**
 * Write (or refresh) one kind of companion content. `onConflictDoUpdate`
 * on the `(applicationId, kind)` unique pair — the same upsert shape
 * `generateAndStoreItinerary` uses on `itineraries.applicationId` —
 * always refreshes `generatedAt`, so a stale row's age never survives a
 * regeneration even when the payload happens not to change.
 */
export async function upsertCompanionUpdate(
  applicationId: string,
  kind: string,
  payload: unknown
): Promise<void> {
  const generatedAt = new Date();

  await db
    .insert(companionUpdates)
    .values({ applicationId, kind, payload, generatedAt })
    .onConflictDoUpdate({
      target: [companionUpdates.applicationId, companionUpdates.kind],
      set: { payload, generatedAt },
    });
}

/**
 * Whether a cached row is old enough to regenerate. Pure, so the page and
 * the cron can both gate on it without either one owning the definition
 * of "stale" — a row with no age at all (nothing generated yet) is not
 * this function's job to answer; callers check for `null` first.
 */
export function isStale(row: { generatedAt: Date }, days = 7): boolean {
  const ageMs = Date.now() - row.generatedAt.getTime();
  return ageMs > days * 24 * 60 * 60 * 1000;
}
