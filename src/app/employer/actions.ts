"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { track } from "@/lib/analytics/track";
import { requireActor, requireOrgAccess, toActionError } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import {
  createInvitation,
  revokeInvitation as revokeInvitationTx,
} from "@/lib/data/invitations";
import { createOrganisationTx } from "@/lib/data/organisations";
import { sendEmail } from "@/lib/notifications/email";
import { appUrl } from "@/lib/notifications/notify";
import { invitationEmail } from "@/lib/notifications/templates";
import type { TravelPurpose } from "@/lib/visa/types";

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
    const jobTitle = String(formData.get("job_title") ?? "").trim();
    const destinationIso = String(formData.get("destination_iso") ?? "").trim();
    const purpose = String(formData.get("purpose") ?? "").trim();

    const result = await createInvitation(orgId, actor.userId, {
      email,
      fullName: fullName || undefined,
      jobTitle: jobTitle || undefined,
      destinationIso: destinationIso || undefined,
      purpose: (purpose || undefined) as TravelPurpose | undefined,
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
