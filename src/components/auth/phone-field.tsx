"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";

import { Label } from "@/components/ui/label";
import { useT } from "@/components/locale-provider";
import {
  applyMask,
  countryBy,
  searchCountries,
  type Country,
} from "@/lib/domain/countries";
import { nationalDigits, phoneProblem } from "@/lib/domain/phone";
import { PHONE_FIELD } from "@/lib/i18n/phone-field";
import { cn } from "@/lib/utils";

/**
 * The anatomy of react-phone-input-2 — flag button inside a single
 * bordered control, searchable country list, dial code shown in the
 * field, per-country auto-formatting — rebuilt on our own primitives so
 * it inherits the 52px control height, 12px radius and the one focus
 * ring instead of fighting a third-party stylesheet.
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
  label,
  hint,
  required = false,
}: {
  name?: string;
  countryName?: string;
  defaultCountry?: string;
  /** National digits only — the dial code comes from the country. */
  defaultDigits?: string;
  label?: string;
  hint?: string;
  /**
   * Whether a blank field is a fault. Off by default: sign-up sends the
   * phone only when there is one, so the field is genuinely optional
   * there and must not block the form.
   */
  required?: boolean;
}) {
  const t = useT();
  const [iso, setIso] = React.useState(defaultCountry);
  const [digits, setDigits] = React.useState(defaultDigits);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  // Nothing is wrong with a field nobody has finished with yet. The
  // message waits for blur (or a submit attempt) so it does not accuse
  // somebody of a short number while they are still typing it.
  const [touched, setTouched] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const country = countryBy(iso);
  const results = searchCountries(query);
  const resolvedLabel = label ?? t(PHONE_FIELD.defaultLabel);

  // The fault as a fact from the domain rule, then as a sentence in the
  // reader's own language — `phoneProblem` deliberately returns neither.
  // What actually gets submitted. `digits` is whatever is on screen and
  // may still carry a trunk zero or a pasted dial code, because it is
  // only tidied on blur — and Enter submits a form without ever firing
  // one. Normalising here means the hidden input cannot disagree with
  // what `phoneProblem` just judged, whichever way the form was sent.
  const submitted = nationalDigits(iso, digits);
  const problem = phoneProblem(iso, digits, { required });
  const message =
    problem === null
      ? null
      : problem.kind === "required"
        ? t(PHONE_FIELD.numberRequired)
        : t(PHONE_FIELD.wrongLengthTemplate)
            .replace("{country}", problem.country)
            .replace("{expected}", String(problem.expected))
            .replace("{actual}", String(problem.actual));
  const errorId = `${name}-error`;

  // The browser's own validity, so a bad number stops the form the same
  // way a missing required field does — including when somebody skips
  // the field entirely and submits, which no blur handler would catch.
  React.useEffect(() => {
    inputRef.current?.setCustomValidity(message ?? "");
  }, [message]);

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
      <Label htmlFor={`${name}-input`}>{resolvedLabel}</Label>

      <div ref={wrapRef} className="relative">
        {/* The shell takes the ring, which is the second permitted
            deviation on `:focus-visible` in globals.css. Both children sit
            flush inside this `overflow-hidden` box — the country button
            against three of its edges, the number field against the other
            three — so an outline on either is clipped away entirely rather
            than merely cropped. `has-[:focus-visible]` and not
            `focus-within`, so it answers to the same rule as every other
            ring rather than also firing on a mouse click. */}
        <div className="flex h-[var(--control-h)] items-stretch overflow-hidden rounded-md border border-border-strong bg-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={t(PHONE_FIELD.countryCodeAriaLabel)
              .replace("{name}", country.name)
              .replace("{dial}", country.dial)}
            // Suppressed for the same reason as the number field beside
            // it, and found the same way — in a browser rather than by
            // reading. Three of this button's edges are the shell's, so
            // an outward ring on those is clipped; the fourth is
            // interior, so the same ring paints a stray 2px bar down the
            // middle of the control. The shell rings for both children.
            className="flex shrink-0 items-center gap-1 border-e border-border px-3 text-xl outline-none transition-colors hover:bg-surface-2"
          >
            <span aria-hidden>{country.flag}</span>
            <ChevronDown className="size-4 text-ink-3" />
          </button>

          <input
            ref={inputRef}
            id={`${name}-input`}
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={touched && message ? true : undefined}
            aria-describedby={touched && message ? errorId : undefined}
            // Suppressed because the shell above draws this field's ring;
            // an outline here would be eaten by the shell's clip.
            className="min-w-0 flex-1 bg-transparent px-4 text-base text-ink outline-none placeholder:text-ink-3"
            value={digits ? `${country.dial} ${applyMask(digits, country.mask)}` : country.dial}
            onChange={(e) => {
              const dial = country.dial.replace(/\D/g, "");
              let raw = e.target.value.replace(/\D/g, "");
              if (raw.startsWith(dial)) raw = raw.slice(dial.length);
              setDigits(raw);
            }}
            // Normalising here rather than on every keystroke. A trunk
            // zero stripped as it is typed disappears under the cursor,
            // which reads as the field eating input; stripped on the way
            // out, the number simply settles into its stored form.
            onBlur={() => {
              setDigits((current) => nationalDigits(iso, current));
              setTouched(true);
            }}
          />
        </div>

        {/* Submitted values: the canonical national digits plus the
            country — never the raw field state. */}
        <input type="hidden" name={name} value={submitted} />
        <input type="hidden" name={countryName} value={iso} />

        {open && (
          <div className="absolute start-0 end-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-md border border-border bg-surface shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-5 shrink-0 text-ink-3" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(PHONE_FIELD.searchPlaceholder)}
                // The country search sits flush against the top edge of an
                // `overflow-hidden` panel, so its ring turns inward — the
                // first permitted deviation on `:focus-visible`, same
                // colour and width, drawn 2px inside instead of 2px out.
                className="h-[var(--row-h)] w-full bg-transparent text-base -outline-offset-2 placeholder:text-ink-3"
              />
            </div>
            <div role="listbox" className="max-h-64 overflow-y-auto p-2">
              {results.some((c) => c.preferred) && !query && (
                <p className="special-caps px-3 py-2">{t(PHONE_FIELD.commonHere)}</p>
              )}
              {results.map((c, i) => (
                <React.Fragment key={c.iso}>
                  {!query &&
                    i > 0 &&
                    results[i - 1].preferred &&
                    !c.preferred && (
                      <p className="special-caps px-3 py-2">{t(PHONE_FIELD.allCountries)}</p>
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
                <p className="t-muted px-3 py-4">
                  {t(PHONE_FIELD.noMatchTemplate).replace("{query}", query)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* The fault replaces the hint rather than stacking under it: two
          lines of guidance under one field, one of which is now wrong,
          is how a form starts arguing with itself. */}
      {touched && message ? (
        <p id={errorId} role="alert" className="t-muted text-[16px] text-danger-ink">
          {message}
        </p>
      ) : (
        hint && <p className="t-muted text-[16px]">{hint}</p>
      )}
    </div>
  );
}
