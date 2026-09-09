"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { isOwner } from "@/lib/auth/policy";
import { resetTwoFactor } from "@/lib/auth/clerk-admin";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import {
  createInvitation,
  resendablePlatformInvitation,
  revokePlatformInvitation,
} from "@/lib/data/invitations";
import { commitColleagueAct } from "@/lib/data/staff";
import type { ColleagueAct, ColleagueRefusal } from "@/lib/domain/colleague-actions";
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

/**
 * One colleague's row, acted on.
 *
 * The four below are one function with a verb, and deliberately so: the
 * gate, the lock, the refusal mapping, the audit line and the
 * revalidation are identical for all of them, and four copies of that
 * scaffolding differing by one string is four places for the owner
 * check to be forgotten in.
 *
 * `commitColleagueAct` decides and writes under a single lock over the
 * staff table — the buttons were drawn from the same rules
 * (`@/lib/domain/colleague-actions`), but a POST endpoint with a public
 * id cannot take the client's word for which of them were live when the
 * page rendered.
 */
/**
 * One `ColleagueRefusal`, resolved to a sentence at the caller's locale.
 *
 * No `Record<ColleagueRefusal, key>` in between, unlike `TENANT_ERROR_KEY`
 * next door: `colleagueRefusal` is itself typed as a record over the
 * whole union, so a code with no copy is already a compile error in the
 * dictionary and a second table here would only be a place for the two
 * to drift.
 */
async function refusal(code: ColleagueRefusal): Promise<{ error: string }> {
  return { error: OPS_STAFF.colleagueRefusal[code][await getActionLocale()] };
}

/** What every act writes to the audit log, keyed on the act. */
const AUDIT_ACTION: Record<ColleagueAct, string> = {
  remove: "staff.removed",
  suspend: "staff.suspended",
  restore: "staff.restored",
  reset_two_factor: "staff.two_factor_reset",
};

const ANALYTICS_EVENT = {
  remove: "toplance.staff_removed",
  suspend: "toplance.staff_suspended",
  restore: "toplance.staff_restored",
  reset_two_factor: "toplance.staff_two_factor_reset",
} as const;

async function actOnColleague(act: ColleagueAct, formData: FormData) {
  const gate = await requireOwnerAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const subjectId = String(formData.get("colleague_id") ?? "").trim();
  if (!subjectId) return refusal("unknown_colleague");

  const result = await commitColleagueAct({
    act,
    actorId: actor.userId,
    subjectId,
  });
  if ("error" in result) return refusal(result.error);

  /**
   * After the lock, never inside it. Clerk is a network call to another
   * company's API, and holding a lock over the whole staff table across
   * it would queue every other director's act behind whatever latency
   * Clerk is having.
   *
   * It runs second for a second reason: the transaction is what decides
   * whether this act is allowed at all, and dropping somebody's
   * authenticator app before finding out they are the person you are
   * not allowed to touch is not a mistake worth being able to make.
   */
  if (act === "reset_two_factor") {
    const cleared = await resetTwoFactor(subjectId);
    if ("error" in cleared) {
      return { error: OPS_STAFF.accountServiceUnavailable[await getActionLocale()] };
    }
  }

  await track(ANALYTICS_EVENT[act], {}, actor.userId);
  await audit(actor.userId, AUDIT_ACTION[act], "profile", subjectId);

  revalidatePath("/[locale]/ops/staff", "page");
  return { ok: true as const };
}

/**
 * Console access ends; the person does not.
 *
 * `role = 'traveler'` with no rank, rather than a deleted row: the
 * cases this colleague reviewed, the enquiries assigned to them and
 * every audit line they wrote all point at this id, and a product that
 * cannot say who took a decision has lost the more useful half of
 * having taken it.
 */
export async function removeColleague(formData: FormData) {
  return actOnColleague("remove", formData);
}

/** The pause. `restoreColleague` is its undo, and commits on the click. */
export async function suspendColleague(formData: FormData) {
  return actOnColleague("suspend", formData);
}

export async function restoreColleague(formData: FormData) {
  return actOnColleague("restore", formData);
}

/**
 * The remedy for a lost or compromised phone: Clerk drops every
 * enrolled factor and ends the sessions the account is holding, and
 * `decideStaffGate` meets them at the enrolment screen next time.
 */
export async function resetColleagueTwoFactor(formData: FormData) {
  return actOnColleague("reset_two_factor", formData);
}
