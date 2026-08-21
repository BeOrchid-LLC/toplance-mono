"use client";

import { Globe, ChevronRight } from "lucide-react";

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
export function LocaleMenu({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex min-h-[var(--row-h)] items-center gap-2 rounded-sm border border-border-strong bg-surface px-3 text-base font-semibold text-ink-2 transition-colors hover:border-brand hover:text-ink",
          className
        )}
      >
        <Globe className="size-5" />
        <span className="lang-label">{active.native}</span>
        <ChevronRight className="size-4" />
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
