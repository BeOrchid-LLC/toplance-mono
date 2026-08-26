import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, documents, statusEvents } from "@/lib/db/schema";
import type { ApplicationStatus } from "@/lib/domain/status";

/** The only statuses a traveller may submit from. */
export const RESUBMITTABLE: readonly ApplicationStatus[] = [
  "draft",
  "collecting_documents",
  "additional_documents",
];

export type SubmitResult = { ok: true } | { error: string };

/**
 * The submission state transition, as one transaction with the
 * application row locked for its duration.
 *
 * Reading the status, counting the documents and writing the new status
 * as three separate statements looks correct and is not: between the
 * check and the write, a reviewer can move the case to `under_review`
 * and have it pushed back underneath them, or a second click can submit
 * the same case twice and write two events into the traveller's
 * timeline. A flaky connection and an impatient double-tap is the normal
 * case for this audience, not an exotic one.
 *
 * `for("update")` makes a concurrent submit wait here rather than race;
 * when it resumes it reads `submitted` and stops at the first guard.
 *
 * Lives outside the server action so it can be tested under real
 * concurrency — an action carries a Clerk session and `revalidatePath`,
 * neither of which exists in a test process. **It decides nothing about
 * access.** Its only caller guards first.
 *
 * It also decides nothing about notifying anyone: `submitApplication` in
 * `@/app/(app)/actions.ts` calls `notifyStaff` once this returns `ok`,
 * after the transaction has committed.
 */
export async function submitApplicationTx(
  applicationId: string
): Promise<SubmitResult> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .for("update")
      .limit(1);

    // Submission is one-way past review. The button is hidden below
    // 100%, but the action is callable directly. `additional_documents`
    // is in the list because resubmitting is what that status asks for.
    if (!current || !RESUBMITTABLE.includes(current.status)) {
      return { error: "That application has already gone to the review team." };
    }

    const docs = await tx
      .select({ state: documents.state, isRequired: documents.isRequired })
      .from(documents)
      .where(eq(documents.applicationId, applicationId));

    const required = docs.filter((d) => d.isRequired);
    const outstanding = required.filter((d) => d.state !== "verified").length;

    if (outstanding > 0) {
      return {
        error: `${outstanding} document${outstanding === 1 ? "" : "s"} still to verify.`,
      };
    }

    await tx
      .update(applications)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(eq(applications.id, applicationId));

    // Under RLS this insert was silently rejected — "staff write status
    // events" excluded the traveller, and the error was never read. It
    // succeeds now, so a submitted case finally carries the event that
    // explains itself. `actorId` stays null: the traveller pressed the
    // button, but the event is written by the system on their behalf.
    // Inside the transaction, so a case can never end up submitted with
    // no event, or carrying two.
    await tx.insert(statusEvents).values({
      applicationId,
      fromStatus: current.status,
      toStatus: "submitted",
      message: "All documents verified. Your file has gone to the review team.",
    });

    return { ok: true };
  });
}
