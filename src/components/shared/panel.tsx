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
