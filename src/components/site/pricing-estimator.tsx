"use client";

import { useMemo, useState } from "react";

import { formatMoney, quote, type RateCard } from "@/lib/domain/pricing";

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
  const [value, setValue] = useState(200);

  const estimate = useMemo(() => quote(value, card), [value, card]);

  return (
    <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
      <label htmlFor="apps" className="tag block">
        Applications completed in a month
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
          className="num w-28 rounded-sm border border-border-strong bg-surface px-3 py-2 text-right text-base"
          aria-label="Applications completed in a month"
        />
      </div>

      <dl className="mt-7 grid gap-3 border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[15px] text-ink-2">Base fee</dt>
          <dd className="num text-[15px]">
            {formatMoney(estimate.baseFeeMinor, estimate.currency)}
          </dd>
        </div>

        {estimate.layers.map((layer) => (
          <div
            key={layer.rateMinor}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="text-[15px] text-ink-2">
              <span className="num">{layer.count.toLocaleString("en-US")}</span>{" "}
              {layer.count === 1 ? "application" : "applications"} at{" "}
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
          <dt className="t-h3">Monthly total</dt>
          <dd className="num d-sm">
            {formatMoney(estimate.totalMinor, estimate.currency)}
          </dd>
        </div>
      </dl>

      <p className="t-muted mt-5 max-w-[62ch]">
        Only applications that finish are counted — a checklist your client
        completes. Invited, in-progress and abandoned applications are never
        charged.
      </p>
    </div>
  );
}
