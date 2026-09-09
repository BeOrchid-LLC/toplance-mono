import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";

import { AgencyShell } from "@/components/agency/agency-shell";
import { CancelPlan } from "@/components/agency/cancel-plan";
import { PayPlan } from "@/components/agency/pay-plan";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { activeRateCard } from "@/lib/data/billing";
import {
  activeSubscription,
  latestSubscription,
  listPaymentsForOrg,
} from "@/lib/data/payments";
import { formatMoney, subscriptionCharge } from "@/lib/domain/pricing";
import { describePlanState, type PlanState } from "@/lib/payments/plan-state";
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
 * What the screen says about the plan, or `null` before there is one.
 *
 * Five states, one sentence each. `describePlanState` chooses between
 * them; this only dresses the choice, so the rule that a cancelled plan
 * reads differently from a lapsed one is testable without rendering
 * anything.
 */
function planSentence(plan: PlanState, locale: Locale): string | null {
  switch (plan.kind) {
    case "never":
      // Nothing to report. `planBody` in the header has already said
      // what buying gets them, and a second sentence saying they have
      // not bought it is a screen telling somebody what they know.
      return null;
    case "running":
      return BILLING.planActiveUntil[locale].replace(
        "{date}",
        formatDate(plan.until, locale)
      );
    case "ending-soon":
      return BILLING.planEndingSoon[locale].replace(
        "{date}",
        formatDate(plan.until, locale)
      );
    case "lapsed":
      return BILLING.planLapsed[locale].replace(
        "{date}",
        formatDate(plan.endedOn, locale)
      );
    case "cancelled":
      return BILLING.planCancelled[locale].replace(
        "{date}",
        formatDate(plan.endedOn, locale)
      );
  }
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
  const { profile, actor, membership, orgId, subscriptionActive } =
    await resolveAgencyConsole({ allowUnpaid: true });

  // No organisation, nothing to buy a plan for. The dashboard is where
  // that state is explained and where it is fixed.
  if (!membership || !orgId) redirect("/agency");

  /**
   * What the agency pays is the director's business, asked for by the
   * client on 8 September. The rail has always hidden this row from a
   * travel agent; the page itself never checked, so typing the path
   * handed them the plan, every past payment and a live Pay button.
   *
   * A notice rather than a `redirect`, which is the one thing this page
   * may not do. It is the paywall's landing page: when the plan lapses
   * every other console route redirects *here*, so sending a travel
   * agent back to `/agency` would bounce them straight back and end in
   * ERR_TOO_MANY_REDIRECTS — bug #77, rebuilt. `/agency/team` redirects
   * safely only because nothing ever redirects *to* it.
   *
   * So they are told, in the two states that mean something to them:
   * either the plan is running and none of this is theirs, or it has
   * ended and that is why their console is shut. Neither sentence
   * carries an amount, a date or a receipt.
   */
  const isDirector = membership.role === "owner";

  if (!isDirector) {
    /**
     * Which of the two shut-console sentences to use. A plan that ran
     * out reads differently from one that never started, and a freshly
     * provisioned agency is always the second — telling its first
     * colleague that the plan "has ended" describes an event that never
     * happened. One extra query, on the path that needs it.
     *
     * Asked of `describePlanState` rather than of `latestSubscription`
     * directly. "Nobody ever bought a month" is already a state that
     * function names, and deciding it a second way here would be the
     * same duplication the #77 note below warns about: the two answers
     * agree only for as long as `latestSubscription` keeps filtering to
     * paid rows with a period end.
     *
     * `activeUntil: null` is not a guess. This ternary is only reached
     * when `subscriptionActive` is false, which is that same question
     * asked by the resolver — and the branch above has already taken
     * the running case.
     */
    const shutPlan = describePlanState({
      activeUntil: null,
      latest: await latestSubscription(orgId),
      now: new Date(),
    });
    return (
      <AgencyShell
        profile={profile}
        membership={membership}
        actor={actor}
        orgId={orgId}
        locale={locale}
        activeId="billing"
        title={BILLING.planTitle[locale]}
        lead={BILLING.reviewerLead[locale]}
        centred
      >
        <Panel>
          <PanelHeader label={BILLING.planName[locale]} />
          <PanelBody className="pt-6">
            <p className="max-w-[60ch] text-[15px] text-ink-2">
              {subscriptionActive
                ? BILLING.reviewerNotice[locale]
                : shutPlan.kind === "never"
                  ? BILLING.reviewerNotStarted[locale]
                  : BILLING.reviewerBlocked[locale]}
            </p>
          </PanelBody>
        </Panel>
      </AgencyShell>
    );
  }

  const [card, subscription, latest, history] = await Promise.all([
    activeRateCard(),
    activeSubscription(orgId),
    latestSubscription(orgId),
    listPaymentsForOrg(orgId),
  ]);

  const price = subscriptionCharge(card);

  /**
   * `activeSubscription` decides whether the console is open;
   * `latestSubscription` only decides which sentence explains why it is
   * not. Keeping the second one out of the first is the #77 rule — one
   * question about entitlement, asked in one place, by every guard.
   */
  const plan = describePlanState({
    activeUntil: subscription?.periodEnd ?? null,
    latest,
    now: new Date(),
  });
  const sentence = planSentence(plan, locale);
  const paidUntil =
    plan.kind === "running" || plan.kind === "ending-soon" ? plan.until : null;

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
      // The plan and its receipts are a document, not a table: ~720px
      // wide whatever the viewport does, so left-aligning them stranded
      // the whole page against one edge of a wide screen. Same call as
      // the profile sheet, and for the same reason — see `AdminShell`.
      centred
    >
      <Panel>
        <PanelHeader label={BILLING.planName[locale]} />
        <PanelBody className="pt-6">
          <p className="d-sm">
            {formatMoney(price, card.currency)}{" "}
            <span className="t-muted">{BILLING.perMonth[locale]}</span>
          </p>
          <p className="t-muted mt-3 max-w-[60ch]">
            {BILLING.perApplicationNote[locale]}
          </p>

          {sentence ? (
            <p className="mt-6 max-w-[60ch] text-[15px] text-ink-2">{sentence}</p>
          ) : null}

          {/* One act, and which one depends on nothing but whether the
              plan is running. An agency inside its period cannot buy
              the next month — `purchaseSubscription` refuses while one
              is active — so offering both would be a button that does
              nothing. */}
          <div className="mt-6">
            {paidUntil ? (
              <CancelPlan paidUntil={formatDate(paidUntil, locale)} />
            ) : (
              <PayPlan />
            )}
          </div>

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

      <Panel className="mt-8">
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
