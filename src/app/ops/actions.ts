"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { track } from "@/lib/analytics/track";
import { generateAndStoreItinerary } from "@/lib/ai/itinerary";
import { audit } from "@/lib/audit";
import { isOwner, isStaff } from "@/lib/auth/policy";
import { claimCase as claimCaseTx, releaseCase as releaseCaseTx } from "@/lib/data/assignments";
import { getActor } from "@/lib/data/applications";
import { addCaseNote as insertCaseNote } from "@/lib/data/case-notes";
import { reviewDocumentTx } from "@/lib/data/review";
import { STAFF_REACHABLE_STATUSES, changeStatusTx } from "@/lib/data/transitions";
import { STATUS, type ApplicationStatus } from "@/lib/domain/status";
import { appUrl, notify } from "@/lib/notifications/notify";

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

  await audit(
    actor.userId,
    verdict === "verified" ? "document.verified" : "document.flagged",
    "document",
    applicationId,
    { docKey }
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

/**
 * A staff decision: submitted → under_review, under_review → approved,
 * rejected or additional_documents. Gated on `isStaff` directly rather
 * than through `requireApplicationAccess` — the traveller also holds
 * `canWriteApplication` on their own case, and moving your own case
 * through review is the one write they must never make.
 */
export async function changeCaseStatus(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const to = String(formData.get("to") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  const actor = await getActor();
  if (!actor || !isStaff(actor)) {
    return { error: "You do not have access to that." };
  }

  if (!(STAFF_REACHABLE_STATUSES as readonly string[]).includes(to)) {
    return { error: "Choose a status." };
  }
  const nextStatus = to as ApplicationStatus;

  const result = await changeStatusTx(applicationId, nextStatus, message, actor.userId);
  if ("error" in result) return result;

  await track(
    "toplance.application_status_changed",
    { applicationId, from: result.from, to: nextStatus },
    actor.userId
  );

  await audit(actor.userId, "application.status_changed", "application", applicationId, {
    from: result.from,
    to: nextStatus,
  });

  await notify(
    result.travelerId,
    "status_changed",
    { statusLabel: STATUS[nextStatus].label, message, url: appUrl("/app") },
    applicationId
  );

  if (nextStatus === "approved") {
    const travelerId = result.travelerId;
    // The itinerary is a nice-to-have on top of an already-decided case,
    // never a reason to hold up (or fail) the approval response the
    // reviewer is waiting on. `generateAndStoreItinerary` never throws on
    // its own, but the guard stays — an approval must never surface a
    // background failure it has nothing to do with.
    after(async () => {
      try {
        // `generated` is false on the unset-API-key no-op, the
        // no-corridor early-out, and any generation failure — none of
        // those are "your arrival plan is ready", so the notify only
        // fires once a plan is actually sitting in the database.
        const generated = await generateAndStoreItinerary(applicationId, actor.userId);
        if (!generated) return;

        await notify(
          travelerId,
          "itinerary_ready",
          { url: appUrl("/app/profile") },
          applicationId
        );
      } catch (error) {
        console.error(
          `[ops] itinerary generation failed for application ${applicationId}`,
          error
        );
      }
    });
  }

  // The traveller's status pill and timeline read this; the ops case
  // screen and queue do too.
  revalidatePath("/app", "layout");
  revalidatePath("/ops", "layout");
  return { ok: true };
}

/**
 * Take an unowned case. Gated on `isStaff` directly, the same idiom as
 * every other action here — there is nothing per-row to check beyond
 * that, `claimCaseTx` decides the rest.
 */
export async function claimCase(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");

  const actor = await getActor();
  if (!actor || !isStaff(actor)) {
    return { error: "You do not have access to that." };
  }

  const result = await claimCaseTx(applicationId, actor.userId);
  if ("error" in result) return result;

  await track("toplance.case_claimed", { applicationId }, actor.userId);
  await audit(actor.userId, "application.claimed", "application", applicationId);

  // The queue's Owner column and the case header both read this.
  revalidatePath("/ops", "layout");
  return { ok: true };
}

/**
 * Hand a case back to the queue. Gated on `isStaff`; `releaseCaseTx`
 * decides whether this particular staff member may release this
 * particular case — a reviewer only their own, an owner any of them.
 */
export async function releaseCase(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");

  const actor = await getActor();
  if (!actor || !isStaff(actor)) {
    return { error: "You do not have access to that." };
  }

  const result = await releaseCaseTx(applicationId, actor.userId, isOwner(actor));
  if ("error" in result) return result;

  await track("toplance.case_released", { applicationId }, actor.userId);
  await audit(actor.userId, "application.released", "application", applicationId);

  revalidatePath("/ops", "layout");
  return { ok: true };
}
