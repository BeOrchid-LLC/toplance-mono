"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import { claimSupportRequest, resolveSupportRequest } from "@/lib/data/support";
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
