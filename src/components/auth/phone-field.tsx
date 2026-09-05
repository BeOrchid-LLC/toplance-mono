"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  applyMask,
  countryBy,
  searchCountries,
  type Country,
} from "@/lib/domain/countries";
import { cn } from "@/lib/utils";

/**
 * The anatomy of react-phone-input-2 — flag button inside a single
 * bordered control, searchable country list, dial code shown in the
 * field, per-country auto-formatting — rebuilt on our own primitives so
 * it inherits the 52px control height, 12px radius and brand focus ring
 * instead of fighting a third-party stylesheet.
 *
 * We chose not to take the dependency: react-phone-input-2 has had no
 * release since v2.15.1 in July 2022. The UI it renders is the one we
 * want; the maintenance risk was not worth importing.
 */
export function PhoneField({
  name = "phone",
  countryName = "country_iso",
  defaultCountry = "ng",
  defaultDigits = "",
  label = "Mobile number",
  hint,
}: {
  name?: string;
  countryName?: string;
  defaultCountry?: string;
  /** National digits only — the dial code comes from the country. */
  defaultDigits?: string;
  label?: string;
  hint?: string;
}) {
  const [iso, setIso] = React.useState(defaultCountry);
  const [digits, setDigits] = React.useState(defaultDigits);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const country = countryBy(iso);
  const results = searchCountries(query);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(c: Country) {
    setIso(c.iso);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${name}-input`}>{label}</Label>

      <div ref={wrapRef} className="relative">
        <div className="flex h-[var(--control-h)] items-stretch overflow-hidden rounded-md border border-border-strong bg-surface focus-within:border-brand focus-within:ring-[3px] focus-within:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`Country code: ${country.name} ${country.dial}`}
            className="flex shrink-0 items-center gap-1 border-e border-border px-3 text-xl transition-colors hover:bg-surface-2"
          >
            <span aria-hidden>{country.flag}</span>
            <ChevronDown className="size-4 text-ink-3" />
          </button>

          <input
            id={`${name}-input`}
            inputMode="tel"
            autoComplete="tel"
            className="min-w-0 flex-1 bg-transparent px-4 text-base text-ink outline-none placeholder:text-ink-3"
            value={digits ? `${country.dial} ${applyMask(digits, country.mask)}` : country.dial}
            onChange={(e) => {
              const dial = country.dial.replace(/\D/g, "");
              let raw = e.target.value.replace(/\D/g, "");
              if (raw.startsWith(dial)) raw = raw.slice(dial.length);
              setDigits(raw);
            }}
          />
        </div>

        {/* Submitted values: the raw national digits plus the country. */}
        <input type="hidden" name={name} value={digits} />
        <input type="hidden" name={countryName} value={iso} />

        {open && (
          <div className="absolute start-0 end-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-md border border-border bg-surface shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-5 shrink-0 text-ink-3" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries"
                className="h-[var(--row-h)] w-full bg-transparent text-base outline-none placeholder:text-ink-3"
              />
            </div>
            <div role="listbox" className="max-h-64 overflow-y-auto p-2">
              {results.some((c) => c.preferred) && !query && (
                <p className="special-caps px-3 py-2">Common here</p>
              )}
              {results.map((c, i) => (
                <React.Fragment key={c.iso}>
                  {!query &&
                    i > 0 &&
                    results[i - 1].preferred &&
                    !c.preferred && (
                      <p className="special-caps px-3 py-2">All countries</p>
                    )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.iso === iso}
                    onClick={() => pick(c)}
                    className={cn(
                      "flex min-h-[var(--row-h)] w-full items-center gap-3 rounded-sm px-3 text-start text-base transition-colors hover:bg-surface-2",
                      c.iso === iso && "font-semibold text-brand-text"
                    )}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {c.flag}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="special font-mono">{c.dial}</span>
                  </button>
                </React.Fragment>
              ))}
              {results.length === 0 && (
                <p className="t-muted px-3 py-4">No country matches “{query}”.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {hint && <p className="t-muted text-[16px]">{hint}</p>}
    </div>
  );
}
