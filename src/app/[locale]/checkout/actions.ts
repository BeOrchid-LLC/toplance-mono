"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { requireActor, toActionError } from "@/lib/auth/guards";
import { getApplication } from "@/lib/data/applications";
import { activeRateCard } from "@/lib/data/billing";
import { isApplicationPaid, recordPayment } from "@/lib/data/payments";
import { clientCharge } from "@/lib/domain/pricing";
import { paymentProvider } from "@/lib/payments";
import { CHECKOUT } from "@/lib/i18n/billing";
import { getActionLocale } from "@/lib/i18n/server";

/**
 * Pay for one application — the traveller's own, and only ever theirs.
 *
 * The application is read from the caller's session rather than taken
 * from the form. An id in a form field would let somebody pay for a
 * stranger's case, which sounds harmless until you notice it also
 * *unlocks* that stranger's case.
 *
 * The amount comes from the active rate card for the same reason it does
 * on the agency side: this is a POST endpoint reachable without ever
 * rendering the page whose button posts to it.
 */
export async function purchaseApplication() {
  try {
    const actor = await requireActor();
    const locale = await getActionLocale();

    if (actor.role !== "traveler") {
      return { error: "You do not have access to that." };
    }

    const application = await getApplication();
    if (!application) return { error: "You do not have access to that." };

    // Paying twice for one application is never what somebody meant. A
    // double-clicked button, a resubmitted form and a stale tab all
    // arrive here, and none of them should be charged.
    if (await isApplicationPaid(application.id)) {
      revalidatePath("/[locale]/app", "layout");
      return { ok: true, alreadyPaid: true };
    }

    const card = await activeRateCard();
    const amountMinor = clientCharge(card);

    await track(
      "toplance.checkout_started",
      { kind: "client_application" },
      actor.userId
    );

    const provider = paymentProvider();
    const checkout = await provider.createCheckout({
      kind: "client_application",
      amountMinor,
      currency: card.currency,
      reference: application.id,
    });

    const settled = await provider.confirm(checkout.providerRef);
    if (settled.status !== "paid") {
      return { error: CHECKOUT.paymentFailed[locale] };
    }

    await recordPayment({
      kind: "client_application",
      status: "paid",
      amountMinor,
      currency: card.currency,
      applicationId: application.id,
      payerId: actor.userId,
      rateCardId: card.id ?? null,
      provider: provider.name,
      providerRef: checkout.providerRef,
    });

    await track(
      "toplance.application_purchased",
      { applicationId: application.id, amountMinor, provider: provider.name },
      actor.userId
    );
    await audit(actor.userId, "application.purchased", "application", application.id, {
      amountMinor,
      currency: card.currency,
      provider: provider.name,
    });

    revalidatePath("/[locale]/app", "layout");
    return { ok: true, alreadyPaid: false };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
