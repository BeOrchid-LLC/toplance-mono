"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/domain/sorting";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * How many rows a page shows, held in the URL beside the page number.
 *
 * The one client component in the pager. The arrows are links because a
 * link is all they need; a `<select>` cannot be, so this much has to
 * hydrate — and only this much. It writes the same way `TableToolbar`
 * does, so the two compose rather than clobbering each other.
 *
 * A native select behind a styled face, matching the toolbar's filters:
 * on a phone this opens the system picker, in the reader's own language.
 */
export function PageSizeSelect({
  size,
  locale,
  className,
}: {
  size: number;
  locale: Locale;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function choose(value: string) {
    const next = new URLSearchParams(params.toString());

    // The default is the absence of the parameter, so the plain URL and
    // the explicitly-25 URL are the same URL rather than two that render
    // identically and bookmark differently.
    if (Number(value) === PAGE_SIZE) next.delete("size");
    else next.set("size", value);

    // Back to the first page. Page 7 of 10-row pages is somewhere else
    // entirely once the rows are 50 deep, and `resolvePage` would clamp
    // it to a page the reader did not ask for. Starting over is the
    // honest answer to "show me more at a time".
    next.delete("page");

    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="t-muted whitespace-nowrap">
        {ADMIN_CONSOLE.rowsPerPage[locale]}
      </span>
      <div className="relative">
        <select
          value={String(size)}
          onChange={(e) => choose(e.target.value)}
          aria-label={ADMIN_CONSOLE.rowsPerPage[locale]}
          className="h-9 appearance-none rounded-[var(--radius-sm)] border border-border-strong bg-surface ps-3 pe-8 text-base font-semibold text-ink"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
      </div>
    </div>
  );
}
