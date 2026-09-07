import { cn } from "@/lib/utils";

/** One number in a `CounterRow`. */
export type Counter = {
  label: string;
  /**
   * `ReactNode` rather than `number` — a plain count (`/ops/corridors`)
   * is a number, but a counter that reads "3 of 5" (seats used, this
   * console) is already a string by the time it gets here. Neither
   * caller should have to coerce the other's shape.
   */
  value: React.ReactNode;
  /**
   * Optional — a tile only needs a gloss when a bare number could be
   * misread (the list page's platform-wide aggregates: "12" needs
   * "across every agency" beside it). A tile already scoped to one
   * thing, like this console's per-agency counters, needs none, and
   * inventing one just to satisfy a required field is worse than
   * having none.
   */
  sub?: string;
  tone: string;
};

/**
 * The laminated headline strip at the top of an ops screen: up to four
 * counters in a responsive grid, on the same glass surface across every
 * screen that has one. Lifted out of `/ops/corridors/page.tsx`, which
 * keeps its own inline copy — this component is for the screens built
 * after it.
 */
export function CounterRow({ counters }: { counters: Counter[] }) {
  return (
    <div className="laminate mt-8 overflow-hidden rounded-lg">
      <span aria-hidden className="laminate-sheen" />
      <dl className="relative z-[1] grid sm:grid-cols-2 lg:grid-cols-4">
        {counters.map((c, i) => (
          <div
            key={c.label}
            className={cn(
              "border-border px-5 py-5",
              "border-b sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0",
              i < counters.length - 1 && "lg:border-e",
              i % 2 === 0 && "sm:border-e"
            )}
          >
            <dt className="tag">{c.label}</dt>
            <dd className={cn("num mt-2 text-[32px] font-semibold leading-none", c.tone)}>
              {c.value}
            </dd>
            {c.sub && <dd className="t-muted mt-2">{c.sub}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}
