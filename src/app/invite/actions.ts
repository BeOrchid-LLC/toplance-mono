"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { requireActor, toActionError } from "@/lib/auth/guards";
import { acceptInvitationTx } from "@/lib/data/invitations";
import { INVITE_ACTIONS } from "@/lib/i18n/invite";
import { getLocale } from "@/lib/i18n/server";

/**
 * The one write on this surface, called only from the accept page's own
 * Accept button — never on GET, so a prefetch or a crawler following the
 * link can never accept on someone's behalf.
 *
 * `requireActor` establishes who is signed in; the traveller check here
 * is the second line behind the page's own — the page never renders the
 * Accept button for an org_member or staff visitor, but the action does
 * not trust that alone. Everything else — the token's validity, both
 * orders an application can arrive in, and the org attach itself — is
 * `acceptInvitationTx`'s call.
 *
 * `redirect` throws by design (Next's own control-flow signal), so it
 * sits outside the try/catch: catching it here would turn a successful
 * accept into a swallowed "redirect error".
 */
export async function acceptInvitation(token: string) {
  try {
    const actor = await requireActor();
    if (actor.role !== "traveler") {
      const locale = await getLocale();
      return { error: INVITE_ACTIONS.travelerOnly[locale] };
    }

    const result = await acceptInvitationTx(token, actor.userId);
    if ("error" in result) return result;

    await track("toplance.invitation_accepted", { orgId: result.orgId }, actor.userId);

    revalidatePath("/app", "layout");
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }

  redirect("/app/agent");
}
