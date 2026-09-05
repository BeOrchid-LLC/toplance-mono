"use client";

import { useMemo, useState } from "react";

import { formatMoney, quote, type RateCard } from "@/lib/domain/pricing";
import { useT } from "@/components/locale-provider";
import { PRICING_ESTIMATOR } from "@/lib/i18n/pricing-estimator";
import { SITE_CHROME } from "@/lib/i18n/site-chrome";

/**
 * "Estimate your monthly cost", as Peace's pricing document asks for.
 *
 * The card comes from the server so the calculator and the bill are
 * quoted at the same rates — a page that hardcoded its own numbers would
 * drift from the database the first time the rates move, and a pricing
 * page that disagrees with the invoice is worse than no calculator.
 *
 * `quote` is imported from the domain module rather than reimplemented
 * here. It is pure and free of `db`, so this client component carries the
 * real arithmetic, not an approximation of it, and the layer breakdown
 * shown is the one a business is actually charged.
 */
export function PricingEstimator({ card }: { card: RateCard }) {
  const t = useT();
  const [value, setValue] = useState(200);

  const estimate = useMemo(() => quote(value, card), [value, card]);

  return (
    <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
      <label htmlFor="apps" className="tag block">
        {t(PRICING_ESTIMATOR.applicationsLabel)}
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
        <input
          id="apps"
          type="range"
          min={0}
          max={2000}
          step={10}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="h-2 min-w-[220px] flex-1 cursor-pointer appearance-none rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--brand)_18%,var(--mix))] accent-[var(--brand)]"
          aria-describedby="estimate-total"
        />
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => {
            // An empty field parses as NaN, and NaN reaches `quote`,
            // which refuses it — clamp here instead of throwing at the
            // person typing.
            const next = Number(e.target.value);
            setValue(Number.isFinite(next) && next >= 0 ? Math.floor(next) : 0);
          }}
          className="num w-28 rounded-sm border border-border-strong bg-surface px-3 py-2 text-end text-base"
          aria-label={t(PRICING_ESTIMATOR.applicationsLabel)}
        />
      </div>

      <dl className="mt-7 grid gap-3 border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[15px] text-ink-2">{t(PRICING_ESTIMATOR.baseFee)}</dt>
          <dd className="num text-[15px]">
            {formatMoney(estimate.baseFeeMinor, estimate.currency)}
          </dd>
        </div>

        {/* Keyed by position: the layers come out of `quote` in band
            order, and two bands are allowed to share a rate (a card with
            $18 either side of a threshold is odd but legal), which makes
            the rate itself a key that can collide. */}
        {estimate.layers.map((layer, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="text-[15px] text-ink-2">
              <span className="num">{layer.count.toLocaleString("en-US")}</span>{" "}
              {t(
                layer.count === 1
                  ? PRICING_ESTIMATOR.applicationSingular
                  : PRICING_ESTIMATOR.applicationPlural
              )}{" "}
              {t(SITE_CHROME.wordAt)}{" "}
              <span className="num">
                {formatMoney(layer.rateMinor, estimate.currency)}
              </span>
            </dt>
            <dd className="num text-[15px]">
              {formatMoney(layer.subtotalMinor, estimate.currency)}
            </dd>
          </div>
        ))}

        <div
          id="estimate-total"
          aria-live="polite"
          className="mt-2 flex items-baseline justify-between gap-4 border-t border-border-strong pt-4"
        >
          <dt className="t-h3">{t(PRICING_ESTIMATOR.monthlyTotal)}</dt>
          <dd className="num d-sm">
            {formatMoney(estimate.totalMinor, estimate.currency)}
          </dd>
        </div>
      </dl>

      {/* Says exactly what the code counts. This used to promise that
          "abandoned" applications are never charged, which was a wider
          claim than `markBillableIfComplete` keeps — it bills on a
          complete checklist, and whether a complete checklist that is
          never submitted should be billed is a question for the client,
          not one to answer by implication on a pricing page. */}
      <p className="t-muted mt-5 max-w-[62ch]">{t(PRICING_ESTIMATOR.disclaimer)}</p>
    </div>
  );
}
