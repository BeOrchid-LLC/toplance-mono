import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The plate. One sign face: a solid surface with a machined edge, sitting
 * on the concourse rather than floating above it. What separates it from
 * its ground is the ground being darker and the plate having a real edge,
 * which is why the elevation is a 1px contact shadow and not a blur.
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
          "[&::-webkit-details-marker]:hidden",
          // The ring turns inward here — the first of the two deviations
          // `:focus-visible` in globals.css permits. This summary is the
          // whole top edge of an `overflow-hidden` <details>, so an
          // outward 2px ring is cut off on three sides and what a
          // keyboard user gets is a line under the label. Measured in a
          // browser rather than reasoned about: the fold reported
          // `clipped by an overflow ancestor: true` at 2px out and false
          // at 2px in. Same token, same width, drawn on the inside.
          "focus-visible:-outline-offset-2"
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
