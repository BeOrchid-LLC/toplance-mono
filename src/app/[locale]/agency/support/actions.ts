"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { toActionError } from "@/lib/auth/guards";
import { raiseSupportRequest } from "@/lib/data/support";
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

  try {
    const { actor, orgId } = await requireAgencyConsole();
    const locale = await getActionLocale();

    if (!orgId) return { error: OPS_SUPPORT.notFound[locale] };
    if (!subject) return { error: OPS_SUPPORT.needsSubject[locale] };
    if (!body) return { error: OPS_SUPPORT.needsBody[locale] };

    const id = await raiseSupportRequest({
      orgId,
      raisedBy: actor.userId,
      subject: subject.slice(0, 200),
      body: body.slice(0, 4000),
    });

    await audit(actor.userId, "support.requested", "support_request", id, { orgId });
    void track("toplance.support_requested", { orgId }, actor.userId);

    revalidatePath("/[locale]/agency/support", "page");
    revalidatePath("/[locale]/ops", "layout");
    return { ok: true as const };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
