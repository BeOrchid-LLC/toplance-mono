"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";
import { HERO } from "@/lib/i18n/hero";
import {
  CORRIDORS_LIVE,
  CORRIDORS_SOON,
  ORIGINS,
  PURPOSES,
  type Purpose,
} from "@/lib/domain/corridors";
import { MrzBand } from "@/components/shared/mrz-band";
import { useCorridor } from "@/components/site/corridor-state";

/**
 * One slot of the bar. A real `<select>` sits transparent across the whole
 * cell rather than a custom listbox: on the mid-range Android this page is
 * mostly read on, the native picker is faster, works offline, and is
 * already translated into the user's system language. The visible text is
 * ours; the interaction is the phone's.
 */
function Slot({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: readonly { name: string; flag?: string }[];
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col justify-center gap-1.5 px-5 py-4 transition-colors",
        /* Both states mix toward `transparent`, not toward `--surface`.
           An opaque tint here would punch a solid rectangle through the
           laminate on hover and undo the refraction under that one slot. */
        "has-[select:focus-visible]:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]",
        "has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-inset has-[select:focus-visible]:ring-brand",
        "hover:bg-[color-mix(in_srgb,var(--surface-2)_60%,transparent)]",
        className
      )}
    >
      <span className="tag">{label}</span>
      <span className="d-sm flex min-w-0 items-center gap-2 text-ink">
        <span className="truncate">{value}</span>
        <ChevronDown className="size-4 shrink-0 text-ink-3" aria-hidden />
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0 outline-none"
      >
        {options.map((o) => (
          <option key={o.name} value={o.name}>
            {o.flag ? `${o.flag}  ${o.name}` : o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * The hero's thesis, and the only place on the page that argues by doing
 * rather than by claiming: a corridor is a nationality, a destination and
 * a reason, and it resolves to one specific list. Everything below the
 * fold is elaboration on this object.
 */
export function CorridorBar({
  compact = false,
  ctaLabel,
}: {
  compact?: boolean;
  /**
   * Overrides the call to action for a live corridor. The default is the
   * translated "For organisations", which is the right words on the
   * traveller page and a tautology on the organisations' own page — the
   * home page passes its own label rather than telling its reader to go
   * where they already are.
   *
   * Deliberately untranslated: only the surfaces that address the
   * traveller run in four languages, and every caller passing this is an
   * English-only B2B surface. A translated default stays the default.
   */
  ctaLabel?: string;
}) {
  const t = useT();
  const { origin, destination, purpose, status, code, mrz, set } = useCorridor();

  const destinations = [...CORRIDORS_LIVE, ...CORRIDORS_SOON];
  const soon = status === "soon";

  return (
    <div>
      {/* One laminated card, not a card plus two loose lines beneath it.
          The slots, the machine-readable band and the status all sit under
          the same sheet, which is the arrangement a data page actually
          has — and it means the specular sweep crosses the whole object
          rather than a fragment of it. */}
      <div className="laminate overflow-hidden rounded-lg">
        {/* Keyed on the corridor, so choosing a slot tilts the card. */}
        <span key={code} aria-hidden className="laminate-sheen" />

        {/* Two full-width rows: the question on top, the answer and what
            to do about it underneath.

            The call to action used to be a fourth column spanning both
            rows — a solid brand slab, the height of the whole card,
            flush to its right edge. Three things were wrong with it once
            the agency hero grew a `Get Started` button of its own. It was
            a second primary on the first screen, competing with the
            first. Its label sat centred in a block tall enough to leave
            most of the blue empty, so the weight it carried was
            decoration rather than content. And it interrupted the
            specular sweep, which is the one effect that makes this card
            read as a laminated document rather than a form.

            As a normal control on the readout row it keeps its job —
            nothing about the interaction changed — and gives the sweep,
            the three slots and the machine-readable band the full width
            back. Separators are still drawn per cell rather than with
            `divide-*`, so the last slot can close without one. */}
        <div className="relative z-[1]">
          <div className="grid lg:grid-cols-[1fr_1.15fr_0.85fr]">
            <Slot
              label={t(HERO.slots.origin)}
              value={origin}
              options={ORIGINS}
              onChange={(next) => set({ origin: next })}
              className="border-b border-border lg:border-b-0 lg:border-r"
            />
            <Slot
              label={t(HERO.slots.destination)}
              value={destination}
              options={destinations}
              onChange={(next) => set({ destination: next })}
              className="border-b border-border lg:border-b-0 lg:border-r"
            />
            <Slot
              label={t(HERO.slots.purpose)}
              value={purpose}
              options={PURPOSES.map((p) => ({ name: p }))}
              onChange={(next) => set({ purpose: next as Purpose })}
              className="border-b border-border lg:border-b-0"
            />
          </div>

          {/* The band and the words for it are one row of the same card.
              The band is aria-hidden, so `code` beside it is the only
              reading of the corridor a screen reader ever gets — it stays,
              it just stops competing as a second object. */}
          <div className="flex flex-col gap-5 border-t border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <MrzBand code={mrz} />

              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  className={cn(
                    "tag inline-flex items-center gap-2",
                    soon ? "text-warning-ink" : "text-brand-text"
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      soon ? "bg-brand-accent" : "bg-brand"
                    )}
                    aria-hidden
                  />
                  {soon ? "In build" : "Live corridor"}
                </span>
                {/* A separator only separates while both halves share a line.
                    On a phone the code drops to its own row and the rule is
                    left hanging off the end of the one above it. */}
                <span
                  aria-hidden
                  className="hidden h-3 w-px bg-border-strong sm:block"
                />
                <span className="num text-[13px] font-semibold text-ink-2">
                  {code}
                </span>
              </div>
            </div>

            {/* Amber solid for a corridor that is not open, rather than
                the 18%-tinted panel the slab used. At button size a tint
                that faint stops reading as a state at all — and "request"
                and "start" being visibly different actions is the whole
                point of the distinction. */}
            <Button
              asChild
              className={cn(
                "group shrink-0 max-lg:w-full",
                soon &&
                  "bg-brand-accent text-ink hover:bg-[color-mix(in_srgb,var(--brand-accent)_85%,#fff)]"
              )}
            >
              <Link href="/employer/sign-up">
                {soon ? "Request this corridor" : (ctaLabel ?? t(HERO.ctaSecondary))}
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Names all three answers, not just the destination: the corridor
          may be closed because of the passport or the purpose, and
          "Canada is not open yet" is simply false when Canada is live for
          study. The promise to write on the day it opens is gone — there
          is no mailer behind it. */}
      {soon && !compact && (
        <p className="t-muted mt-3 max-w-[52ch] text-[15px]">
          {origin} → {destination} for {purpose.toLowerCase()} is not open
          yet — a corridor is all three, so switching any one of them may
          land on a live one. Ask for this one and it enters the build queue
          with your demand attached.
        </p>
      )}
    </div>
  );
}
