"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { ForbiddenError } from "@/lib/auth/errors";
import { isOrgDirector } from "@/lib/auth/policy";
import { requireActor, requireOrgAccess, toActionError } from "@/lib/auth/guards";
import { activeRateCard } from "@/lib/data/billing";
import {
  cancelSubscription as endSubscription,
  hasActiveSubscription,
  recordPayment,
} from "@/lib/data/payments";
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

/**
 * Give up the rest of the period the agency has paid for.
 *
 * Cancelling in a product where nothing renews can only mean this. There
 * is no future charge to call off — `purchaseSubscription` sells one
 * month and the console closes when it runs out — so the only thing an
 * agency can end is the month it is standing in. It is not refunded, and
 * the dialog in `CancelPlan` says so before this ever runs.
 *
 * Destructive under the rule in `AGENTS.md`: every member stops being
 * able to open a case, at once, which is the reach of a suspension. So
 * it asks for rank rather than membership. `requireOrgAccess` is
 * `isOrgMemberOf` and is right for buying — any colleague may pay — but
 * a reviewer must not be able to shut the director's own console. The
 * check is here rather than in the component because the component is
 * not a boundary: this is a POST endpoint reachable without it.
 *
 * The stamp lands in `payments` and nowhere else, which is what keeps
 * #77 from coming back. `activeSubscription` is the single question both
 * `resolveAgencyConsole` and `/agency/billing` ask, so the moment this
 * returns, the agency reads unpaid to both of them — the guard sends
 * them to the till and the till opens. Nothing here redirects: the
 * `revalidatePath` below re-renders `/agency/billing` in this same
 * response, and it is a screen the director may still stand on.
 */
export async function cancelSubscription() {
  try {
    const actor = await requireActor();
    const orgId = actor.orgIds[0];
    if (!orgId) return { error: "You do not have access to that." };
    await requireOrgAccess(orgId);
    if (!isOrgDirector(actor, orgId)) throw new ForbiddenError();

    // Nothing running, so take nothing — and report it as success. A
    // director whose first click landed and who clicks again is not
    // making a mistake, and an error here would tell them their agency
    // is somehow still open. Same shape as `alreadyActive` above.
    const ended = await endSubscription(orgId);
    if (ended.length === 0) {
      revalidatePath("/[locale]/agency", "layout");
      return { ok: true, alreadyEnded: true };
    }

    // The period the agency walked away from, for whoever asks later why
    // a paid month shows an early exit. The furthest-reaching row, to
    // match what `activeSubscription` would have called the live one.
    const periodEnd = ended
      .map((row) => row.periodEnd)
      .filter((end): end is Date => end !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    await track("toplance.subscription_cancelled", { orgId }, actor.userId);
    await audit(actor.userId, "subscription.cancelled", "organisation", orgId, {
      periodEnd: periodEnd?.toISOString() ?? null,
    });

    revalidatePath("/[locale]/agency", "layout");
    return { ok: true, alreadyEnded: false };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
