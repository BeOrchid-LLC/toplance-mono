"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { revalidateCase } from "@/lib/cache/consoles";
import {
  requireActor,
  requireApplicationAccess,
  requireOrgAccess,
  toActionError,
} from "@/lib/auth/guards";
import {
  canAssignCase,
  canDecideCase,
  canReviewDocuments,
  isAgencyDirectorFor,
} from "@/lib/auth/policy";
import { db } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import {
  createInvitation,
  resendableInvitation,
  revokeInvitation as revokeInvitationTx,
} from "@/lib/data/invitations";
import { assignCaseTo, claimCase, releaseCase } from "@/lib/data/assignments";
import { createOrganisationTx, isAgencyOwner } from "@/lib/data/organisations";
import { setMemberRole } from "@/lib/data/tenants";
import { hasActiveSubscription } from "@/lib/data/payments";
import { reviewDocumentTx, type ReviewVerdict } from "@/lib/data/review";
import { changeStatusTx } from "@/lib/data/transitions";
import { isApplicationStatus, STATUS } from "@/lib/domain/status";
import { isFlagReason } from "@/lib/domain/flag-reason";
import { sendEmail } from "@/lib/notifications/email";
import { appUrl, notify } from "@/lib/notifications/notify";
import { invitationEmail } from "@/lib/notifications/templates";
import { AGENCY_ACTIONS } from "@/lib/i18n/agency-actions";
import { getActionLocale } from "@/lib/i18n/server";

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

    revalidatePath("/[locale]/agency", "layout");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Invites someone by email into the caller's own organisation — a
 * client whose visa the agency is handling, or a colleague who will
 * review those. `kind` decides which, and `acceptInvitationTx` attaches
 * a case or a seat accordingly.
 *
 * A staff invitation is owner-only. §1 gives an owner everything a
 * reviewer can do plus staff invitations and billing; without the check
 * any reviewer could hire, and the agency would grow people nobody
 * senior approved.
 *
 * `orgId`
 * comes from the signed-in actor's own membership, never the form — a
 * form field here would let anyone type another org's id and invite
 * into it. `requireOrgAccess` re-checks membership from that same id
 * before anything is written, the same defence-in-depth shape as
 * `requireApplicationAccess`.
 *
 * The invite link is *not* returned. It is a 30-day bearer credential
 * and the dialog that used to receive it lost its copy button on
 * 2026-09-07, so the email is the whole hand-off — which is why what
 * comes back instead is `delivered`, whether that email actually went.
 * `resendInvitation` is the way back to a link that did not arrive.
 */
export async function inviteTraveller(formData: FormData) {
  try {
    const actor = await requireActor();
    const orgId = actor.orgIds[0];
    if (!orgId) return { error: "You do not have access to that." };
    await requireOrgAccess(orgId);

    /**
     * An unpaid agency invites nobody.
     *
     * The console is already behind the paywall, so nothing renders this
     * button while the plan is unpaid — but this is a POST endpoint
     * reachable without ever rendering that page, and the page gate is
     * not its gate.
     *
     * It matters most for a client: they would arrive, pay their own fee
     * and land in a case no colleague can open, because the agency's
     * console is shut. Refusing the invitation is cheaper than refunding
     * the person who accepted it.
     */
    if (!(await hasActiveSubscription(orgId))) {
      return { error: AGENCY_ACTIONS.planNotPaid[await getActionLocale()] };
    }

    const email = String(formData.get("email") ?? "");
    const fullName = String(formData.get("full_name") ?? "").trim();
    const kind = formData.get("kind") === "staff" ? "staff" : "client";

    if (kind === "staff" && !(await isAgencyOwner(actor.userId, orgId))) {
      return { error: AGENCY_ACTIONS.onlyOwnerInvitesStaff[await getActionLocale()] };
    }

    // Job title, destination and purpose are no longer asked for. The
    // form collected them from the agency about a traveller it had not
    // spoken to yet, and the intake asks the traveller the same three
    // things first-hand. The columns stay on `invitations` — they are
    // nullable, nothing reads them, and dropping them is a migration
    // that belongs with the schema move rather than with a form change.
    const result = await createInvitation(orgId, actor.userId, {
      email,
      fullName: fullName || undefined,
      kind,
    });
    if ("error" in result) return result;

    const [org] = await db
      .select({ name: organisations.name })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1);

    const inviteUrl = appUrl(`/invite/${result.invitation.token}`);
    // The email is the entire hand-off now that the dialog no longer
    // offers the link, so whether it went is the one thing the sheet
    // cannot afford to guess at.
    const delivered = await sendEmail({
      to: result.invitation.email,
      ...invitationEmail({
        orgName: org?.name ?? "Your organisation",
        inviteUrl,
        fullName: result.invitation.fullName || undefined,
      }),
    });

    await track("toplance.invitation_sent", { orgId }, actor.userId);

    revalidatePath("/[locale]/agency", "layout");
    // The URL is built here and sent; it is deliberately not returned.
    // It is a 30-day bearer credential, and the dialog that used to
    // receive it no longer has anything to do with it — see the note on
    // `InviteDialog`. `resendInvitation` is the way back to a link.
    // `delivered` is not the link and is not sensitive: it is the
    // difference between "we told them" and "we did not", which the
    // sender is entitled to know.
    return { ok: true, delivered };
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

    const delivered = await sendEmail({
      to: invitation.email,
      ...invitationEmail({
        orgName: org?.name ?? "Your organisation",
        inviteUrl: appUrl(`/invite/${invitation.token}`),
        fullName: invitation.fullName || undefined,
      }),
    });

    await track("toplance.invitation_resent", { orgId }, actor.userId);

    revalidatePath("/[locale]/agency", "layout");
    // Resending is the documented remedy for an invitation that did not
    // arrive, so a resend that also did not arrive has to say so rather
    // than report the same silent success twice.
    return { ok: true, delivered };
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

    revalidatePath("/[locale]/agency", "layout");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/* ============================================================
 * The case actions.
 *
 * These are the five writes the console's case screen makes, and the
 * reason `/agency/clients/[id]` exists: #51 moved review from BeOrchid
 * to the agency, deleted the platform's case surface, and left the
 * transactions below with no caller at all.
 *
 * Every one of them is guarded by `requireApplicationAccess` with a
 * permission that means "the colleague handling this case" — never
 * `canWriteDocuments` or `canWriteApplication`, which the traveller
 * also holds. These are POST endpoints with public ids: the page's own
 * gate is not their gate.
 * ============================================================ */

/**
 * One verdict on one document: verified, or flagged with the sentence
 * the traveller will read next to the red badge.
 *
 * The reason arrives in two halves. `reason_code` is a class from
 * `flag_reason`, which aggregates across cases and is what support
 * debugs from now that BeOrchid cannot open the file itself;
 * `reason` is the prose the traveller reads. The enum note in
 * `schema.ts` is why both are collected at once.
 */
export async function reviewDocument(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const docKey = String(formData.get("doc_key") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const reasonCode = String(formData.get("reason_code") ?? "");

  try {
    const { actor } = await requireApplicationAccess(applicationId, canReviewDocuments);
    const locale = await getActionLocale();

    if (verdict !== "verified" && verdict !== "flagged") {
      return { error: AGENCY_ACTIONS.chooseVerdict[locale] };
    }

    // Built as a value rather than inline, so the `isFlagReason`
    // narrowing reaches the field that needs it — a cast here would be
    // the one place the enum could take a string that is not in it.
    let review: ReviewVerdict;
    if (verdict === "verified") {
      review = { verdict };
    } else {
      if (!isFlagReason(reasonCode)) {
        return { error: AGENCY_ACTIONS.chooseFlagReason[locale] };
      }
      review = { verdict, reason, reasonCode };
    }

    const result = await reviewDocumentTx(applicationId, docKey, review, actor.userId);
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
      { docKey, reasonCode: verdict === "flagged" ? reasonCode : null }
    );

    if (verdict === "flagged") {
      // The same notification the AI pre-check sends when *it* flags a
      // document. A traveller should not have to work out which pair of
      // eyes found the problem to be told there is one.
      await notify(
        result.travelerId,
        "document_flagged",
        {
          documentName: result.documentName,
          // Trimmed the way `reviewDocumentTx` trims it before writing,
          // so the email says exactly what the red badge says.
          reason: reason.trim(),
          url: appUrl("/app/documents"),
        },
        applicationId
      );
    }

    // The traveller's ring, dashboard and documents page read this state;
    // so does the case screen the verdict was made on.
    revalidateCase();
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Move the case itself — start the review, ask for more documents,
 * approve, refuse.
 *
 * `canDecideCase`, not `canWriteApplication`: the traveller holds that
 * one and must never approve their own application. The message is not
 * optional and `changeStatusTx` refuses without it — every status change
 * carries a sentence to the traveller, which is the rule `statusEvents`
 * was built around.
 */
export async function changeCaseStatus(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const to = String(formData.get("to") ?? "");
  const message = String(formData.get("message") ?? "");

  try {
    const { actor } = await requireApplicationAccess(applicationId, canDecideCase);
    const locale = await getActionLocale();

    if (!isApplicationStatus(to)) {
      return { error: AGENCY_ACTIONS.chooseStatus[locale] };
    }

    const result = await changeStatusTx(applicationId, to, message, actor.userId);
    if ("error" in result) return result;

    await track(
      "toplance.application_status_changed",
      { applicationId, from: result.from, to },
      actor.userId
    );
    await audit(actor.userId, "application.status_changed", "application", applicationId, {
      from: result.from,
      to,
    });

    await notify(
      result.travelerId,
      "status_changed",
      {
        statusLabel: STATUS[to].label,
        message: message.trim(),
        url: appUrl("/app"),
      },
      applicationId
    );

    revalidateCase();
    return { ok: true };
  } catch (error) {
    const message_ = toActionError(error);
    if (message_) return { error: message_ };
    throw error;
  }
}

/**
 * Take an unheld case, hand one to a colleague, or put one back.
 *
 * One action for the three because they are one decision — who is
 * handling this — and because assignment is a permission now, not a
 * label: `handlesCase` reads `assignee_id`, so each of these grants or
 * withdraws a colleague's reach into somebody's passport. That is also
 * why `canAssignCase` is checked on the case *before* the change: an
 * unheld case is any member's to take, a held one is the assignee's and
 * the director's to move.
 */
export async function setCaseHandler(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "");

  try {
    const { actor, application } = await requireApplicationAccess(
      applicationId,
      canAssignCase
    );

    /** Which of the three this is, decided once and then reported. */
    const move = !assigneeId
      ? "released"
      : assigneeId === actor.userId && application.assigneeId === null
        ? "claimed"
        : "assigned";

    const result =
      move === "released"
        ? await releaseCase(
            applicationId,
            actor.userId,
            isAgencyDirectorFor(actor, application)
          )
        : move === "claimed"
          ? // The reviewer's own "I'll take this", which refuses if
            // somebody claimed it in the meantime rather than overwriting
            // them — see `claimCase`.
            await claimCase(applicationId, actor.userId)
          : // `application.assigneeId` is what the guard above read, and
            // passing it makes the write refuse if the case has moved on
            // since — the same race `claimCase` refuses.
            await assignCaseTo(applicationId, assigneeId, application.assigneeId);

    if ("error" in result) return result;

    await track(
      move === "released"
        ? "toplance.case_released"
        : move === "claimed"
          ? "toplance.case_claimed"
          : "toplance.case_assigned",
      { applicationId },
      actor.userId
    );
    await audit(
      actor.userId,
      move === "released" ? "application.released" : "application.assigned",
      "application",
      applicationId,
      { assigneeId: assigneeId || null }
    );

    revalidateCase();
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * A director changes a colleague's rank inside their own agency.
 *
 * The same write `/ops` makes through `updateMemberRole`, reached by a
 * different person: BeOrchid staff there, the agency's own director
 * here. Both go through `setMemberRole`, which holds the rule worth
 * holding — it locks the membership rows and refuses to demote an
 * agency's last director, so an agency cannot be left with nobody who
 * can invite, bill, or hand out a case.
 *
 * The raw value is narrowed against exactly the two ranks rather than
 * `=== "owner" ? … : "reviewer"`. That fallback is the bug #69 found on
 * the ops side: it turned a missing field or a typo into a demotion, and
 * the only thing standing between it and an agency with no director was
 * the guard inside the transaction. An unrecognised rank is refused.
 */
export async function setTeamMemberRank(formData: FormData) {
  try {
    const actor = await requireActor();
    const orgId = actor.orgIds[0];
    if (!orgId) return { error: "You do not have access to that." };
    await requireOrgAccess(orgId);

    const locale = await getActionLocale();

    // The page hides this control from a reviewer, but a POST endpoint is
    // reachable without ever rendering that page, and the page gate is
    // not its gate.
    if (!(await isAgencyOwner(actor.userId, orgId))) {
      return { error: AGENCY_ACTIONS.onlyDirectorChangesRank[locale] };
    }

    const userId = String(formData.get("user_id") ?? "");
    const raw = String(formData.get("rank") ?? "");
    const rank = raw === "owner" || raw === "reviewer" ? raw : null;
    if (!rank) return { error: AGENCY_ACTIONS.chooseARank[locale] };

    const result = await setMemberRole(orgId, userId, rank);
    if ("error" in result) {
      return {
        error:
          result.error === "last_owner"
            ? AGENCY_ACTIONS.lastDirector[locale]
            : AGENCY_ACTIONS.notAColleague[locale],
      };
    }

    await track("toplance.agency_member_rank_changed", { orgId, rank }, actor.userId);
    await audit(actor.userId, "agency.member_rank_changed", "organisation", orgId, {
      userId,
      rank,
    });

    // One call, on the route-tree path, as `revalidateCase` argues: the
    // rank decides which rail rows this colleague sees, and the rail is
    // drawn by the shell above every page, so invalidating a page leaves
    // a stale rail over fresh content. `/[locale]/agency/${userId}` was
    // the wrong shape anyway — a route pattern with a real id spliced
    // into it is neither a pattern nor a path.
    revalidatePath("/[locale]/agency", "layout");
    return { ok: true as const };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
