import Link from "next/link";

import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: number | string;
  /** One real fact under the figure — what it counts, or what it means. */
  sub: string;
  /**
   * Where this figure lives in full. Omitted when the console has no
   * view behind the number — a card that looks clickable and goes
   * nowhere is worse than one that never offered, and inventing a
   * filtered route to justify the affordance is the §7 failure of
   * implying a capability that is not there.
   */
  href?: string;
  tone?: "neutral" | "info" | "warning" | "danger" | "success";
};

const TONE: Record<NonNullable<Kpi["tone"]>, string> = {
  neutral: "text-ink",
  info: "text-info-ink",
  warning: "text-warning-ink",
  danger: "text-danger-ink",
  success: "text-success-ink",
};

const BOX =
  "@container/tile min-w-0 rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-sm)]";

/**
 * The figure itself. Identical whether or not the card is a door.
 *
 * Title, figure and gloss are set exactly as `CounterRow` sets them on
 * the ops dashboard — `special-caps` label, the same container-keyed
 * figure steps, a `t-muted` line under it — because the client asked
 * for one typescale across overview cards (2026-09-17). The title used
 * to be `t-muted` sentence case, the same size and colour as the gloss
 * under the figure, so nothing marked it as the title.
 *
 * No icon. Each card carried a 36px brand-tinted chip, the loudest thing
 * in it after the figure, and it sat beside a 13px caps title that it
 * out-weighed; the dashboard's counters have none and read more clearly
 * for it. A label that needs a picture to be understood is the label to
 * fix.
 */
function KpiBody({ kpi }: { kpi: Kpi }) {
  return (
    <>
      <p className="special-caps min-w-0">{kpi.label}</p>
      <p
        className={cn(
          // Keyed to the card, not the window — see the same steps in
          // `counter-row.tsx` for what a 32px figure did to a 194px tile.
          "num mt-2 text-[22px] @min-[165px]/tile:text-[26px] @min-[200px]/tile:text-[32px] font-semibold leading-none",
          TONE[kpi.tone ?? "neutral"]
        )}
      >
        {kpi.value}
      </p>
      <p className="t-muted mt-2 group-hover:text-ink-2">{kpi.sub}</p>
    </>
  );
}

/**
 * The console's headline figures, each one a door where there is
 * somewhere to go.
 *
 * Cards rather than the ruled `<dl>` strip the requirements sheet uses,
 * because these are not four facts about one thing — they are four
 * separate places to go, and a shared sheet says the opposite. The
 * client asked for cards by name on 2026-09-07 (notes item 4) and for
 * them to navigate.
 *
 * A card with no `href` renders as the same box without the hover and
 * without the link semantics, so a row of four still reads as one
 * object whether or not every figure has a view behind it.
 *
 * Deliberately no "+10.4% from last month" line. Nothing in this product
 * records what any of these figures was a month ago, so that line could
 * only be invented — and guideline §7 puts data honesty above visual
 * polish: a figure nobody has earned does not get rendered. The `sub`
 * line carries a fact we do have instead.
 */
/**
 * Widest-breakpoint columns, keyed by how many cards there are.
 *
 * Written out rather than interpolated because Tailwind scans source
 * for whole class names — `xl:grid-cols-${n}` compiles to nothing. Four
 * is the default and the shape every `/ops` row uses; five exists
 * because the agency dashboard's money tile makes that row odd, and
 * four columns would leave the fifth card alone on a line looking like
 * a mistake rather than a figure.
 */
const COLUMNS: Record<number, string> = {
  1: "@4xl/row:grid-cols-1",
  2: "@4xl/row:grid-cols-2",
  3: "@4xl/row:grid-cols-3",
  4: "@4xl/row:grid-cols-4",
  5: "@4xl/row:grid-cols-5",
};

export function KpiRow({ items }: { items: Kpi[] }) {
  return (
    // The row is its own container so the steps below measure the space
    // the cards actually have. `xl:grid-cols-5` was a 1280px *window*,
    // which in the agency console is 984px of row — and the rail had
    // already taken the difference.
    <div className="@container/row">
      <div
        className={cn(
          "grid gap-4 @md/row:grid-cols-2",
          COLUMNS[items.length] ?? "@4xl/row:grid-cols-4"
        )}
      >
        {items.map((kpi) =>
          kpi.href ? (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={cn(
                "group transition-colors duration-[var(--dur-tap)] hover:border-border-strong",
                BOX
              )}
            >
              <KpiBody kpi={kpi} />
            </Link>
          ) : (
            <div key={kpi.label} className={BOX}>
              <KpiBody kpi={kpi} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
