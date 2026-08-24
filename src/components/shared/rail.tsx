import { cn } from "@/lib/utils";

/**
 * The margin rail from guideline §6: a sticky label in the left margin
 * naming the part of the document you are currently reading. For long
 * scrolling documents only — on a short screen it is a wide empty
 * column, and the label stops being useful the moment you can see the
 * whole section at once.
 *
 * `datum` carries a fact, never a second label. With nothing true to put
 * there it is omitted rather than filled — the landing page's rails do
 * the same, and §7 is the reason.
 *
 * The label is `.special-caps`, not the `.tag` §6 describes. §6 wrote
 * down the landing page's rail, and the landing page is marketing; this
 * rail is used on product screens, where §2's fence is bold, called
 * client-locked, and beats a spec extracted from the other side of it.
 * The two roles are the same 13px/600/`--ink-3`, so honouring the fence
 * costs nothing but the family — which is the entire point of it.
 */
export function RailSection({
  label,
  datum,
  id,
  className,
  children,
}: {
  label: string;
  datum?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "grid scroll-mt-[calc(var(--bar-h)+16px)] gap-x-14 gap-y-6 border-t border-border py-12 lg:grid-cols-[184px_1fr]",
        className
      )}
    >
      <div className="lg:sticky lg:top-[calc(var(--bar-h)+32px)] lg:self-start">
        <span
          aria-hidden
          className="mb-3 block h-[2px] w-6 rounded-[var(--radius-pill)] bg-brand"
        />
        <p className="special-caps">{label}</p>
        {datum && <p className="special mt-2 leading-relaxed">{datum}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
