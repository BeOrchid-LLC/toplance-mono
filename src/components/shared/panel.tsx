import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The case-file card. One sheet in the traveller's dossier: a matte
 * surface with a hairline edge and real (small) elevation. Matte on
 * purpose — the laminate in the corridor header is the only glass on any
 * screen, and these cards are the ground it reads against.
 *
 * The header pairs a quiet caps label with one right-aligned datum
 * (a badge, a count, an action). The label names the sheet; the datum is
 * a fact about it, never a second label.
 */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  label,
  aside,
  className,
}: {
  label: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-3 sm:px-6",
        className
      )}
    >
      <h2 className="t-title">{label}</h2>
      {aside}
    </div>
  );
}

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("px-5 py-5 sm:px-6", className)}>{children}</div>;
}

/**
 * The same sheet, folded.
 *
 * A `<details>` rather than the Radix accordion in `ui/accordion.tsx`:
 * the content inside is server-rendered and static, so folding it needs
 * no client boundary, and the browser already gives `<summary>` its
 * keyboard behaviour, its expanded state and its focus ring. The
 * accordion earns its client bundle where one section closing another
 * has to be coordinated; nothing here coordinates.
 *
 * `defaultOpen` names what it does: it sets the fold on first paint and
 * then leaves it alone. Whether a reader opens or shuts a set afterwards
 * is theirs, not the page's.
 */
export function DisclosurePanel({
  label,
  aside,
  defaultOpen = true,
  className,
  children,
}: {
  label: string;
  /** One right-aligned datum, on the same terms as `PanelHeader`'s. */
  aside?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group/fold overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <summary
        className={cn(
          // Same anatomy and the same height as `PanelHeader`, so a set
          // that folds and a panel that does not read as one family of
          // sheets rather than as two kinds of card.
          // No wrapper around the chevron and the label: `me-auto` on
          // the heading absorbs the free space instead, which keeps the
          // aside at the right edge without nesting a heading inside a
          // `<span>` — phrasing content, which a heading is not.
          "flex min-h-[60px] cursor-pointer list-none select-none flex-wrap items-center gap-x-2 gap-y-1 px-5 py-3 sm:px-6",
          // The rule under the label belongs to the open state — shut,
          // the summary is the whole sheet and a line across its foot
          // would be underlining nothing.
          "border-b border-transparent group-open/fold:border-border",
          // `list-none` above covers most engines; WebKit needs its own
          // marker turned off, or the chevron below is the second
          // disclosure mark on the row.
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        <ChevronRight
          className="size-4 shrink-0 text-ink-3 transition-transform duration-[var(--dur-toggle)] ease-[var(--ease-out)] group-open/fold:rotate-90"
          aria-hidden
        />
        <h2 className="t-title me-auto min-w-0">{label}</h2>
        {aside}
      </summary>
      {children}
    </details>
  );
}
