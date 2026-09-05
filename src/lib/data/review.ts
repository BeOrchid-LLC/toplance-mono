import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { markBillableIfComplete } from "@/lib/data/billing";
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
 *
 * `becameBillable` is reported out for the same reason and no other: the
 * analytics event belongs after the commit, not inside it, so the caller
 * emits it. True at most once in an application's life.
 */
export type ReviewResult =
  | {
      ok: true;
      documentName: string;
      travelerId: string;
      becameBillable: boolean;
    }
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
    // `applications` first, then `documents` — the same order
    // `changeStatusTx` takes them in, and the reason this select is up
    // here rather than beside the return where it reads more naturally.
    // This transaction writes both tables (the verdict below, and
    // `billable_at` when the verdict completes the checklist), and two
    // writers taking two tables in opposite orders is how a pair of
    // reviewers deadlock instead of one waiting for the other. Postgres
    // resolves that by killing one of them with a 40P01, which reaches
    // the reviewer as a 500 on a verdict they were entitled to make.
    //
    // `travelerId` never changes once an application exists, so the lock
    // is not protecting that read — it is reserving the row in the
    // agreed order before anything else is touched.
    const [app] = await tx
      .select({ travelerId: applications.travelerId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .for("update")
      .limit(1);

    if (!app) return { error: "That application does not exist." };

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

    // A verdict can be the thing that completes the checklist, which is
    // the moment the application becomes billable. Inside this
    // transaction so the stamp commits with the verdict that earned it;
    // idempotent, so a flag-then-re-verify cannot bill twice. The
    // `applications` row this updates is already locked, at the top.
    const billing = await markBillableIfComplete(tx, applicationId);

    return {
      ok: true,
      documentName: doc.name,
      travelerId: app.travelerId,
      becameBillable: billing.becameBillable,
    };
  });
}
