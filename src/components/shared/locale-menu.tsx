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
}: {
  className?: string;
  /**
   * `sm` is for chrome that sits beside a primary action — the site nav,
   * where a full 44px control competes with the button it is next to.
   * Entry surfaces keep the default size: there the language switch is
   * the first thing some people need, not an afterthought.
   */
  size?: "default" | "sm";
}) {
  const { locale, setLocale } = useLocale();
  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  const small = size === "sm";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center rounded-sm border border-border-strong bg-surface font-semibold text-ink-2 transition-colors hover:border-brand hover:text-ink",
          small
            ? "h-9 gap-1.5 px-2.5 text-[13px]"
            : "min-h-[var(--row-h)] gap-2 px-3 text-base",
          className
        )}
      >
        <Globe className={small ? "size-4" : "size-5"} />
        <span className="lang-label">{active.native}</span>
        <ChevronDown className={small ? "size-3.5" : "size-4"} />
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
