"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { track } from "@/lib/analytics/track";
import { requireActor, requireOrgAccess, toActionError } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import {
  createInvitation,
  resendableInvitation,
  revokeInvitation as revokeInvitationTx,
} from "@/lib/data/invitations";
import { createOrganisationTx } from "@/lib/data/organisations";
import { sendEmail } from "@/lib/notifications/email";
import { appUrl } from "@/lib/notifications/notify";
import { invitationEmail } from "@/lib/notifications/templates";

/**
 * A new employer's sign-up act: name an organisation and become its
 * owner. `requireActor` establishes who is signed in; everything else —
 * refusing a second org, a staff account, or a traveller mid-case, and
 * the role flip itself — is decided inside `createOrganisationTx`.
 */
export async function createOrganisation(formData: FormData) {
  try {
    const actor = await requireActor();
    const name = String(formData.get("name") ?? "");

    const result = await createOrganisationTx(actor.userId, name);
    if ("error" in result) return result;

    await track("toplance.organisation_created", { orgId: result.orgId }, actor.userId);

    revalidatePath("/employer");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Invites someone by email into the caller's own organisation. `orgId`
 * comes from the signed-in actor's own membership, never the form — a
 * form field here would let anyone type another org's id and invite
 * into it. `requireOrgAccess` re-checks membership from that same id
 * before anything is written, the same defence-in-depth shape as
 * `requireApplicationAccess`.
 *
 * The invite link is returned alongside `{ ok: true }` so the dialog can
 * offer a copy button even when `sendEmail` silently no-ops (no
 * `RESEND_API_KEY` locally) — the link is the demo/e2e path either way.
 */
export async function inviteTraveller(formData: FormData) {
  try {
    const actor = await requireActor();
    const orgId = actor.orgIds[0];
    if (!orgId) return { error: "You do not have access to that." };
    await requireOrgAccess(orgId);

    const email = String(formData.get("email") ?? "");
    const fullName = String(formData.get("full_name") ?? "").trim();

    // Job title, destination and purpose are no longer asked for. The
    // form collected them from the agency about a traveller it had not
    // spoken to yet, and the intake asks the traveller the same three
    // things first-hand. The columns stay on `invitations` — they are
    // nullable, nothing reads them, and dropping them is a migration
    // that belongs with the schema move rather than with a form change.
    const result = await createInvitation(orgId, actor.userId, {
      email,
      fullName: fullName || undefined,
    });
    if ("error" in result) return result;

    const [org] = await db
      .select({ name: organisations.name })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1);

    const inviteUrl = appUrl(`/invite/${result.invitation.token}`);
    await sendEmail({
      to: result.invitation.email,
      ...invitationEmail({
        orgName: org?.name ?? "Your organisation",
        inviteUrl,
        fullName: result.invitation.fullName || undefined,
      }),
    });

    await track("toplance.invitation_sent", { orgId }, actor.userId);

    revalidatePath("/employer");
    return { ok: true, inviteUrl };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Sends the same invitation again, to the same address.
 *
 * The link an employer was shown when they first invited someone lives
 * only in that dialog — `listInvitations` never selects the token — so
 * before this existed, an invitation email that silently failed to send
 * could not be recovered at all. Under invite-only that is a traveller
 * with no way in, and the only remedy was to revoke and start again.
 *
 * The same token, deliberately: a second live link would mean two ways
 * into one account, and rotating would kill a first email that was
 * merely slow. `resendableInvitation` decides whether there is anything
 * to send, scoped to the caller's own organisation.
 */
export async function resendInvitation(formData: FormData) {
  try {
    const actor = await requireActor();
    const orgId = actor.orgIds[0];
    if (!orgId) return { error: "You do not have access to that." };
    await requireOrgAccess(orgId);

    const invitationId = String(formData.get("invitation_id") ?? "");
    const invitation = await resendableInvitation(orgId, invitationId);
    if (!invitation) {
      return { error: "That invitation can no longer be resent. Send a new one." };
    }

    const [org] = await db
      .select({ name: organisations.name })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1);

    await sendEmail({
      to: invitation.email,
      ...invitationEmail({
        orgName: org?.name ?? "Your organisation",
        inviteUrl: appUrl(`/invite/${invitation.token}`),
        fullName: invitation.fullName || undefined,
      }),
    });

    await track("toplance.invitation_resent", { orgId }, actor.userId);

    revalidatePath("/employer");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/** Revokes a pending invitation the caller's own org sent. */
export async function revokeInvitation(formData: FormData) {
  try {
    const actor = await requireActor();
    const orgId = actor.orgIds[0];
    if (!orgId) return { error: "You do not have access to that." };
    await requireOrgAccess(orgId);

    const invitationId = String(formData.get("invitation_id") ?? "");
    const result = await revokeInvitationTx(orgId, invitationId);
    if ("error" in result) return result;

    await track("toplance.invitation_revoked", { orgId }, actor.userId);

    revalidatePath("/employer");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
