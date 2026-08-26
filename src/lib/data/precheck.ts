import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, documents } from "@/lib/db/schema";

export type PrecheckVerdict = "pass" | "flag";

export type ApplyPrecheckResult =
  | { applied: true; travelerId: string }
  | { applied: false };

/**
 * Write one AI pre-check verdict to the document it was run against.
 *
 * A single guarded `UPDATE ... WHERE state = 'checking' AND storage_path
 * = :storagePath` is the whole of it — the same one-statement atomicity
 * argument as `claimCase` in `@/lib/data/assignments`: Postgres evaluates
 * the `WHERE` and applies the write under the same row lock, so there is
 * no window between "is this still the row to write to" and "write it"
 * for a concurrent verdict to land in. No explicit transaction, and
 * deliberately no `FOR UPDATE` lock of its own — `reviewDocumentTx`
 * already takes one on this same table for a human verdict, and a second
 * lock acquired here in a different order would be how two writers
 * deadlock rather than one losing cleanly.
 *
 * The guard is the point, not a formality: a human verdict has already
 * moved `state` off `checking` by the time it lands (so the `state`
 * predicate fails), and a re-upload mid-check has already pointed
 * `storagePath` at the new object (so the `storagePath` predicate fails)
 * — `uploadDocument` writes both before this check's `after()` callback
 * ever runs. Either way the AI's verdict is about a document that is no
 * longer the one in front of anybody, and this applies to nothing.
 *
 * A flag moves `state` to `flagged` and writes the traveller-facing
 * `reason` next to it, same columns `reviewDocumentTx` writes for a human
 * flag. A pass writes only `precheck` — `state` stays `checking`, because
 * the AI is never the thing that can move a document to `verified`.
 */
export async function applyPrecheckTx({
  applicationId,
  docKey,
  storagePath,
  verdict,
  reason,
  raw,
}: {
  applicationId: string;
  docKey: string;
  storagePath: string;
  verdict: PrecheckVerdict;
  reason: string;
  raw: unknown;
}): Promise<ApplyPrecheckResult> {
  const [row] = await db
    .update(documents)
    .set(
      verdict === "flag"
        ? { state: "flagged", reason, precheck: raw }
        : { precheck: raw }
    )
    .where(
      and(
        eq(documents.applicationId, applicationId),
        eq(documents.docKey, docKey),
        eq(documents.state, "checking"),
        eq(documents.storagePath, storagePath)
      )
    )
    .returning({ id: documents.id });

  if (!row) return { applied: false };

  // A cheap follow-up select rather than a join on the UPDATE — Drizzle's
  // `.returning()` only returns columns of the table being written, and
  // `travelerId` never changes once an application exists, so there is
  // no consistency reason to fold this into the same statement.
  const [app] = await db
    .select({ travelerId: applications.travelerId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  return { applied: true, travelerId: app.travelerId };
}
