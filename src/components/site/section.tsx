import { Shell } from "@/components/shared/shell";
import { cn } from "@/lib/utils";

/**
 * Every section is one entry in a register, and its name lives in the
 * margin beside it rather than on a band across the page.
 *
 * The band this replaces was the page's own signature turned into
 * wallpaper: a run of `<` fillers that encoded nothing, printed seven
 * times, on a grey slab that chopped the page into the strips this
 * redesign existed to remove. The MRZ still appears twice — in the hero
 * and in the closing bar — where it carries the actual corridor. Making
 * it rare is what makes it read as a mark rather than as a texture.
 *
 * The rail is sticky, so the name of the part you are reading stays
 * beside you the whole way down it. `datum` is for a fact and never a
 * label; with nothing true to say, the rail carries only the name.
 *
 * Extracted from the landing page when the register grew a second
 * reader: `/` addresses the organisation buying seats, `/travelers`
 * addresses the person travelling. Two copies of the rail would drift,
 * and the whole point of the measure is that both pages scan as one
 * document.
 */
export function Section({
  id,
  label,
  datum,
  glow = false,
  className,
  children,
}: {
  id?: string;
  label: string;
  datum?: string;
  glow?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative isolate scroll-mt-[var(--bar-h)] border-t border-border",
        className
      )}
    >
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -end-[10%] -top-[40%] -z-10 size-[680px] rounded-full opacity-40 blur-[130px] [background:radial-gradient(circle,var(--brand-2),transparent_70%)]"
        />
      )}
      <Shell className="grid gap-x-14 gap-y-9 py-20 md:py-24 lg:grid-cols-[184px_1fr]">
        <div className="lg:sticky lg:top-[calc(var(--bar-h)+40px)] lg:self-start">
          <span
            aria-hidden
            className="mb-3 block h-[2px] w-6 rounded-[var(--radius-pill)] bg-brand"
          />
          <p className="tag text-ink-2">{label}</p>
          {datum && <p className="tag mt-2 leading-relaxed">{datum}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </Shell>
    </section>
  );
}

export function Head({ title, lead }: { title: string; lead?: string }) {
  return (
    <div>
      <h2 className="d-lg max-w-[26ch]">{title}</h2>
      {lead && <p className="t-body-lg mt-5 max-w-[62ch] text-ink-2">{lead}</p>}
    </div>
  );
}
