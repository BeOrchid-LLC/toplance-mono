"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/domain/pricing";
import { fill } from "@/lib/i18n/fill";
import type { ClientFeePoint } from "@/lib/domain/payments";
import type { Locale } from "@/lib/i18n/locales";

/**
 * What this agency's clients have paid, one bar per month.
 *
 * The third money chart in this product and the one that most needs its
 * label read carefully. `BillChart` beside it is the agency's cost;
 * `@/components/ops/revenue-chart` is BeOrchid's income. This is neither
 * — it is the fees *travellers* paid for their own applications, on
 * cases this agency is handling.
 *
 * **It is not the agency's earnings, and must never be labelled as such.**
 * `payment_shape_matches_kind` in `schema.ts` keeps `org_id` off a
 * `client_application` row on the explicit reasoning that the traveller
 * is the payer and the agency is not; the schema comment calls these
 * "separate charges to separate payers". The money on this chart reaches
 * BeOrchid. What the agency charges its own clients is not modelled
 * anywhere in this product, so there is no honest chart of it to draw —
 * and drawing this one under the word "earnings" would be answering that
 * question with somebody else's ledger. The copy comes from the caller,
 * and `AGENCY.clientFees*` is written to say what this actually is.
 *
 * One flat colour, not the three `BillChart` uses. Those encode where a
 * cycle stands — settled, accruing, owed — and a fee on this chart is
 * settled by construction: `clientFeesForOrgs` reads `status = 'paid'`
 * and nothing else. A second colour here would have to mean something,
 * and there is nothing left for it to mean.
 *
 * Empty months are drawn as zeroes rather than dropped, which is a
 * property of the data — see `clientFeesByMonth` on why a missing month
 * silently rewrites a categorical axis.
 */

const config = {
  totalMinor: { label: "Paid" },
} satisfies ChartConfig;

/** Every string this chart says, resolved by the caller's locale. */
export type ClientFeeChartCopy = {
  /** Shown in place of the chart when nothing has settled in the window. */
  empty: string;
  /** The tooltip's total row. */
  paid: string;
  /** `{n}` cases were paid for in this month. */
  cases: string;
  /** Warns that fees in another currency are not on the chart. */
  mixedCurrency: string;
};

/**
 * `2026-08` → `Aug`, with the year when the window crosses one, in the
 * reader's own language — see `cycleLabel` in `BillChart` on why this
 * console localises its axis where `/ops` does not.
 */
function monthLabel(month: string, showYear: boolean, locale: Locale): string {
  // Midday rather than midnight: the key is a UTC month, and a date
  // built at 00:00Z formats as the previous month anywhere west of
  // Greenwich. The chart would read one month behind its own data.
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    year: showYear ? "2-digit" : undefined,
    timeZone: "UTC",
  });
}

export function ClientFeeChart({
  points,
  currency,
  totalMinor,
  mixedCurrency,
  locale,
  copy,
}: {
  points: ClientFeePoint[];
  currency: string;
  /** The window's total. Zero means nothing settled, not "no data". */
  totalMinor: number;
  mixedCurrency: boolean;
  /** Formats the month axis; the words come from `copy`. */
  locale: Locale;
  copy: ClientFeeChartCopy;
}) {
  // A row of six zero-height bars draws an axis and says nothing. The
  // sentence says the same thing and says it in the reader's language.
  if (totalMinor === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="t-muted">{copy.empty}</p>
        {/* An empty chart and money in the window are not exclusive:
            the currency is chosen by the tile above, so a window
            holding nothing but fees in some *other* currency draws no
            bars. Saying only "nothing settled" there would be false.
            See `clientFeesForOrgs`. */}
        {mixedCurrency && <p className="special mt-2">{copy.mixedCurrency}</p>}
      </div>
    );
  }

  const spansYears = new Set(points.map((p) => p.month.slice(0, 4))).size > 1;

  const data = points.map((point) => ({
    label: monthLabel(point.month, spansYears, locale),
    totalMinor: point.totalMinor,
    cases: point.cases,
  }));

  return (
    <>
      <ChartContainer config={config} className="h-[240px] w-full">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ left: 4, right: 4 }}
          maxBarSize={72}
        >
          {/* Horizontal only, matching `BillChart` — vertical rules on a
              categorical axis divide months that are already divided. */}
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            // Whole currency units. The cents on an axis label are three
            // characters of noise on a figure nobody reads to the penny.
            tickFormatter={(value: number) =>
              formatMoney(Math.round(value / 100) * 100, currency).replace(/\.00$/, "")
            }
          />
          <ChartTooltip
            content={
              /* No `labelKey` — see `BillChart`. Naming one resolves to
                 nothing and suppresses the tooltip's header, leaving a
                 tooltip that never says which month it is about. */
              <ChartTooltipContent
                hideIndicator
                formatter={(value, _name, item) => {
                  const row = item?.payload as (typeof data)[number] | undefined;
                  if (!row) return null;
                  return (
                    <div className="grid w-full gap-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="t-muted">{copy.paid}</span>
                        <span className="num font-semibold">
                          {formatMoney(Number(value), currency)}
                        </span>
                      </div>
                      <p className="special mt-1">
                        {fill(copy.cases, { n: row.cases })}
                      </p>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="totalMinor"
            radius={[4, 4, 0, 0]}
            fill="var(--chart-collected)"
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>

      {/* Said on the chart rather than left to the tile above it. A
          total that quietly omits a currency is the one failure mode
          `collapseClientRevenue` cannot fix by picking well. */}
      {mixedCurrency && <p className="special mt-3 px-2">{copy.mixedCurrency}</p>}
    </>
  );
}
