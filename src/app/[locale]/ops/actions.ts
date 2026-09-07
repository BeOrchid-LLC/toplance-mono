"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { canWriteCorridors } from "@/lib/auth/policy";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import {
  approveCorridorTx,
  checklistChangesFrom,
  rejectCorridorTx,
  setRequirementCondition as setRequirementConditionTx,
} from "@/lib/data/corridors";
import { parseAppliesWhen } from "@/lib/domain/applies-when";
import { appUrl, notify } from "@/lib/notifications/notify";
import { getActionLocale } from "@/lib/i18n/server";
import { OPS_ACTIONS } from "@/lib/i18n/ops-actions";

/**
 * Route curation, which is what the platform console does.
 *
 * Every action here opens with `requireStaffAction()` — the same
 * staff-plus-second-factor decision the ops screens are gated on, in
 * the shape an action can return. These are POST endpoints with public
 * ids, reachable without ever rendering the page whose button posts to
 * them, so the page gate is not their gate.
 *
 * The case actions that used to sit above these — reviewDocument,
 * addCaseNote, changeCaseStatus, claimCase, releaseCase — are gone with
 * the v1.3 tenancy. Review belongs to the agency now, and BeOrchid holds
 * no path to a traveller's documents, notes or status.
 */

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
    return { error: OPS_ACTIONS.onlyOwnerApprove[await getActionLocale()] };
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
  revalidatePath("/[locale]/app", "layout");
  revalidatePath("/[locale]/ops", "layout");
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
    return { error: OPS_ACTIONS.onlyOwnerReject[await getActionLocale()] };
  }

  const result = await rejectCorridorTx(corridorId, reason);
  if ("error" in result) return result;

  await track("toplance.corridor_rejected", { corridorId }, actor.userId);
  await audit(actor.userId, "corridor.rejected", "corridor", corridorId, {
    reason: reason.trim(),
  });

  revalidatePath("/[locale]/ops", "layout");
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
    return { error: OPS_ACTIONS.onlyOwnerCondition[await getActionLocale()] };
  }

  let appliesWhen: unknown = null;

  if (answer) {
    if (!options.length) {
      return { error: OPS_ACTIONS.chooseAtLeastOneAnswer[await getActionLocale()] };
    }

    appliesWhen = parseAppliesWhen([{ answer, in: options }]);
    if (!appliesWhen) {
      return { error: OPS_ACTIONS.ruleNotRecognized[await getActionLocale()] };
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

  revalidatePath("/[locale]/ops", "layout");
  return { ok: true };
}
