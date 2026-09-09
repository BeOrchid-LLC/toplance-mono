"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import {
  claimSupportRequest,
  getSupportRequest,
  postSupportMessage,
  resolveSupportRequest,
} from "@/lib/data/support";
import { canPostSupportMessage } from "@/lib/domain/support-thread";
import { appUrl, notify } from "@/lib/notifications/notify";
import { isUuid } from "@/lib/domain/uuid";
import { getActionLocale } from "@/lib/i18n/server";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";

/**
 * The support queue's two writes.
 *
 * Both open with `requireStaffAction()` and neither is owner-gated:
 * answering an agency in dispute is the platform team's shared job, and
 * an owner-only gate would put one person between a tenant and a reply.
 *
 * Neither confirms. Claiming adds a name and resolving closes a thread
 * the operator has just answered — per AGENTS.md, a control is
 * destructive when committing it removes access, deletes data or stops
 * work somebody else is mid-way through, and neither of these does any
 * of that. Nothing here is ever deleted: resolving stamps a date.
 */
function revalidateSupport() {
  revalidatePath("/[locale]/ops", "layout");
}

export async function claimSupport(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const release = String(formData.get("release") ?? "") === "1";

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const locale = await getActionLocale();
  if (!isUuid(requestId)) return { error: OPS_SUPPORT.notFound[locale] };

  const failure = await claimSupportRequest(requestId, release ? null : actor.userId);
  if (failure) return { error: OPS_SUPPORT.notFound[locale] };

  await audit(actor.userId, release ? "support.released" : "support.claimed", "support_request", requestId);
  void track("toplance.support_claimed", { released: release }, actor.userId);

  revalidateSupport();
  return { ok: true as const };
}

export async function resolveSupport(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const locale = await getActionLocale();
  if (!isUuid(requestId)) return { error: OPS_SUPPORT.notFound[locale] };

  const failure = await resolveSupportRequest(requestId);
  // `already_resolved` is not an error worth showing: the operator asked
  // for a state the row is already in, and the screen behind the button
  // will render it resolved either way.
  if (failure === "not_found") return { error: OPS_SUPPORT.notFound[locale] };

  await audit(actor.userId, "support.resolved", "support_request", requestId);
  void track("toplance.support_resolved", {}, actor.userId);

  revalidateSupport();
  return { ok: true as const };
}

/**
 * Answer an agency.
 *
 * The reply the queue was missing: until now an agency could open a
 * dispute and nobody could say anything back, which made "Contact
 * support" a suggestion box.
 *
 * Not owner-gated, like the rest of this queue. Posting is additive, so
 * no confirmation. `canPostSupportMessage` decides whether the thread
 * is open at all — a resolved request refuses both sides, because
 * reopening is a state change somebody makes deliberately.
 */
export async function replyToSupport(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const locale = await getActionLocale();
  if (!isUuid(requestId)) return { error: OPS_SUPPORT.notFound[locale] };
  if (!body) return { error: OPS_SUPPORT.needsBody[locale] };

  const request = await getSupportRequest(requestId);
  if (!request) return { error: OPS_SUPPORT.notFound[locale] };
  if (!canPostSupportMessage(request, { kind: "staff" })) {
    return { error: OPS_SUPPORT.threadClosed[locale] };
  }

  await postSupportMessage({
    requestId,
    authorId: actor.userId,
    fromStaff: true,
    body: body.slice(0, 4000),
  });

  await audit(actor.userId, "support.replied", "support_request", requestId);
  void track("toplance.support_replied", { fromStaff: true }, actor.userId);

  /**
   * To whoever raised it, not to the whole agency. They asked; a
   * colleague who never saw the question does not need the answer.
   * `raisedBy` is nullable only if that person's profile went, in which
   * case there is nobody to tell.
   */
  if (request.raisedBy) {
    await notify(request.raisedBy, "support_replied", {
      subject: request.subject,
      preview: body.slice(0, 240),
      fromStaff: true,
      url: appUrl(`/agency/support/${requestId}`),
    });
  }

  revalidateSupport();
  revalidatePath("/[locale]/ops/support/[id]", "page");
  return { ok: true as const };
}
