"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { getActor } from "@/lib/data/applications";
import { addCaseNote as insertCaseNote } from "@/lib/data/case-notes";
import { reviewDocumentTx } from "@/lib/data/review";
import { isStaff } from "@/lib/auth/policy";

/**
 * A reviewer's verdict on one document, from the case screen.
 *
 * Gated on `isStaff` directly rather than through
 * `requireApplicationAccess(canWriteDocuments)`: the traveller also
 * holds `canWriteDocuments` on their own case, and this is the one
 * write they must never make — a file signed off by its own applicant.
 */
export async function reviewDocument(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const docKey = String(formData.get("doc_key") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const reason = String(formData.get("reason") ?? "");

  const actor = await getActor();
  if (!actor || !isStaff(actor)) {
    return { error: "You do not have access to that." };
  }

  if (verdict !== "verified" && verdict !== "flagged") {
    return { error: "Choose a verdict." };
  }

  const result = await reviewDocumentTx(
    applicationId,
    docKey,
    verdict === "verified" ? { verdict } : { verdict, reason },
    actor.userId
  );
  if ("error" in result) return result;

  await track(
    verdict === "verified"
      ? "toplance.document_verified"
      : "toplance.document_flagged",
    { applicationId, docKey },
    actor.userId
  );

  // The traveller's ring, dashboard and documents page all read this
  // state; the ops case screen does too.
  revalidatePath("/app", "layout");
  revalidatePath("/ops", "layout");
  return { ok: true };
}

/**
 * A note on the case file, from the desk. Gated on `isStaff` — the
 * policy is `canWriteCaseNotes`, which is staff-only regardless of the
 * application, so there is nothing per-row to load and check.
 *
 * The traveller reads these on their profile, so a note is written to
 * them as much as about them.
 */
export async function addCaseNote(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const body = String(formData.get("body") ?? "");

  const actor = await getActor();
  if (!actor || !isStaff(actor)) {
    return { error: "You do not have access to that." };
  }

  const result = await insertCaseNote(applicationId, actor.userId, body);
  if ("error" in result) return result;

  await track("toplance.case_note_added", { applicationId }, actor.userId);

  // The traveller's profile shows the notes; the ops case screen too.
  revalidatePath("/app", "layout");
  revalidatePath("/ops", "layout");
  return { ok: true };
}
