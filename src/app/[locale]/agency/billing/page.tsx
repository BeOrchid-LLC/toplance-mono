import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";

import { AgencyShell } from "@/components/agency/agency-shell";
import { PayPlan } from "@/components/agency/pay-plan";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { activeRateCard } from "@/lib/data/billing";
import { activeSubscription, listPaymentsForOrg } from "@/lib/data/payments";
import { formatMoney, subscriptionCharge } from "@/lib/domain/pricing";
import { BILLING } from "@/lib/i18n/billing";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { resolveAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: BILLING.planTitle[locale] };
}

function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
}

/**
 * Where an unpaid agency is sent, and the only console page it can open.
 *
 * `allowUnpaid` is the whole reason this page resolves the console
 * itself instead of calling `requireAgencyConsole`: the paywall lives in
 * the resolver, so without it this screen would redirect to itself.
 *
 * A paid agency can still open it — it is the payment history as well as
 * the till — which is why nothing here assumes the visitor owes
 * anything.
 */
export default async function AgencyBillingPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await resolveAgencyConsole({
    allowUnpaid: true,
  });

  // No organisation, nothing to buy a plan for. The dashboard is where
  // that state is explained and where it is fixed.
  if (!membership || !orgId) redirect("/agency");

  const [card, subscription, history] = await Promise.all([
    activeRateCard(),
    activeSubscription(orgId),
    listPaymentsForOrg(orgId),
  ]);

  const price = subscriptionCharge(card);

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="billing"
      title={BILLING.planTitle[locale]}
      lead={BILLING.planBody[locale]}
    >
      <Panel className="max-w-[720px]">
        <PanelHeader label={BILLING.planName[locale]} />
        <PanelBody className="pt-6">
          <p className="d-sm">
            {formatMoney(price, card.currency)}{" "}
            <span className="t-muted">{BILLING.perMonth[locale]}</span>
          </p>
          <p className="t-muted mt-3 max-w-[60ch]">
            {BILLING.perApplicationNote[locale]}
          </p>

          {subscription?.periodEnd ? (
            <p className="mt-6 text-[15px] text-ink-2">
              {BILLING.planActiveUntil[locale].replace(
                "{date}",
                formatDate(subscription.periodEnd, locale)
              )}
            </p>
          ) : (
            <div className="mt-6">
              <PayPlan />
            </div>
          )}

          {/* Said in words on the screen that takes the money, not
              only in an environment variable. Somebody demonstrating
              this to a client should never have to wonder whether a
              card was really charged. */}
          <div className="mt-6 flex items-start gap-3 rounded-md border border-border bg-surface-2 px-4 py-4">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
            <p className="t-muted">{BILLING.testPaymentNotice[locale]}</p>
          </div>
        </PanelBody>
      </Panel>

      <Panel className="mt-8 max-w-[720px]">
        <PanelHeader label={BILLING.historyTitle[locale]} />
        <PanelBody className="pt-6">
          {history.length === 0 ? (
            <p className="t-muted">{BILLING.historyEmpty[locale]}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
                >
                  <span className="text-[15px]">
                    {formatMoney(payment.amountMinor, payment.currency)}
                  </span>
                  <span className="t-muted">
                    {formatDate(payment.paidAt ?? payment.createdAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </AgencyShell>
  );
}
