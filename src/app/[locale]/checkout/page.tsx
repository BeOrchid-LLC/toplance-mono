import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";

import { PayApplication } from "@/components/app/pay-application";
import { SettingsCluster } from "@/components/shared/settings-cluster";
import { Panel, PanelBody } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { Wordmark } from "@/components/shared/wordmark";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getApplication, getProfile } from "@/lib/data/applications";
import { activeRateCard } from "@/lib/data/billing";
import { isApplicationPaid } from "@/lib/data/payments";
import { homeFor } from "@/lib/auth/routes";
import { clientCharge, formatMoney } from "@/lib/domain/pricing";
import { BILLING, CHECKOUT } from "@/lib/i18n/billing";
import { getLocale } from "@/lib/i18n/server";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: CHECKOUT.title[locale] };
}

/**
 * The traveller's paywall, and deliberately outside the `(app)` route
 * group.
 *
 * The gate lives in that group's layout, so a checkout screen inside it
 * would be redirected here by the very rule that sent the visitor here —
 * a loop rather than a gate. Living outside costs this page its own
 * chrome, which is the same trade the invitation page makes for the same
 * reason.
 *
 * Nobody who has already paid ever sees it: they are sent to their
 * console, which is where the paywall would have let them through
 * anyway.
 */
export default async function CheckoutPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const profile = await getProfile();
  if (!profile) redirect("/go");

  // An agency member or a staff account has no application to pay for,
  // and their own console is the honest place to send them.
  if (profile.role !== "traveler") redirect(homeFor(profile.role));

  const application = await getApplication();
  if (!application || (await isApplicationPaid(application.id))) redirect("/app");

  const card = await activeRateCard();
  const fee = clientCharge(card);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-[var(--bar-h)] border-b border-border items-center gap-4 px-[max(16px,calc((100%-1140px)/2))]">
        <Wordmark className="[&_.wordmark-label]:max-md:hidden" />
        <div className="ms-auto flex items-center gap-2">
          <SettingsCluster />
        </div>
      </header>

      <main className="relative isolate flex-1 px-6 py-14 md:py-20">
        <Shell className="max-w-[560px]">
          <p className="tag">{CHECKOUT.feeLabel[locale]}</p>
          <h1 className="t-h2 mt-3 max-w-[22ch]">{CHECKOUT.title[locale]}</h1>
          <p className="t-body-lg mt-5 text-ink-2">{CHECKOUT.body[locale]}</p>

          <Panel className="mt-8">
            <PanelBody className="py-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <span className="t-muted">{CHECKOUT.feeLabel[locale]}</span>
                <span className="d-sm">{formatMoney(fee, card.currency)}</span>
              </div>

              <div className="mt-6">
                <PayApplication />
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-md border border-border bg-surface-2 px-4 py-4">
                <CreditCard
                  className="mt-0.5 size-5 shrink-0 text-brand-text"
                  aria-hidden
                />
                <p className="t-muted">{BILLING.testPaymentNotice[locale]}</p>
              </div>
            </PanelBody>
          </Panel>
        </Shell>
      </main>
    </div>
  );
}
