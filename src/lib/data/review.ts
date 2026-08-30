import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, documents } from "@/lib/db/schema";

export type ReviewVerdict =
  | { verdict: "verified" }
  | { verdict: "flagged"; reason: string };

/**
 * `documentName` and `travelerId` are what the caller needs to tell the
 * traveller a document was flagged — the checklist row's staff-curated
 * name, and who to send it to. Both are read inside the transaction that
 * writes the verdict, so the notification is about the row that was
 * actually judged; the caller sends it only once that transaction has
 * committed. `applyPrecheckTx` returns `travelerId` for the same reason.
 */
export type ReviewResult =
  | { ok: true; documentName: string; travelerId: string }
  | { error: string };

/**
 * The states a reviewer can pass judgement on: there is a file to look
 * at. `not_started` and `failed` have nothing behind them, so a verdict
 * would be about a document that does not exist.
 */
const REVIEWABLE = ["uploaded", "checking", "verified", "flagged"] as const;

/**
 * One reviewer verdict on one document: to `verified`, or to `flagged`
 * with the sentence the traveller will read next to the red badge.
 *
 * `verified` and `flagged` are themselves reviewable so a second look
 * can overturn the first — flagging a verified document un-verifies it,
 * which also drops it back out of `completionOf`'s verified count and
 * re-blocks submission, exactly as it should.
 *
 * Like `submitApplicationTx`, this decides nothing about access. Its
 * caller guards with `isStaff` first — `canWriteDocuments` alone is not
 * enough, because the traveller also holds it and must never sign off
 * their own file.
 */
export async function reviewDocumentTx(
  applicationId: string,
  docKey: string,
  review: ReviewVerdict,
  reviewerId: string
): Promise<ReviewResult> {
  if (review.verdict === "flagged" && !review.reason.trim()) {
    return { error: "Say what is wrong — the traveller reads this reason." };
  }

  return db.transaction(async (tx) => {
    const [doc] = await tx
      .select({ state: documents.state, name: documents.name })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, docKey)
        )
      )
      .for("update")
      .limit(1);

    if (!doc) return { error: "That document is not on this checklist." };

    if (!(REVIEWABLE as readonly string[]).includes(doc.state)) {
      return { error: "Nothing has been uploaded to review yet." };
    }

    await tx
      .update(documents)
      .set(
        // `checkedAt` is when a person last judged it; `verifiedBy`
        // names them only while the verdict stands, so a later flag
        // removes the sign-off along with the state.
        review.verdict === "verified"
          ? {
              state: "verified",
              reason: null,
              checkedAt: new Date(),
              verifiedBy: reviewerId,
            }
          : {
              state: "flagged",
              reason: review.reason.trim(),
              checkedAt: new Date(),
              verifiedBy: null,
            }
      )
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, docKey)
        )
      );

    // Read rather than joined onto the select above: that one takes
    // `FOR UPDATE`, and a join would extend the row lock to
    // `applications` — a second table locked in an order no other writer
    // here uses, which is how two writers deadlock instead of one losing
    // cleanly. `travelerId` never changes once an application exists, so
    // there is nothing to lock it against.
    const [app] = await tx
      .select({ travelerId: applications.travelerId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    return { ok: true, documentName: doc.name, travelerId: app.travelerId };
  });
}
