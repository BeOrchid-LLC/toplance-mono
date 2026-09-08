import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: number | string;
  /** One real fact under the figure — what it counts, or what it means. */
  sub: string;
  icon: LucideIcon;
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
  "rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-sm)]";

/** The figure itself. Identical whether or not the card is a door. */
function KpiBody({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="t-muted">{kpi.label}</p>
        {/* Tinted toward transparent, not toward --surface: these cards
            sit on the ruled ground and an opaque chip would punch a
            rectangle through it (guideline §3). */}
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] text-brand-text">
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p
        className={cn(
          "num mt-3 text-[32px] font-semibold leading-none",
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
export function KpiRow({ items }: { items: Kpi[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
  );
}
