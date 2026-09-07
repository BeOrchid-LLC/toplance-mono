"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { requireActor, requireOrgAccess, toActionError } from "@/lib/auth/guards";
import { activeRateCard } from "@/lib/data/billing";
import { hasActiveSubscription, recordPayment } from "@/lib/data/payments";
import { subscriptionCharge } from "@/lib/domain/pricing";
import { paymentProvider } from "@/lib/payments";
import { BILLING } from "@/lib/i18n/billing";
import { getActionLocale } from "@/lib/i18n/server";

/** One month from `from`, clamped the way `cycleFor` clamps a short month. */
function oneMonthOn(from: Date): Date {
  const end = new Date(from);
  const day = end.getUTCDate();
  end.setUTCMonth(end.getUTCMonth() + 1);
  // Rolled past the end of a short month — 31 January plus a month is
  // 3 March by default, which would sell four extra days.
  if (end.getUTCDate() !== day) end.setUTCDate(0);
  return end;
}

/**
 * Buy the agency's plan for one period.
 *
 * The amount is re-derived here from the active rate card and is never
 * read off the form. A browser that can name its own price is a browser
 * that pays what it likes, and this action is a POST endpoint reachable
 * without ever rendering the page whose button posts to it.
 *
 * Nothing renews. A period ends and the console closes again, which is
 * the honest behaviour while the provider is a mock — a recurring charge
 * that nothing can actually collect would be a promise the product
 * cannot keep.
 */
export async function purchaseSubscription() {
  try {
    const actor = await requireActor();
    const orgId = actor.orgIds[0];
    if (!orgId) return { error: "You do not have access to that." };
    await requireOrgAccess(orgId);

    const locale = await getActionLocale();

    // Already paid, so take nothing. Double-clicking a Pay button must
    // not buy two months, and the button is not the only way in here.
    if (await hasActiveSubscription(orgId)) {
      revalidatePath("/[locale]/agency", "layout");
      return { ok: true, alreadyActive: true };
    }

    const card = await activeRateCard();
    const amountMinor = subscriptionCharge(card);

    await track("toplance.checkout_started", { kind: "agency_subscription" }, actor.userId);

    const provider = paymentProvider();
    const checkout = await provider.createCheckout({
      kind: "agency_subscription",
      amountMinor,
      currency: card.currency,
      reference: orgId,
    });

    const settled = await provider.confirm(checkout.providerRef);
    if (settled.status !== "paid") {
      return { error: BILLING.paymentFailed[locale] };
    }

    const start = new Date();
    await recordPayment({
      kind: "agency_subscription",
      status: "paid",
      amountMinor,
      currency: card.currency,
      orgId,
      payerId: actor.userId,
      rateCardId: card.id ?? null,
      provider: provider.name,
      providerRef: checkout.providerRef,
      periodStart: start,
      periodEnd: oneMonthOn(start),
    });

    await track(
      "toplance.subscription_purchased",
      { orgId, amountMinor, provider: provider.name },
      actor.userId
    );
    await audit(actor.userId, "subscription.purchased", "organisation", orgId, {
      amountMinor,
      currency: card.currency,
      provider: provider.name,
    });

    revalidatePath("/[locale]/agency", "layout");
    return { ok: true, alreadyActive: false };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
