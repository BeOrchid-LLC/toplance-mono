"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";
import { HERO } from "@/lib/i18n/hero";
import { CORRIDOR_PICKER, fillTemplate } from "@/lib/i18n/corridor-picker";
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
           The slots sit on the card's own plate, and a tint mixed toward
           a ground they do not share would step out of it on hover. */
        "has-[select:focus-visible]:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]",
        /* The <select> below is `opacity-0`, so its own outline is
           invisible by construction and the slot has to draw the ring —
           the second permitted deviation on `:focus-visible` in
           globals.css. Inset rather than offset because the card is
           `overflow-hidden` and an outward ring on an inner slot would
           be cut off at its edge. `--ring`, not
           `--brand`: the fill hue was 2.078:1 against this plate in dark. */
        "has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-inset has-[select:focus-visible]:ring-ring",
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
        className="absolute inset-0 cursor-pointer opacity-0"
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
   * The caller supplies its own translated override rather than a raw
   * English literal — `/` (`src/app/(site)/page.tsx`) passes strings
   * indexed out of its own `SITE_HOME` dictionary by the current locale,
   * the same way `HERO`/`CORRIDOR_PICKER` are indexed below. This prop's
   * type stays a plain `string`; only its callers changed.
   */
  ctaLabel?: string;
}) {
  const t = useT();
  const { origin, destination, purpose, status, code, mrz, set } = useCorridor();

  const destinations = [...CORRIDORS_LIVE, ...CORRIDORS_SOON];
  const soon = status === "soon";

  return (
    <div>
      {/* One plate, not a plate plus two loose lines beneath it. The
          slots, the machine-readable band and the status all sit on the
          same surface, which is the arrangement a data page actually
          has. */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">

        {/* Two full-width rows: the question on top, the answer and what
            to do about it underneath.

            The call to action used to be a fourth column spanning both
            rows — a solid brand slab, the height of the whole card,
            flush to its right edge. Three things were wrong with it once
            the agency hero grew a `Get Started` button of its own. It was
            a second primary on the first screen, competing with the
            first. Its label sat centred in a block tall enough to leave
            most of the blue empty, so the weight it carried was
            decoration rather than content. And it cut the card in two,
            so the slots and the band beside it read as a fragment
            rather than as one object.

            As a normal control on the readout row it keeps its job —
            nothing about the interaction changed — and gives the three
            slots and the machine-readable band the full width back. Separators are still drawn per cell rather than with
            `divide-*`, so the last slot can close without one. */}
        <div className="relative z-[1]">
          <div className="grid lg:grid-cols-[1fr_1.15fr_0.85fr]">
            <Slot
              label={t(HERO.slots.origin)}
              value={origin}
              options={ORIGINS}
              onChange={(next) => set({ origin: next })}
              className="border-b border-border lg:border-b-0 lg:border-e"
            />
            <Slot
              label={t(HERO.slots.destination)}
              value={destination}
              options={destinations}
              onChange={(next) => set({ destination: next })}
              className="border-b border-border lg:border-b-0 lg:border-e"
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
                  {soon ? t(CORRIDOR_PICKER.inBuild) : t(CORRIDOR_PICKER.liveRoute)}
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
                point of the distinction.

                The label is `--way-ink` and the fill is `--way`, named
                as a pair on both halves so no later edit can move one
                without the other. It read `bg-brand-accent text-ink`
                until now, which was two tokens that happened to look
                right together on the old amber and stopped: `--ink` is
                near-white in dark, so a button anybody can reach and
                press was setting its own label at 1.501:1 on the fill,
                and 1.376:1 while the pointer was on it. Nor is this a
                regression to undo — the same pairing measured 2.077:1
                before the repaint and had never cleared the 3:1 a
                boundary owes, let alone the 4.5:1 a label does. `--way`
                is one fill in both themes and `--way-ink` is the ink
                that belongs on it in both, so the pair holds at 6.534:1
                at rest and 4.806:1 on hover, light and dark alike. Both
                figures moved with the 2026-09-10 repaint of `--way` to
                `--brand`'s blue: the fill is now DARK in both themes and
                the ink is white, the inverse of the amber this started
                from. Note the hover figure — mixing 15% white into an
                already-dark fill walks a white label TOWARD the 4.5
                floor rather than away from it, and 4.806 is the margin
                that leaves. A deeper mix here would fail. */}
            <Button
              asChild
              className={cn(
                "group shrink-0 max-lg:w-full",
                soon &&
                  "bg-way text-way-ink hover:bg-[color-mix(in_srgb,var(--way)_85%,#fff)]"
              )}
            >
              <Link href="/agency/sign-up">
                {soon
                  ? t(CORRIDOR_PICKER.requestThisRoute)
                  : (ctaLabel ?? t(HERO.ctaSecondary))}
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
          {fillTemplate(t(CORRIDOR_PICKER.notOpenYetTemplate), {
            o: origin,
            d: destination,
            p: purpose.toLowerCase(),
          })}
        </p>
      )}
    </div>
  );
}
