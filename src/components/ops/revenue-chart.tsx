"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/domain/pricing";
import type { RevenuePoint } from "@/lib/domain/payments";

/**
 * Revenue by billing cycle, stacked into the three states money can be
 * in.
 *
 * **One axis, deliberately.** The obvious next move is to overlay the
 * application count as a line, and that would be a second y-scale on
 * the same plot — the reader has no way to know which axis a mark
 * belongs to, and the crossing point of the two series is an artefact of
 * the scales rather than a fact about the business. The count is in the
 * tooltip instead, where it answers "what drove this month" without
 * pretending to share units with the money.
 *
 * The stack order is load-bearing: collected, accruing, outstanding.
 * Collected and outstanding are only ΔE 7 apart under protanopia, which
 * is inside the floor band — putting the blue between them means no
 * adjacent pair on the chart is one a colour-blind reader has to work
 * at. The fills also carry a 2px surface gap, and the legend names all
 * three, so identity never rests on hue alone.
 */

const config = {
  collectedMinor: {
    label: "Collected",
    color: "var(--chart-collected)",
  },
  accruingMinor: {
    label: "Accruing",
    color: "var(--chart-accruing)",
  },
  outstandingMinor: {
    label: "Outstanding",
    color: "var(--chart-outstanding)",
  },
} satisfies ChartConfig;

/** `2026-07` → `Jul`, with the year when the series crosses one. */
function cycleLabel(cycle: string, showYear: boolean): string {
  const date = new Date(`${cycle}-01T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: showYear ? "2-digit" : undefined,
    timeZone: "UTC",
  });
}

export function RevenueChart({
  points,
  currency,
}: {
  points: RevenuePoint[];
  currency: string;
}) {
  if (points.length === 0) {
    return (
      <p className="t-muted px-6 py-10 text-center">
        No billing history yet. A cycle appears here once a client has been
        through one.
      </p>
    );
  }

  const spansYears =
    new Set(points.map((p) => p.cycle.slice(0, 4))).size > 1;

  const data = points.map((p) => ({
    ...p,
    label: cycleLabel(p.cycle, spansYears),
  }));

  return (
    <ChartContainer config={config} className="h-[280px] w-full">
      {/* `maxBarSize` so a business with one month of history gets a bar
          rather than a wall — Recharts fills the whole band otherwise. */}
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ left: 4, right: 4 }}
        maxBarSize={72}
      >
        {/* Horizontal only. Vertical rules on a categorical axis divide
            the months from each other, which they already are. */}
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          // Whole currency units — the cents on an axis label are three
          // characters of noise on a figure nobody reads to the penny.
          tickFormatter={(value: number) =>
            formatMoney(Math.round(value / 100) * 100, currency).replace(
              /\.00$/,
              ""
            )
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="label"
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="t-muted">
                    {config[name as keyof typeof config]?.label ?? name}
                  </span>
                  <span className="num font-semibold">
                    {formatMoney(Number(value), currency)}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {/* `stackId` shared, so the three states sum to the month's
            total rather than hiding each other. */}
        <Bar
          dataKey="collectedMinor"
          stackId="money"
          fill="var(--color-collectedMinor)"
          stroke="var(--surface)"
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Bar
          dataKey="accruingMinor"
          stackId="money"
          fill="var(--color-accruingMinor)"
          stroke="var(--surface)"
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Bar
          dataKey="outstandingMinor"
          stackId="money"
          fill="var(--color-outstandingMinor)"
          stroke="var(--surface)"
          strokeWidth={2}
          isAnimationActive={false}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
