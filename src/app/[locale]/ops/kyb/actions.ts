"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import type { Actor } from "@/lib/auth/policy";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import {
  activateAgency,
  attachRequirementDocument,
  removeRequirementDocument,
  setRequirementState,
} from "@/lib/data/kyb";
import { validateUpload } from "@/lib/domain/uploads";
import { isUuid } from "@/lib/domain/uuid";
import { kybState, type KybState } from "@/lib/db/schema";
import { appUrl } from "@/lib/notifications/notify";
import { sendEmail } from "@/lib/notifications/email";
import { kybActivatedEmail } from "@/lib/notifications/templates";
import { getActionLocale } from "@/lib/i18n/server";
import { OPS_ACTIONS } from "@/lib/i18n/ops-actions";
import { UPLOAD_ACTIONS } from "@/lib/i18n/upload-actions";

/**
 * The manual KYB pass, as four actions.
 *
 * Every one opens with `requireStaffAction()`, for the reason
 * `ops/tenants/actions.ts` states at length: these are POST endpoints
 * with public ids, reachable without ever rendering the page whose
 * button posts to them, so the page gate is not their gate. None is
 * owner-gated either, on the same reading — suspending an agency is a
 * heavier act than verifying its licence and is open to every rank.
 *
 * `org_id` arrives as a raw form string and reaches a `uuid` column, so
 * it is checked with `isUuid` first. Without that, a blank or
 * hand-edited field throws out of the action instead of returning a
 * code, and the client's `run()` rejects inside `startTransition` with
 * no toast — a button that silently does nothing.
 */

/** Both KYB screens, after any write. */
function revalidateKyb() {
  revalidatePath("/[locale]/ops", "layout");
}

/** What every action here returns: nothing to render, or a sentence. */
type ActionResult = { ok: true } | { error: string };

/** The shared preamble: staff, second factor, and a usable agency id. */
async function gateFor(
  formData: FormData
): Promise<{ error: string } | { actor: Actor; orgId: string }> {
  const gate = await requireStaffAction();
  if ("error" in gate) return { error: gate.error };

  const orgId = String(formData.get("org_id") ?? "").trim();
  // A malformed id is answered as a missing one. The two are the same
  // sentence to an operator, and telling them apart would say which
  // uuids exist to somebody guessing.
  if (!isUuid(orgId)) {
    return { error: OPS_ACTIONS.tenantNotFound[await getActionLocale()] };
  }

  return { actor: gate.actor, orgId };
}

/**
 * File a document that arrived by email against one requirement.
 *
 * The same `validateUpload` the traveller's own uploads pass through,
 * and for the same reason: `accept` on a file input filters a dialog and
 * every browser lets a determined person past it. An admin dragging the
 * wrong thing in is the likelier case here, but the check is the same
 * check.
 */
export async function fileKybDocument(formData: FormData): Promise<ActionResult> {
  const gate = await gateFor(formData);
  if ("error" in gate) return gate;
  const { actor, orgId } = gate;

  const locale = await getActionLocale();
  const docKey = String(formData.get("doc_key") ?? "").trim();
  if (!docKey) return { error: OPS_ACTIONS.requirementNotFound[locale] };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: UPLOAD_ACTIONS.empty[locale] };

  const rejection = validateUpload(file);
  if (rejection) return { error: UPLOAD_ACTIONS[rejection][locale] };

  const result = await attachRequirementDocument({ orgId, docKey, file });
  if ("error" in result) return { error: OPS_ACTIONS.requirementNotFound[locale] };

  await track("toplance.kyb_document_filed", { orgId, docKey }, actor.userId);
  await audit(actor.userId, "kyb.document_filed", "organisation", orgId, { docKey });

  revalidateKyb();
  return { ok: true as const };
}

/**
 * Take a filed document back off a requirement.
 *
 * Destructive — the object is deleted and this product keeps no other
 * copy — so the call site puts a `ConfirmDialog` in front of it, per the
 * rule in `AGENTS.md`.
 */
export async function removeKybDocument(formData: FormData): Promise<ActionResult> {
  const gate = await gateFor(formData);
  if ("error" in gate) return gate;
  const { actor, orgId } = gate;

  const locale = await getActionLocale();
  const docKey = String(formData.get("doc_key") ?? "").trim();
  if (!docKey) return { error: OPS_ACTIONS.requirementNotFound[locale] };

  const result = await removeRequirementDocument({ orgId, docKey });
  if ("error" in result) return { error: OPS_ACTIONS.requirementNotFound[locale] };

  await audit(actor.userId, "kyb.document_removed", "organisation", orgId, { docKey });

  revalidateKyb();
  return { ok: true as const };
}

/** Whether a raw form value is one of the four states. */
function asKybState(value: string): KybState | null {
  return (kybState.enumValues as readonly string[]).includes(value)
    ? (value as KybState)
    : null;
}

/**
 * Record an admin's verdict on one requirement.
 *
 * Narrowed against the enum rather than cast, the lesson
 * `updateMemberRole` learned the hard way: a `value === "verified" ? …
 * : "rejected"` shape turns every unrecognised string into whichever
 * branch the fallback picked, which is the wrong answer written
 * confidently.
 */
export async function reviewKybRequirement(formData: FormData): Promise<ActionResult> {
  const gate = await gateFor(formData);
  if ("error" in gate) return gate;
  const { actor, orgId } = gate;

  const locale = await getActionLocale();
  const docKey = String(formData.get("doc_key") ?? "").trim();
  if (!docKey) return { error: OPS_ACTIONS.requirementNotFound[locale] };

  const state = asKybState(String(formData.get("state") ?? "").trim());
  if (!state) return { error: OPS_ACTIONS.chooseAKybState[locale] };

  const note = String(formData.get("note") ?? "").trim() || null;

  const result = await setRequirementState({
    orgId,
    docKey,
    state,
    note,
    reviewedBy: actor.userId,
  });
  if ("error" in result) return { error: OPS_ACTIONS.requirementNotFound[locale] };

  await track("toplance.kyb_document_reviewed", { orgId, docKey, state }, actor.userId);
  await audit(actor.userId, "kyb.document_reviewed", "organisation", orgId, {
    docKey,
    state,
  });

  revalidateKyb();
  return { ok: true as const };
}

/**
 * Open the console on an agency and tell its director.
 *
 * Additive under `AGENTS.md`, so no `ConfirmDialog`: it opens a console
 * and sends a letter, and takes nothing away. The disabled button on the
 * checklist is a courtesy; `activateAgency` re-reads and re-counts
 * inside its own transaction, which is the guard.
 *
 * `emailSent` comes back to the operator rather than being swallowed.
 * With no `RESEND_API_KEY`, or a 403 from Resend, the letter never left
 * — and the console is now open behind a paywall the director has not
 * been invited through. Telling them "Agency activated" and nothing else
 * is how somebody sits waiting for an email that was never sent.
 */
export async function activateTenant(
  formData: FormData
): Promise<{ ok: true; emailSent: boolean } | { error: string }> {
  const gate = await gateFor(formData);
  if ("error" in gate) return gate;
  const { actor, orgId } = gate;

  const locale = await getActionLocale();
  const result = await activateAgency(orgId);

  if ("error" in result) {
    const key = {
      agency_not_found: "tenantNotFound",
      kyb_incomplete: "kybIncomplete",
      no_recipient: "noActivationRecipient",
    } as const;
    return { error: OPS_ACTIONS[key[result.error]][locale] };
  }

  // Somebody else got there first — two admins on the same agency both
  // meant the same thing and both got it. One activation, one letter.
  if (result.alreadyActivated) {
    revalidateKyb();
    return { ok: true as const, emailSent: true };
  }

  const emailSent = await sendEmail({
    to: result.recipient.email,
    ...kybActivatedEmail({
      orgName: result.name,
      fullName: result.recipient.fullName,
      billingUrl: appUrl("/agency/billing"),
    }),
  });

  await track("toplance.agency_activated", { orgId, emailSent }, actor.userId);
  await audit(actor.userId, "agency.activated", "organisation", orgId, {
    recipient: result.recipient.email,
    emailSent,
  });

  revalidateKyb();
  return { ok: true as const, emailSent };
}
