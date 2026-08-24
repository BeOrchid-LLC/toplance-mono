"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CORRIDORS_LIVE,
  CORRIDORS_SOON,
  ORIGINS,
  isCorridorLive,
  iso3,
} from "@/lib/domain/corridors";
import { useCorridor } from "@/components/site/corridor-state";

/**
 * The corridor list was a wall of pills, which is the one shape that hides
 * what the list is actually for: a corridor is directional, and a pill
 * reading "Canada" says nothing about whose passport is going there.
 *
 * A board says it in one line — `NGA → CAN`, live or not — and picking a
 * row is the same act as picking a destination in the hero, because it is
 * the same state.
 */
export function CorridorBoard() {
  const { origin, destination, purpose, set } = useCorridor();

  // Every destination we offer, each labelled by whether *this* corridor
  // is live — the passport and the purpose included. The board used to
  // split the list into two fixed halves, which made "Live" a property
  // of the country: true for a Nigerian going to Canada to study, and
  // the same green word for a Ghanaian going there on holiday, which we
  // cannot build at all.
  const rows = [...CORRIDORS_LIVE, ...CORRIDORS_SOON].map((c) => ({
    ...c,
    soon: !isCorridorLive(origin, c.name, purpose),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="tag">Travelling from</span>
        <div className="relative inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-border-strong bg-surface py-2 pl-4 pr-3 transition-colors hover:border-brand has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-brand">
          <span className="d-sm text-ink">{origin}</span>
          <ChevronDown className="size-4 text-ink-3" aria-hidden />
          <select
            aria-label="Travelling from"
            value={origin}
            onChange={(e) => set({ origin: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0 outline-none"
          >
            {ORIGINS.map((o) => (
              <option key={o.name} value={o.name}>
                {o.flag}  {o.name}
              </option>
            ))}
          </select>
        </div>
        {/* The status column now depends on the purpose as well as the
            passport, so the purpose has to be readable here — otherwise
            a row flips between Live and In build for no visible reason. */}
        <span className="tag">for {purpose.toLowerCase()}</span>
      </div>

      <div className="mt-6 border-b border-border">
        <div className="grid grid-cols-[3px_auto_1fr_auto] items-center gap-x-4 border-b border-border-strong pb-2">
          <span />
          <span className="tag">Corridor</span>
          <span className="tag">Destination</span>
          <span className="tag text-right">Status</span>
        </div>

        {rows.map((row) => {
          const selected = row.name === destination;
          return (
            <button
              key={row.name}
              type="button"
              onClick={() => set({ destination: row.name })}
              aria-pressed={selected}
              className={cn(
                "grid w-full grid-cols-[3px_auto_1fr_auto] items-center gap-x-4 border-t border-border py-3.5 text-left transition-colors first:border-t-0",
                selected
                  ? "bg-[color-mix(in_srgb,var(--brand)_6%,transparent)]"
                  : "hover:bg-surface-2"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "self-stretch rounded-[var(--radius-pill)]",
                  selected ? "bg-brand" : "bg-transparent"
                )}
              />
              <span
                className={cn(
                  "num text-[13px] font-semibold whitespace-nowrap",
                  row.soon ? "text-ink-3" : "text-brand-text"
                )}
              >
                {iso3(origin)} → {iso3(row.name)}
              </span>
              <span
                className={cn(
                  "d-sm flex min-w-0 items-center gap-2.5",
                  row.soon ? "text-ink-2" : "text-ink"
                )}
              >
                <span aria-hidden className="text-lg leading-none">
                  {row.flag}
                </span>
                <span className="truncate">{row.name}</span>
              </span>
              <span
                className={cn(
                  "tag whitespace-nowrap text-right",
                  row.soon ? "text-warning-ink" : "text-brand-text"
                )}
              >
                {row.soon ? "In build" : "Live"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button asChild>
          <Link href="/sign-up">
            Start the {iso3(origin)} → {iso3(destination)} checklist
            <ArrowRight />
          </Link>
        </Button>
        <p className="t-muted max-w-[42ch] text-[15px]">
          Missing a corridor? Ask for it and it enters the build queue with the
          demand attached to it.
        </p>
      </div>
    </div>
  );
}
