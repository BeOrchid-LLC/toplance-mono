"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { isOwner } from "@/lib/auth/policy";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import {
  createInvitation,
  resendablePlatformInvitation,
  revokePlatformInvitation,
} from "@/lib/data/invitations";
import { sendEmail } from "@/lib/notifications/email";
import { appUrl } from "@/lib/notifications/notify";
import { platformInvitationEmail } from "@/lib/notifications/templates";
import { OPS_STAFF } from "@/lib/i18n/ops-staff";
import { getActionLocale } from "@/lib/i18n/server";

/**
 * Bringing a colleague into BeOrchid itself.
 *
 * Every action here opens with `requireStaffAction()` and then
 * `isOwner`, the same pairing `approveCorridor` uses and for a sharper
 * reason: this is the only path in the product that writes
 * `profiles.staff_role`. Before it, platform staff existed because
 * somebody ran SQL.
 *
 * These are POST endpoints with public ids, reachable without ever
 * rendering the page whose button posts to them, so the page's own
 * owner check is not their gate.
 *
 * An invitation here may mint an owner, which the agency's staff
 * invitation deliberately cannot. What contains it: the rank is written
 * by the owner who sends it and never chosen by whoever holds the link,
 * only an existing owner can send one, and the account still cannot open
 * `/ops` until `decideStaffGate` sees a second factor enrolled.
 */

/** The gate both writes share: staff, second-factored, and an owner. */
async function requireOwnerAction() {
  const gate = await requireStaffAction();
  if ("error" in gate) return gate;

  if (!isOwner(gate.actor)) {
    return { error: OPS_STAFF.ownerOnly[await getActionLocale()] };
  }
  return gate;
}

export async function invitePlatformStaff(formData: FormData) {
  const gate = await requireOwnerAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const email = String(formData.get("email") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  // Anything other than the two ranks is a reviewer. A malformed field
  // must never resolve upwards.
  const staffRank = formData.get("staff_rank") === "owner" ? "owner" : "reviewer";

  const result = await createInvitation(null, actor.userId, {
    email,
    fullName: fullName || undefined,
    kind: "platform_staff",
    staffRank,
  });
  if ("error" in result) return result;

  const inviteUrl = appUrl(`/invite/${result.invitation.token}`);
  const delivered = await sendEmail({
    to: result.invitation.email,
    ...platformInvitationEmail({
      inviteUrl,
      fullName: result.invitation.fullName || undefined,
      rank: staffRank,
    }),
  });

  await track("toplance.invitation_sent", { kind: "platform_staff", staffRank }, actor.userId);
  await audit(actor.userId, "staff.invited", "invitation", result.invitation.id, {
    staffRank,
  });

  revalidatePath("/[locale]/ops/staff", "page");
  // The URL is built here and sent, and deliberately not returned: it is
  // a 30-day bearer credential for a rank in the console that curates
  // every corridor. `resendPlatformInvitation` is the way back to a link.
  return { ok: true, delivered };
}

export async function resendPlatformInvitation(formData: FormData) {
  const gate = await requireOwnerAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const invitationId = String(formData.get("invitation_id") ?? "");
  const invitation = await resendablePlatformInvitation(invitationId);
  if (!invitation) return { error: "That invitation can no longer be resent." };

  // The same token, deliberately: a second live link would mean two ways
  // into one account, and rotating would kill a first email that was
  // merely slow.
  const delivered = await sendEmail({
    to: invitation.email,
    ...platformInvitationEmail({
      inviteUrl: appUrl(`/invite/${invitation.token}`),
      fullName: invitation.fullName || undefined,
      // Off the row, not defaulted: a resent invitation that told an
      // invited owner they were being made a reviewer would contradict
      // the first email and the console they eventually open.
      rank: invitation.staffRank,
    }),
  });

  await track("toplance.invitation_resent", { kind: "platform_staff" }, actor.userId);

  revalidatePath("/[locale]/ops/staff", "page");
  return { ok: true, delivered };
}

export async function revokePlatformInvitationAction(formData: FormData) {
  const gate = await requireOwnerAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const invitationId = String(formData.get("invitation_id") ?? "");
  const result = await revokePlatformInvitation(invitationId);
  if ("error" in result) return result;

  await track("toplance.invitation_revoked", { kind: "platform_staff" }, actor.userId);
  await audit(actor.userId, "staff.invite_revoked", "invitation", invitationId);

  revalidatePath("/[locale]/ops/staff", "page");
  return { ok: true };
}
