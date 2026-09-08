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
  /**
   * A text token — `text-warning-ink` and so on, never a raw colour.
   * Optional: a figure only earns a colour when its value changes what
   * somebody does, and a row where every counter is tinted has told the
   * reader nothing.
   */
  tone?: string;
};

/**
 * The laminated headline strip at the top of an ops screen: a row of
 * counters on the same glass surface across every screen that has one.
 * Lifted out of `/ops/corridors/page.tsx`, which keeps its own inline
 * copy — this component is for the screens built after it.
 *
 * `columns` is the widest the grid ever goes. Four is the common case;
 * the dashboard's money and operations rows want five, and five tiles in
 * an `lg:grid-cols-4` grid drop one onto a row of its own.
 */
export function CounterRow({
  counters,
  columns = 4,
  className,
}: {
  counters: Counter[];
  columns?: 3 | 4 | 5;
  className?: string;
}) {
  return (
    <div className={cn("laminate mt-8 overflow-hidden rounded-lg", className)}>
      <span aria-hidden className="laminate-sheen" />
      <dl
        className={cn(
          "relative z-[1] grid sm:grid-cols-2",
          columns === 3 && "lg:grid-cols-3",
          columns === 4 && "lg:grid-cols-4",
          columns === 5 && "lg:grid-cols-5"
        )}
      >
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
            <dd
              className={cn(
                "num mt-2 text-[32px] font-semibold leading-none",
                c.tone ?? "text-ink"
              )}
            >
              {c.value}
            </dd>
            {c.sub && <dd className="t-muted mt-2">{c.sub}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}
