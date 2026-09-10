"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { ForbiddenError } from "@/lib/auth/errors";
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
  isOrgDirector,
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
import { hasActiveSubscription } from "@/lib/data/payments";
import { reviewDocumentTx, type ReviewVerdict } from "@/lib/data/review";
import {
  requestDocumentTx,
  withdrawDocumentRequestTx,
} from "@/lib/data/document-requests";
import { changeStatusTx } from "@/lib/data/transitions";
import { orgLogoKey, validateLogoFile } from "@/lib/domain/org-logo";
import { isApplicationStatus } from "@/lib/domain/status";
import { STATUS_COPY } from "@/lib/i18n/status";
import { isFlagReason } from "@/lib/domain/flag-reason";
import { readAttendanceKind } from "@/lib/domain/attendance";
import { createAttendanceRequest } from "@/lib/data/attendance";
import { sendEmail } from "@/lib/notifications/email";
import { appUrl, notify } from "@/lib/notifications/notify";
import { deleteDocument, putDocument } from "@/lib/storage/documents";
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
 * Ask this one traveller for a document the corridor never listed.
 *
 * `canReviewDocuments`, the same guard `reviewDocument` carries: naming
 * what a checklist is missing is the same job as judging what is on it,
 * and it is not a case decision.
 *
 * Deliberately not folded into `changeCaseStatus`. The desk can want a
 * document without sending the case back — a reviewer half-way through a
 * file who spots a gap should be able to ask for it and keep reading,
 * rather than bounce the traveller to `additional_documents` to do so.
 * The two compose: `sentBackWithoutDetail` is what stops a reviewer
 * sending a case back and naming nothing.
 */
export async function requestDocument(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const guidance = String(formData.get("guidance") ?? "");

  try {
    const { actor } = await requireApplicationAccess(applicationId, canReviewDocuments);

    const result = await requestDocumentTx(applicationId, name, guidance, actor.userId);
    if ("error" in result) return result;

    await track(
      "toplance.document_requested",
      { applicationId, docKey: result.docKey },
      actor.userId
    );
    await audit(actor.userId, "document.requested", "document", applicationId, {
      docKey: result.docKey,
    });

    // Not buffered, unlike `document_flagged`: that one lands seconds
    // after the traveller's own upload, while they are still on the page
    // reading the row it is about. This arrives out of nowhere, from
    // somebody else's desk, and there is no in-app moment to protect.
    await notify(
      result.travelerId,
      "document_requested",
      {
        documentName: result.documentName,
        // Trimmed as `requestDocumentTx` trims it before writing, so the
        // email says exactly what the checklist row says.
        guidance: guidance.trim(),
        url: appUrl("/app/documents"),
      },
      applicationId
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
 * Take back a request nobody has uploaded to.
 *
 * Destructive under the rule in `AGENTS.md` — it takes a listed
 * requirement off somebody's checklist — so the control that calls this
 * goes through `ConfirmDialog`. What it cannot do is destroy a file:
 * `withdrawDocumentRequestTx` refuses the moment the traveller has
 * uploaded, and refuses a corridor row outright.
 */
export async function withdrawDocumentRequest(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const docKey = String(formData.get("doc_key") ?? "");

  try {
    const { actor } = await requireApplicationAccess(applicationId, canReviewDocuments);

    const result = await withdrawDocumentRequestTx(applicationId, docKey);
    if ("error" in result) return result;

    await track(
      "toplance.document_request_withdrawn",
      { applicationId, docKey },
      actor.userId
    );
    await audit(
      actor.userId,
      "document.request_withdrawn",
      "document",
      applicationId,
      { docKey }
    );

    /*
     * No notification. The traveller was told this document was wanted;
     * they are not told it stopped being wanted, because the row simply
     * goes and an email saying "ignore the last one" is more noise than
     * the silence it replaces. A withdrawal only ever happens before
     * they have acted on it — the transaction refuses once they have.
     */
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
        // `.en`, not `locale`. This string is persisted into
        // `notifications.payload` and read back later by
        // `@/lib/notifications/templates`, whose subject and heading
        // ("Your application is now: …") are themselves English. Worse,
        // `locale` here is the *reviewer's* — `getActionLocale()` reads
        // the request that is deciding the case — and this notification
        // is read by the traveller. Localising it means reading the
        // recipient's own `profiles.locale` at render time, together
        // with the template around it.
        statusLabel: STATUS_COPY[to].label.en,
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
 * Put the agency's own logo in the rail of its console.
 *
 * The director's, not any member's. A logo is the agency's face on every
 * screen its colleagues and — through an invitation email's console
 * link — its clients see; changing it is a decision about how the
 * business presents itself, which is the same class of act as ending
 * the plan or inviting a colleague. `requireOrgAccess` asks whether you
 * belong to the agency, which is a different question, so `isOrgDirector`
 * asks the one that matters. Hiding the control on `/agency/profile` was
 * never the gate: this is a POST endpoint with a public id.
 *
 * Same storage as documents and profile photos — MinIO locally,
 * Cloudflare R2 deployed — under a `logos/<orgId>/` key, and the same
 * replace-then-cleanup order as `uploadAvatar`: the old object is
 * deleted only after the row points at the new one, so a failure leaves
 * a spare file rather than an agency pointing at nothing.
 *
 * Not destructive under the AGENTS.md rule, so it commits on the pick: a
 * logo replacing a logo takes nothing away, and an agency with none
 * falls back to its name in the rail — which is what every agency had
 * before this existed.
 */
export async function uploadOrgLogo(formData: FormData) {
  try {
    const actor = await requireActor();
    const orgId = actor.orgIds[0];
    if (!orgId) return { error: "You do not have access to that." };
    await requireOrgAccess(orgId);
    if (!isOrgDirector(actor, orgId)) throw new ForbiddenError();

    const file = formData.get("file");
    if (!(file instanceof File)) return { error: "Choose a logo first." };

    const invalid = validateLogoFile(file.type, file.size);
    if (invalid) return { error: invalid };

    const [current] = await db
      .select({ logoPath: organisations.logoPath })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1);

    const path = orgLogoKey(orgId, file.type, Date.now());

    try {
      await putDocument(path, file);
    } catch {
      return {
        error: "That upload did not complete. Try again when you have signal.",
      };
    }

    await db
      .update(organisations)
      .set({ logoPath: path })
      .where(eq(organisations.id, orgId));

    if (current?.logoPath && current.logoPath !== path) {
      await deleteDocument(current.logoPath).catch(() => {});
    }

    await track(
      "toplance.agency_logo_uploaded",
      { orgId, replaced: current?.logoPath != null },
      actor.userId
    );
    await audit(actor.userId, "organisation.logo_uploaded", "organisation", orgId, {
      replaced: current?.logoPath != null,
    });

    // The rail is on every page of this console, so the layout is what
    // has to be rebuilt — not the profile screen the picker sits on.
    revalidatePath("/[locale]/agency", "layout");
    return {};
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Ask a traveller to come in for biometrics or an interview.
 *
 * The one step in the whole flow this product cannot perform. Biometric
 * capture happens on the destination government's own portal and an
 * interview happens at a consulate; neither offers an API, and no
 * amount of building here changes that. What was missing was the
 * summons: a handler who had finished a review and needed the traveller
 * in the office on Tuesday had no way to say so, which the client
 * raised on 8 September.
 *
 * Not a destructive control, so no confirmation dialog — it books an
 * appointment and takes nothing away. `canDecideCase` gates it for the
 * same reason `changeCaseStatus` uses it: telling somebody to travel to
 * an office is a decision about their case, not a note on it.
 *
 * The row and the notification are both written. The row is what the
 * traveller's page reads its standing notice from, because a
 * notification stops being a good source the moment somebody marks it
 * read — and a banner that vanished because the traveller opened their
 * bell would be the worst possible behaviour for the one message that
 * says where to be.
 */
export async function inviteToAttend(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const kindRaw = String(formData.get("kind") ?? "");
  const place = String(formData.get("place") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const whenRaw = String(formData.get("when") ?? "").trim();

  try {
    const { actor, application } = await requireApplicationAccess(
      applicationId,
      canDecideCase
    );
    const locale = await getActionLocale();

    const kind = readAttendanceKind(kindRaw);
    if (!kind) return { error: AGENCY_ACTIONS.chooseAttendanceKind[locale] };
    if (!place) return { error: AGENCY_ACTIONS.attendanceNeedsPlace[locale] };

    /**
     * An unparseable date is treated as no date rather than refused.
     * The time is optional by design — an agency often has the office
     * before it has the slot — so a browser that hands back something
     * this cannot read should still send the traveller an address.
     */
    const parsed = whenRaw ? new Date(whenRaw) : null;
    const scheduledFor = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

    await createAttendanceRequest({
      applicationId,
      kind,
      scheduledFor,
      place,
      note: note || null,
      requestedBy: actor.userId,
    });

    await audit(actor.userId, "application.attendance_requested", "application", applicationId, {
      kind,
      scheduledFor: scheduledFor?.toISOString() ?? null,
    });
    void track("toplance.attendance_requested", { applicationId, kind }, actor.userId);

    await notify(
      application.travelerId,
      "attendance_requested",
      {
        kind,
        // Formatted here and stored, the same compromise
        // `changeCaseStatus` documents: this is persisted into
        // `notifications.payload` and read back by an English template,
        // and `locale` here is the *handler's* rather than the
        // traveller's. Localising it means reading the recipient's own
        // `profiles.locale` at render time, together with the template
        // around it.
        when: scheduledFor
          ? scheduledFor.toISOString().replace("T", " ").slice(0, 16)
          : null,
        place,
        note: note || null,
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
