"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { toActionError } from "@/lib/auth/guards";
import {
  applicationBelongsToOrg,
  getSupportRequest,
  postSupportMessage,
  raiseSupportRequest,
  resolveSupportRequest,
} from "@/lib/data/support";
import { canPostSupportMessage } from "@/lib/domain/support-thread";
import { appUrl, notify, notifyStaff } from "@/lib/notifications/notify";
import { isUuid } from "@/lib/domain/uuid";
import { getActionLocale } from "@/lib/i18n/server";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

/**
 * An agency asking BeOrchid for help.
 *
 * Any member may ask, not only a director. A handler whose case has
 * been claimed by the wrong colleague, or who cannot open a suspended
 * agency's queue, is exactly the person with the problem — routing the
 * only channel out through their director would make the dispute wait
 * on somebody else's calendar.
 *
 * Sending is not destructive and takes no dialog: it adds a request and
 * removes nothing. The org is read from the session rather than the
 * form, so a posted `org_id` cannot raise a request in another
 * tenant's name.
 *
 * No staff notification is sent. The rail badge on `/ops/support`
 * already counts what is unclaimed, and a second channel saying the
 * same thing would be one more place for the two counts to disagree.
 */
export async function contactSupport(formData: FormData) {
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const applicationId = String(formData.get("application_id") ?? "").trim();

  try {
    const { actor, orgId } = await requireAgencyConsole();
    const locale = await getActionLocale();

    if (!orgId) return { error: OPS_SUPPORT.notFound[locale] };
    if (!subject) return { error: OPS_SUPPORT.needsSubject[locale] };
    if (!body) return { error: OPS_SUPPORT.needsBody[locale] };

    /**
     * Checked against the caller's own agency, never trusted from the
     * form. A posted `application_id` would otherwise let one agency
     * attach — and then read back in its own thread — the case
     * reference of a traveller at another.
     */
    let onCase: string | null = null;
    if (applicationId) {
      if (!isUuid(applicationId)) return { error: OPS_SUPPORT.notFound[locale] };
      if (!(await applicationBelongsToOrg(applicationId, orgId))) {
        return { error: OPS_SUPPORT.notFound[locale] };
      }
      onCase = applicationId;
    }

    const id = await raiseSupportRequest({
      orgId,
      raisedBy: actor.userId,
      subject: subject.slice(0, 200),
      body: body.slice(0, 4000),
      applicationId: onCase,
    });

    await audit(actor.userId, "support.requested", "support_request", id, { orgId });
    void track("toplance.support_requested", { orgId }, actor.userId);

    revalidatePath("/[locale]/agency/support", "page");
    revalidatePath("/[locale]/ops", "layout");
    return { ok: true as const, id };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * The agency's side of the same thread.
 *
 * The org comes from the session and the request is checked against it,
 * so a guessed id cannot reach another tenant's dispute — the table is
 * one queue across every agency, and `canPostSupportMessage` is where
 * that check lives so it can be tested without a database.
 */
export async function replyAsAgency(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  try {
    const { actor, orgId } = await requireAgencyConsole();
    const locale = await getActionLocale();

    if (!isUuid(requestId)) return { error: OPS_SUPPORT.notFound[locale] };
    if (!body) return { error: OPS_SUPPORT.needsBody[locale] };

    const request = await getSupportRequest(requestId);
    if (!request) return { error: OPS_SUPPORT.notFound[locale] };
    if (!canPostSupportMessage(request, { kind: "agency", orgId })) {
      /**
       * One message for "not yours" and for "already resolved". A
       * different sentence for each would confirm to somebody guessing
       * ids that a request exists at all.
       */
      return { error: OPS_SUPPORT.threadClosed[locale] };
    }

    await postSupportMessage({
      requestId,
      authorId: actor.userId,
      fromStaff: false,
      body: body.slice(0, 4000),
    });

    await audit(actor.userId, "support.replied", "support_request", requestId, { orgId });
    void track("toplance.support_replied", { fromStaff: false }, actor.userId);

    const payload = {
      subject: request.subject,
      preview: body.slice(0, 240),
      fromStaff: false,
      url: appUrl(`/ops/support/${requestId}`),
    };
    /**
     * The person holding it, or everybody if nobody does. Telling the
     * whole team about a request somebody has already claimed asks
     * several people to look at one person's work.
     */
    if (request.assigneeId) {
      await notify(request.assigneeId, "support_replied", payload);
    } else {
      await notifyStaff("support_replied", payload);
    }

    revalidatePath("/[locale]/agency/support", "page");
    revalidatePath("/[locale]/ops", "layout");
    return { ok: true as const };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * The agency closing its own request.
 *
 * The person who raised it usually knows first that it is sorted, and
 * making them wait for an operator to notice keeps a resolved dispute
 * sitting in the queue as work. `canPostSupportMessage` is the rule
 * reused: the conditions for adding to a thread and for closing it are
 * the same — it must be your agency's, and it must not already be
 * closed.
 *
 * Not destructive. Closing takes nothing away: the thread stays
 * readable, and a new request is the way back if it was premature.
 */
export async function resolveAsAgency(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");

  try {
    const { actor, orgId } = await requireAgencyConsole();
    const locale = await getActionLocale();

    if (!isUuid(requestId)) return { error: OPS_SUPPORT.notFound[locale] };

    const request = await getSupportRequest(requestId);
    if (!request) return { error: OPS_SUPPORT.notFound[locale] };
    if (!canPostSupportMessage(request, { kind: "agency", orgId })) {
      return { error: OPS_SUPPORT.threadClosed[locale] };
    }

    const failure = await resolveSupportRequest(requestId);
    if (failure === "not_found") return { error: OPS_SUPPORT.notFound[locale] };

    await audit(actor.userId, "support.resolved", "support_request", requestId, { orgId });
    void track("toplance.support_resolved", { byAgency: true }, actor.userId);

    revalidatePath("/[locale]/agency/support", "page");
    revalidatePath("/[locale]/ops", "layout");
    return { ok: true as const };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
