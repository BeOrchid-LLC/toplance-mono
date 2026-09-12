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
 * The headline strip at the top of an ops screen: a row of counters on
 * the same plate across every screen that has one.
 * Lifted out of `/ops/corridors/page.tsx`, which keeps its own inline
 * copy — this component is for the screens built after it.
 *
 * `columns` is the widest the grid ever goes. Four is the common case;
 * the dashboard's money and operations rows want five, and five tiles in
 * a four-column grid drop one onto a row of its own.
 *
 * The steps are container queries, not viewport ones. `lg:grid-cols-5`
 * fired at a 1024px *window*, which inside the console rail is 726px of
 * actual row — 145px a tile. Measured on the row itself, five columns
 * arrive at 896px and each tile gets 179px or better.
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
    <div
      className={cn(
        "@container/row mt-8 overflow-hidden rounded-lg border border-border bg-surface",
        className
      )}
    >
      <dl
        className={cn(
          "relative z-[1] grid @md/row:grid-cols-2",
          columns === 3 && "@4xl/row:grid-cols-3",
          columns === 4 && "@4xl/row:grid-cols-4",
          columns === 5 && "@4xl/row:grid-cols-5"
        )}
      >
        {counters.map((c, i) => (
          <div
            key={c.label}
            className={cn(
              "@container/tile min-w-0 border-border px-5 py-5",
              "border-b @md/row:[&:nth-last-child(-n+2)]:border-b-0 @4xl/row:border-b-0",
              i < counters.length - 1 && "@4xl/row:border-e",
              i % 2 === 0 && "@md/row:border-e"
            )}
          >
            <dt className="tag">{c.label}</dt>
            {/* Sized against the tile, not the window. Five tiles in a
                969px console are 194px wide, which leaves 154px inside
                the padding — and `$14,100.00` set at 32px is 198px, so
                three of the ops dashboard's five money figures used to
                run past their own divider and collide with the next
                tile's. The steps are keyed to `@container/tile`, so a
                figure gets its full size exactly when its own cell can
                hold it, whatever the row decided about columns.

                200px is that arithmetic and not a round number: it is
                the 198px `$14,100.00` occupies at 32px, which is the
                widest figure this product prints. It is compared
                against the tile's *content* box, because that is what a
                container query measures — the `px-5` is already
                subtracted, so this threshold is the room the figure
                actually gets and not the tile it sits in. The ops
                dashboard's four-across row clears it at 206px and keeps
                32px; the five-across money row has 156px and steps down
                rather than overflowing. */}
            <dd
              className={cn(
                "num mt-2 text-[22px] @min-[165px]/tile:text-[26px] @min-[200px]/tile:text-[32px] font-semibold leading-none",
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
