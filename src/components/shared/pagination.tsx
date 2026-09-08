import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PageSizeSelect } from "@/components/shared/page-size-select";
import { PAGE_SIZE_OPTIONS } from "@/lib/domain/sorting";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { fill } from "@/lib/i18n/fill";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Page controls for a console table, held in the URL like everything
 * else on the toolbar above it.
 *
 * Links rather than buttons, for the reasons `SortHead` is a link: page
 * three of a filtered queue is a URL somebody can send, the back button
 * walks back through the pages, and no JavaScript ships to render an
 * arrow. It also means the whole control is a server component — the
 * page it belongs to already knows the answer, so nothing here needs
 * client state to discover it.
 *
 * Renders nothing at all when there is one page AND too few rows for the
 * size to be worth choosing. The two halves come and go separately, and
 * that matters in one specific way: at 100 rows a page a 99-row table is
 * a single page, so hiding the whole control on `pageCount <= 1` would
 * take the size select away with it and strand the reader at 100 with no
 * way back to 25.
 */
export function Pagination({
  page,
  pageCount,
  total,
  size,
  basePath,
  params,
  locale,
  className,
}: {
  /** The page actually being shown — `resolvePage`'s answer, not the raw URL. */
  page: number;
  pageCount: number;
  /** Rows the table holds after filtering — what decides if a size choice is meaningful. */
  total: number;
  size: number;
  basePath: string;
  /** Everything already in the query string, so paging keeps the filters. */
  params: Record<string, string | undefined>;
  locale: Locale;
  className?: string;
}) {
  const showPages = pageCount > 1;
  // Below the smallest option every choice shows the same rows, so the
  // select would be a control that does nothing.
  const showSize = total > PAGE_SIZE_OPTIONS[0];
  if (!showPages && !showSize) return null;

  const href = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") next.set(key, value);
    }
    // Page one is the absence of the parameter, not `?page=1`. Two URLs
    // for the same view is one of them getting bookmarked and the other
    // getting shared.
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  // The arrows point along the reading direction, so they mirror in
  // Arabic with the rest of the layout rather than staying pinned to a
  // left that means "forward" there.
  const arrow = "size-4 rtl:-scale-x-100";
  const step =
    "inline-flex h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-border-strong px-3 font-semibold";

  return (
    <nav
      aria-label={ADMIN_CONSOLE.pagesLabel[locale]}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      {showSize ? <PageSizeSelect size={size} locale={locale} /> : <span />}

      {showPages && (
        <div className="flex items-center gap-3">
          {/* An end of the range is a disabled span, never a link to
          nowhere: a dead anchor is still focusable and still announced
          as a link a screen reader can follow. */}
          {atStart ? (
            <span
              className={cn(step, "cursor-default text-ink-3/60")}
              aria-disabled
            >
              <ChevronLeft className={arrow} aria-hidden />
              {ADMIN_CONSOLE.previousPage[locale]}
            </span>
          ) : (
            <Link
              href={href(page - 1)}
              className={cn(step, "hover:bg-surface-2")}
            >
              <ChevronLeft className={arrow} aria-hidden />
              {ADMIN_CONSOLE.previousPage[locale]}
            </Link>
          )}

          {/* No `aria-live` here. Paging is a full navigation, so a screen
          reader already announces the new document; a live region would
          make it say the same thing twice. */}
          <p className="t-muted">
            {fill(ADMIN_CONSOLE.pageOfTemplate[locale], {
              page: String(page),
              pages: String(pageCount),
            })}
          </p>

          {atEnd ? (
            <span
              className={cn(step, "cursor-default text-ink-3/60")}
              aria-disabled
            >
              {ADMIN_CONSOLE.nextPage[locale]}
              <ChevronRight className={arrow} aria-hidden />
            </span>
          ) : (
            <Link
              href={href(page + 1)}
              className={cn(step, "hover:bg-surface-2")}
            >
              {ADMIN_CONSOLE.nextPage[locale]}
              <ChevronRight className={arrow} aria-hidden />
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
