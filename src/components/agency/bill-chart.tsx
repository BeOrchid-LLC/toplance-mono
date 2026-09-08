"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/domain/pricing";
import { fill } from "@/lib/i18n/fill";
import type { Invoice, InvoiceStatus } from "@/lib/domain/payments";
import type { Locale } from "@/lib/i18n/locales";

/**
 * What this agency has been charged, one bar per billing cycle.
 *
 * The sibling of `@/components/ops/revenue-chart`, and the same figures
 * seen from the other side of the table: there they are BeOrchid's
 * revenue, here they are one agency's cost. Same rows, opposite
 * meaning — which is the whole reason this is a second component with
 * its own copy rather than the same one pointed at a filtered list. A
 * chart labelled "revenue" on a director's own dashboard would be
 * telling them their bill was their income.
 *
 * **One bar per cycle, coloured by where the money stands** — settled,
 * still accruing, or owed. Not a stack of base fee and per-application
 * fee, though that is the composition a director asks about next: a
 * cycle is settled or it is not, as a whole, so painting settlement
 * across two stacked segments would draw a half-paid invoice that does
 * not exist. The composition goes in the tooltip instead, which is the
 * same trade `revenue-chart` makes with the application count, and for
 * the same reason: a second encoding on the plot is a second thing to
 * be wrong about.
 *
 * The three colours are the ones already verified for this product —
 * see the note in `revenue-chart` on the ΔE floor under protanopia. Each
 * bar also carries its state in the tooltip, so nothing here rests on
 * hue alone.
 */

const config = {
  amountMinor: { label: "Charged" },
} satisfies ChartConfig;

/**
 * How a cycle's state is painted.
 *
 * `open` and `failed` are one colour deliberately. They differ in why
 * the money has not arrived, not in whether it is owed, and a director
 * looking at this chart is asking the second question. The first is
 * answered on `/agency/billing`, which is where anything can be done
 * about it.
 */
const FILL: Record<InvoiceStatus, string> = {
  paid: "var(--chart-collected)",
  draft: "var(--chart-accruing)",
  open: "var(--chart-outstanding)",
  failed: "var(--chart-outstanding)",
};

/** Every string this chart says, resolved by the caller's locale. */
export type BillChartCopy = {
  /** Shown in place of the chart before the first cycle closes. */
  empty: string;
  /** The tooltip's total row. */
  charged: string;
  /** The recurring part. */
  baseFee: string;
  /** The layered per-application part. */
  perCase: string;
  /** `{n}` cases became billable in this cycle. */
  cases: string;
  status: Record<InvoiceStatus, string>;
};

/**
 * `2026-07-01` → `Jul`, with the year when the series crosses one.
 *
 * In the reader's own language. This panel is on the agency console,
 * which is translated into all ten of `LOCALES`, and a fully translated
 * panel with a Latin-script "Jul / Aug / Sep" axis is a screen that
 * gave up halfway. `@/components/ops/revenue-chart` hardcodes `en-GB`
 * and is right to: `/ops` is BeOrchid's own English-only console, which
 * is the distinction `funnelLabel` on this page already draws.
 */
function cycleLabel(start: Date, showYear: boolean, locale: Locale): string {
  return start.toLocaleDateString(locale, {
    month: "short",
    year: showYear ? "2-digit" : undefined,
    timeZone: "UTC",
  });
}

export function BillChart({
  invoices,
  locale,
  copy,
}: {
  invoices: Invoice[];
  /** Formats the month axis; the words come from `copy`. */
  locale: Locale;
  copy: BillChartCopy;
}) {
  if (invoices.length === 0) {
    return <p className="t-muted px-6 py-10 text-center">{copy.empty}</p>;
  }

  const currency = invoices[0].currency;
  const spansYears =
    new Set(invoices.map((i) => i.cycleStart.getUTCFullYear())).size > 1;

  const data = invoices.map((invoice) => ({
    label: cycleLabel(invoice.cycleStart, spansYears, locale),
    amountMinor: invoice.amountMinor,
    baseFeeMinor: invoice.baseFeeMinor,
    // Derived rather than carried: `quote` layers the per-application
    // bands, so the only honest way to name that part of the bill is
    // whatever the total is over the base.
    perCaseMinor: invoice.amountMinor - invoice.baseFeeMinor,
    applications: invoice.applications,
    status: invoice.status,
  }));

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }} maxBarSize={72}>
        {/* Horizontal only. Vertical rules on a categorical axis divide
            the months from each other, which they already are. */}
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          // Whole currency units — the cents on an axis label are three
          // characters of noise on a figure nobody reads to the penny.
          tickFormatter={(value: number) =>
            formatMoney(Math.round(value / 100) * 100, currency).replace(/\.00$/, "")
          }
        />
        <ChartTooltip
          content={
            /* No `labelKey`. There is no `label` entry in `config`, and
               recharts does not put one on the payload either, so naming
               it resolved to nothing and `ChartTooltipContent` rendered
               no header at all — a tooltip that never said which month
               it was about. Left off, it falls back to the axis
               category, which is the month. */
            <ChartTooltipContent
              hideIndicator
              formatter={(value, _name, item) => {
                const row = item?.payload as (typeof data)[number] | undefined;
                if (!row) return null;
                return (
                  <div className="grid w-full gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="t-muted">{copy.charged}</span>
                      <span className="num font-semibold">
                        {formatMoney(Number(value), currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="t-muted">{copy.baseFee}</span>
                      <span className="num">
                        {formatMoney(row.baseFeeMinor, currency)}
                      </span>
                    </div>
                    {/* Only when there is one. A "$0.00" row against a
                        quiet cycle reads as a charge that was made. */}
                    {row.perCaseMinor > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="t-muted">{copy.perCase}</span>
                        <span className="num">
                          {formatMoney(row.perCaseMinor, currency)}
                        </span>
                      </div>
                    )}
                    <p className="special mt-1">
                      {fill(copy.cases, { n: row.applications })}
                      {" · "}
                      {copy.status[row.status]}
                    </p>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="amountMinor" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((row) => (
            <Cell key={row.label} fill={FILL[row.status]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
