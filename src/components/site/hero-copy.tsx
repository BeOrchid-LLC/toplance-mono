"use client";

import { Check } from "lucide-react";

import { useT } from "@/components/locale-provider";
import { HERO } from "@/lib/i18n/hero";
import { CorridorBar } from "@/components/site/corridor-bar";

/**
 * The headline states the promise; the bar underneath keeps it. Putting
 * the control directly after the H1 — before the explanatory paragraph —
 * is the point of the whole page: you can act on the first screen without
 * reading a word of marketing, which is exactly what the product claims
 * about its intake.
 *
 * The stagger is the page's only orchestrated moment. Delays are inline
 * because they are positional, not semantic: each is "one beat after the
 * thing above it", and a named class per beat would be four classes that
 * only ever mean an ordinal.
 */
export function HeroCopy() {
  const t = useT();

  return (
    <div>
      <p className="tag rise text-brand-text">{t(HERO.kicker)}</p>

      <h1 className="d-hero rise mt-5 max-w-[24ch]" style={{ animationDelay: "70ms" }}>
        {t(HERO.title)}
      </h1>

      <div className="rise mt-10" style={{ animationDelay: "150ms" }}>
        <CorridorBar />
      </div>

      <div
        className="rise mt-12 grid gap-8 border-t border-border pt-8 lg:grid-cols-[1.35fr_1fr]"
        style={{ animationDelay: "230ms" }}
      >
        <p className="t-body-lg text-ink-2">{t(HERO.body)}</p>
        <ul className="flex flex-col justify-center gap-3">
          {HERO.trust.map((line) => (
            <li key={line.en} className="flex items-start gap-3">
              <Check className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden />
              <span className="text-[15px] text-ink-2">{t(line)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
