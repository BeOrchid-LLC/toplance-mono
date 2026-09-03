"use client";

import { Globe, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/locale-provider";
import { LOCALES } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * The language control sits before the first field on every entry
 * surface. English is official in Nigeria, but it is a second language
 * for many — switching should never require finding a settings screen.
 */
export function LocaleMenu({
  className,
  size = "default",
  variant = "boxed",
}: {
  className?: string;
  /**
   * `sm` is for chrome that sits beside a primary action — the site nav,
   * where a full 44px control competes with the button it is next to.
   * Entry surfaces keep the default size: there the language switch is
   * the first thing some people need, not an afterthought.
   */
  size?: "default" | "sm";
  /**
   * `bare` is the bars' version, living inside `SettingsCluster`.
   *
   * It drops three pieces of furniture the boxed trigger carries: its
   * own border (the cluster supplies one for both halves), the globe,
   * and the chevron. The globe went because the native name already
   * says "this is a language" — and says which one, which the globe
   * never did. Four pieces of chrome for one setting was the reason
   * this control read as the loudest quiet thing on the bar.
   *
   * Entry surfaces keep `boxed`: standing alone against a form, the
   * trigger has to look like a control without a cluster to sit in.
   */
  variant?: "boxed" | "bare";
}) {
  const { locale, setLocale } = useLocale();
  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  const small = size === "sm";
  const bare = variant === "bare";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Language"
        className={cn(
          "inline-flex items-center transition-colors",
          bare
            ? "nav-label h-9 rounded-r-[var(--radius-sm)] px-3 text-[13px] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
            : "rounded-sm border border-border-strong bg-surface font-semibold text-ink-2 hover:border-brand hover:text-ink",
          !bare && (small ? "h-9 gap-1.5 px-2.5 text-[13px]" : "min-h-[var(--row-h)] gap-2 px-3 text-base"),
          className
        )}
      >
        {!bare && <Globe className={small ? "size-4" : "size-5"} />}
        {bare ? (
          <>
            {/* The full native name wherever it fits, and the code only
                where it does not. Someone who reads Yorùbá more easily
                than English should not have to decode an abbreviation to
                find their own language — so the abbreviation is the
                fallback for a 380px phone, never the default. */}
            <span className="lang-label hidden min-[420px]:inline">
              {active.native}
            </span>
            <span className="min-[420px]:hidden">
              {active.code.toUpperCase()}
            </span>
          </>
        ) : (
          <span className="lang-label">{active.native}</span>
        )}
        {!bare && <ChevronDown className={small ? "size-3.5" : "size-4"} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLocale(l.code)}
            className={cn(
              "justify-between",
              l.code === locale && "font-semibold text-brand-text"
            )}
          >
            {l.label}
            {l.native !== l.label && (
              <span className="text-ink-3">{l.native}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
