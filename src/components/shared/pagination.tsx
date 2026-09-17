"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pageRange } from "@/lib/domain/row-number";
import { PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/domain/sorting";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { fill } from "@/lib/i18n/fill";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * A console table's pager, the way Gmail draws one: "26–50 of 104"
 * and a pair of arrows, at the right-hand end of the table's header.
 *
 * Asked for by the client on 17 September, replacing a second band of
 * chrome under the header that held a row count, a "Rows per page"
 * select and "Page 2 of 5" between the arrows. The range says what the
 * count and the page number both said, in less room, and the count was
 * already said a third time by the `#` column. The rows-per-page choice
 * moved behind the range itself — a small menu — because it is a choice
 * made once, not a control that needs to stand on the screen.
 *
 * Everything stays in the URL. The arrows are links, so page three of a
 * filtered queue is an address somebody can send and the back button
 * walks back through the pages. They build on the query string the
 * browser actually has, so paging keeps every filter, the search and the
 * sort without the page having to list them; the size menu writes the
 * same `size` parameter the old select did, so existing bookmarks open
 * the view they always did.
 */
export function TablePager({
  page,
  pageCount,
  size,
  total,
  locale,
  className,
}: {
  /** The page actually being shown — `resolvePage`'s answer, not the raw URL. */
  page: number;
  pageCount: number;
  size: number;
  /** Rows after filtering, across every page. */
  total: number;
  locale: Locale;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const href = (target: number) => {
    const next = new URLSearchParams(params.toString());
    // Page one is the absence of the parameter, not `?page=1`. Two URLs
    // for the same view is one of them getting bookmarked and the other
    // getting shared.
    if (target > 1) next.set("page", String(target));
    else next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  function chooseSize(option: number) {
    const next = new URLSearchParams(params.toString());
    // The default is the absence of the parameter, so the plain URL and
    // the explicitly-25 URL are the same URL.
    if (option === PAGE_SIZE) next.delete("size");
    else next.set("size", String(option));
    // Back to the first page. Page 7 of 10-row pages is somewhere else
    // entirely once the rows are 50 deep; starting over is the honest
    // answer to "show me more at a time".
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const { start, end } = pageRange({ page, size }, total);
  const range = fill(ADMIN_CONSOLE.rangeTemplate[locale], { start, end, total });

  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  // The arrows point along the reading direction, so they mirror in
  // Arabic with the rest of the layout.
  const arrow = "size-4 rtl:-scale-x-100";
  const step =
    "inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-ink";

  return (
    <nav
      aria-label={ADMIN_CONSOLE.pagesLabel[locale]}
      className={cn("flex items-center gap-1", className)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            // The visible range leads the name, so a voice user can say
            // what they see; what the button does follows it.
            aria-label={`${range}, ${ADMIN_CONSOLE.rowsPerPage[locale]}`}
            className="num h-9 whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2"
          >
            {range}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuLabel>{ADMIN_CONSOLE.rowsPerPage[locale]}</DropdownMenuLabel>
          {PAGE_SIZE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option}
              onSelect={() => {
                if (option !== size) chooseSize(option);
              }}
              aria-current={option === size ? "true" : undefined}
              className="num"
            >
              <Check
                className={cn("text-brand-text", option !== size && "invisible")}
                aria-hidden
              />
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* An end of the range is a disabled span, never a link to
          nowhere: a dead anchor is still focusable and still announced
          as a link a screen reader can follow. The words stay in the
          markup as `sr-only`; the arrows carry them for an eye. */}
      {atStart ? (
        <span className={cn(step, "cursor-default text-ink-3/60")} aria-disabled>
          <ChevronLeft className={arrow} aria-hidden />
          <span className="sr-only">{ADMIN_CONSOLE.previousPage[locale]}</span>
        </span>
      ) : (
        <Link href={href(page - 1)} className={cn(step, "hover:bg-surface-2")}>
          <ChevronLeft className={arrow} aria-hidden />
          <span className="sr-only">{ADMIN_CONSOLE.previousPage[locale]}</span>
        </Link>
      )}

      {atEnd ? (
        <span className={cn(step, "cursor-default text-ink-3/60")} aria-disabled>
          <ChevronRight className={arrow} aria-hidden />
          <span className="sr-only">{ADMIN_CONSOLE.nextPage[locale]}</span>
        </span>
      ) : (
        <Link href={href(page + 1)} className={cn(step, "hover:bg-surface-2")}>
          <ChevronRight className={arrow} aria-hidden />
          <span className="sr-only">{ADMIN_CONSOLE.nextPage[locale]}</span>
        </Link>
      )}
    </nav>
  );
}
