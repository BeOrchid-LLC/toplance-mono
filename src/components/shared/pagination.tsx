import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
 * The arrows only. The rows-per-page select used to sit at the far end
 * of this same bar, which made one component answer two questions —
 * "where am I in the list" and "how much of it do I want at a time" —
 * and left `DataTable` unable to put either beside the row count. The
 * select is `PageSizeSelect`, and the band the two share is
 * `DataTable`'s. They come and go separately: at 100 rows a page a
 * 99-row table is a single page, so a reader who has to get back to 25
 * still has the select after this returns nothing.
 */
export function Pagination({
  page,
  pageCount,
  basePath,
  params,
  locale,
  className,
}: {
  /** The page actually being shown — `resolvePage`'s answer, not the raw URL. */
  page: number;
  pageCount: number;
  basePath: string;
  /** Everything already in the query string, so paging keeps the filters. */
  params: Record<string, string | undefined>;
  locale: Locale;
  className?: string;
}) {
  if (pageCount <= 1) return null;

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
  // The arrows carry it, at every width. "Previous page" and "Next page"
  // are the two least surprising controls on the screen, and spelling
  // them out cost the band more width than the page number beside them —
  // which is the part a reader actually has to read. The words stay in
  // the markup as `sr-only` rather than becoming an `aria-label`, so
  // nothing changes for a screen reader and "Page 1 of 5" is still what
  // says where the reader is.
  //
  // Square, so the pair reads as one control rather than as two buttons
  // that lost their text.
  const step =
    "inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong font-semibold";

  return (
    <nav
      aria-label={ADMIN_CONSOLE.pagesLabel[locale]}
      className={cn("flex items-center gap-3", className)}
    >
      {/* An end of the range is a disabled span, never a link to
          nowhere: a dead anchor is still focusable and still announced
          as a link a screen reader can follow. */}
      {atStart ? (
        <span className={cn(step, "cursor-default text-ink-3/60")} aria-disabled>
          <ChevronLeft className={arrow} aria-hidden />
          <span className="sr-only">
            {ADMIN_CONSOLE.previousPage[locale]}
          </span>
        </span>
      ) : (
        <Link href={href(page - 1)} className={cn(step, "hover:bg-surface-2")}>
          <ChevronLeft className={arrow} aria-hidden />
          <span className="sr-only">
            {ADMIN_CONSOLE.previousPage[locale]}
          </span>
        </Link>
      )}

      {/* No `aria-live` here. Paging is a full navigation, so a screen
          reader already announces the new document; a live region would
          make it say the same thing twice. */}
      <p className="t-muted whitespace-nowrap">
        {fill(ADMIN_CONSOLE.pageOfTemplate[locale], {
          page: String(page),
          pages: String(pageCount),
        })}
      </p>

      {atEnd ? (
        <span className={cn(step, "cursor-default text-ink-3/60")} aria-disabled>
          <span className="sr-only">
            {ADMIN_CONSOLE.nextPage[locale]}
          </span>
          <ChevronRight className={arrow} aria-hidden />
        </span>
      ) : (
        <Link href={href(page + 1)} className={cn(step, "hover:bg-surface-2")}>
          <span className="sr-only">
            {ADMIN_CONSOLE.nextPage[locale]}
          </span>
          <ChevronRight className={arrow} aria-hidden />
        </Link>
      )}
    </nav>
  );
}
