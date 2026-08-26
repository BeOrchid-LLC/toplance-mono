import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";

export type ReviewVerdict =
  | { verdict: "verified" }
  | { verdict: "flagged"; reason: string };

export type ReviewResult = { ok: true } | { error: string };

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
      .select({ state: documents.state })
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

    return { ok: true };
  });
}
