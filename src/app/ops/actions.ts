"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { track } from "@/lib/analytics/track";
import { generateAndStoreItinerary } from "@/lib/ai/itinerary";
import { audit } from "@/lib/audit";
import { canWriteCorridors, isOwner } from "@/lib/auth/policy";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import { claimCase as claimCaseTx, releaseCase as releaseCaseTx } from "@/lib/data/assignments";
import { addCaseNote as insertCaseNote } from "@/lib/data/case-notes";
import {
  approveCorridorTx,
  checklistChangesFrom,
  rejectCorridorTx,
  setRequirementCondition as setRequirementConditionTx,
} from "@/lib/data/corridors";
import { reviewDocumentTx } from "@/lib/data/review";
import { STAFF_REACHABLE_STATUSES, changeStatusTx } from "@/lib/data/transitions";
import { parseAppliesWhen } from "@/lib/domain/applies-when";
import { STATUS, type ApplicationStatus } from "@/lib/domain/status";
import { appUrl, notify } from "@/lib/notifications/notify";
import { getLocale } from "@/lib/i18n/server";
import { OPS_ACTIONS } from "@/lib/i18n/ops-actions";

/**
 * Every action here opens with `requireStaffAction()` — the same
 * staff-plus-second-factor decision the ops screens are gated on, in
 * the shape an action can return. These are POST endpoints with public
 * ids, reachable without ever rendering the page whose button posts to
 * them, so the page gate is not their gate.
 */

/**
 * A reviewer's verdict on one document, from the case screen.
 *
 * Gated on staff identity directly rather than through
 * `requireApplicationAccess(canWriteDocuments)`: the traveller also
 * holds `canWriteDocuments` on their own case, and this is the one
 * write they must never make — a file signed off by its own applicant.
 */
export async function reviewDocument(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const docKey = String(formData.get("doc_key") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const reason = String(formData.get("reason") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  if (verdict !== "verified" && verdict !== "flagged") {
    return { error: OPS_ACTIONS.chooseVerdict[await getLocale()] };
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

  // A reviewer's verdict can be what completes a checklist — a document
  // uploaded before the pre-check was reachable, say, or one re-uploaded
  // after a flag. The upload path emits this too; without it here, the
  // event undercounts exactly the cases a person had to touch.
  if (result.becameBillable) {
    await track("toplance.application_became_billable", { applicationId }, actor.userId);
  }

  await audit(
    actor.userId,
    verdict === "verified" ? "document.verified" : "document.flagged",
    "document",
    applicationId,
    { docKey }
  );

  if (verdict === "flagged") {
    // The same notification the AI pre-check sends when *it* flags a
    // document (`@/lib/ai/precheck`) — same kind, same payload, same
    // landing page. A traveller should not have to work out which pair
    // of eyes found the problem to be told there is one.
    //
    // After the transaction, and `notify` never throws: a notification
    // is not worth costing a reviewer the verdict they just recorded.
    await notify(
      result.travelerId,
      "document_flagged",
      {
        documentName: result.documentName,
        // Trimmed the same way `reviewDocumentTx` trims it before
        // writing, so the email says exactly what the red badge says.
        reason: reason.trim(),
        url: appUrl("/app/documents"),
      },
      applicationId
    );
  }

  // The traveller's ring, dashboard and documents page all read this
  // state; the ops case screen does too.
  revalidatePath("/app", "layout");
  revalidatePath("/ops", "layout");
  return { ok: true };
}

/**
 * A note on the case file, from the desk. Gated on staff identity alone
 * — the policy is `canWriteCaseNotes`, which is staff-only regardless of
 * the application, so there is nothing per-row to load and check.
 *
 * The traveller reads these on their profile, so a note is written to
 * them as much as about them.
 */
export async function addCaseNote(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const body = String(formData.get("body") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

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
 * rejected or additional_documents. Gated on staff identity directly
 * rather than through `requireApplicationAccess` — the traveller also holds
 * `canWriteApplication` on their own case, and moving your own case
 * through review is the one write they must never make.
 */
export async function changeCaseStatus(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const to = String(formData.get("to") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  if (!(STAFF_REACHABLE_STATUSES as readonly string[]).includes(to)) {
    return { error: OPS_ACTIONS.chooseStatus[await getLocale()] };
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
 * Take an unowned case. Gated on staff identity alone, the same idiom
 * as every other action here — there is nothing per-row to check beyond
 * that, `claimCaseTx` decides the rest.
 */
export async function claimCase(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const result = await claimCaseTx(applicationId, actor.userId);
  if ("error" in result) return result;

  await track("toplance.case_claimed", { applicationId }, actor.userId);
  await audit(actor.userId, "application.claimed", "application", applicationId);

  // The queue's Owner column and the case header both read this.
  revalidatePath("/ops", "layout");
  return { ok: true };
}

/**
 * Hand a case back to the queue. Gated on staff identity; `releaseCaseTx`
 * decides whether this particular staff member may release this
 * particular case — a reviewer only their own, an owner any of them.
 */
export async function releaseCase(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const result = await releaseCaseTx(applicationId, actor.userId, isOwner(actor));
  if ("error" in result) return result;

  await track("toplance.case_released", { applicationId }, actor.userId);
  await audit(actor.userId, "application.released", "application", applicationId);

  revalidatePath("/ops", "layout");
  return { ok: true };
}

/**
 * Approve a drafted corridor version, turning it live for every
 * traveller on that route.
 *
 * The only two actions in this file gated on `owner` rather than staff.
 * `canWriteCorridors` has existed in `policy.ts` since the RLS port and
 * was marked UNUSED there, because reference data was only ever written
 * by `npm run db:seed` running as the database owner. This is its first
 * caller — and the gate matters more here than anywhere else in the
 * console: a reviewer judges one traveller's document, an approver
 * decides what every traveller on a corridor is told to bring.
 */
export async function approveCorridor(formData: FormData) {
  const corridorId = String(formData.get("corridor_id") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  if (!canWriteCorridors(actor)) {
    return { error: OPS_ACTIONS.onlyOwnerApprove[await getLocale()] };
  }

  const result = await approveCorridorTx(corridorId, actor.userId);
  if ("error" in result) return result;

  await track("toplance.corridor_approved", { corridorId }, actor.userId);
  await audit(actor.userId, "corridor.approved", "corridor", corridorId);

  /**
   * Milestone 10. Travellers mid-application on this corridor now have a
   * different checklist than they did a second ago, and finding new rows
   * appear silently is how someone turns up at a mission without a
   * document nobody told them about.
   *
   * After the approval and never able to undo it: `notify` swallows its
   * own failures, the same stance `reviewDocument` takes. A corridor is
   * live once the transaction commits, whether or not the emails land.
   */
  const changed = await checklistChangesFrom(corridorId);
  for (const change of changed) {
    await notify(
      change.travelerId,
      "checklist_changed",
      {
        visaName: change.visaName,
        added: change.added,
        removed: change.removed,
        url: appUrl("/app/documents"),
      },
      change.applicationId
    );
  }

  // Travellers resolve their rule set on every requirements view, so the
  // app layout has to drop what it cached the moment this flips.
  revalidatePath("/app", "layout");
  revalidatePath("/ops", "layout");
  return { ok: true };
}

/** Send a draft back with a reason. Owner-only, same as approval. */
export async function rejectCorridor(formData: FormData) {
  const corridorId = String(formData.get("corridor_id") ?? "");
  const reason = String(formData.get("reason") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  if (!canWriteCorridors(actor)) {
    return { error: OPS_ACTIONS.onlyOwnerReject[await getLocale()] };
  }

  const result = await rejectCorridorTx(corridorId, reason);
  if ("error" in result) return result;

  await track("toplance.corridor_rejected", { corridorId }, actor.userId);
  await audit(actor.userId, "corridor.rejected", "corridor", corridorId, {
    reason: reason.trim(),
  });

  revalidatePath("/ops", "layout");
  return { ok: true };
}


/**
 * Write the rule that decides which travellers one conditional document
 * applies to — the 01/09 review's "tell them what applies", in the one
 * place where somebody actually knows the answer.
 *
 * Owner-only, like approval: a rule decides who is *asked* for a
 * document, so a careless one hides a requirement from the people who
 * need it. Clearing it (no topic chosen) is allowed and puts the
 * document back on the hedged list, which is the honest state for a
 * rule nobody is sure about.
 *
 * The rule is parsed before it is written and rejected if it does not
 * name a real intake topic — the alternative is a rule that silently
 * never matches, and a document that silently never appears.
 */
export async function setRequirementCondition(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();
  const options = formData
    .getAll("options")
    .map((o) => String(o).trim())
    .filter(Boolean);

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  if (!canWriteCorridors(actor)) {
    return { error: OPS_ACTIONS.onlyOwnerCondition[await getLocale()] };
  }

  let appliesWhen: unknown = null;

  if (answer) {
    if (!options.length) {
      return { error: OPS_ACTIONS.chooseAtLeastOneAnswer[await getLocale()] };
    }

    appliesWhen = parseAppliesWhen([{ answer, in: options }]);
    if (!appliesWhen) {
      return { error: OPS_ACTIONS.ruleNotRecognized[await getLocale()] };
    }
  }

  const result = await setRequirementConditionTx(requirementId, appliesWhen);
  if ("error" in result) return result;

  await track(
    "toplance.requirement_condition_set",
    { requirementId, answer: answer || null, cleared: !answer },
    actor.userId
  );
  await audit(actor.userId, "requirement.condition_set", "requirement", requirementId);

  revalidatePath("/ops", "layout");
  return { ok: true };
}
