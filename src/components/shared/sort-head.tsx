import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/domain/sorting";

/**
 * A column header that sorts, as a link rather than a button.
 *
 * The sort lives in the query string, like the search and the filters
 * beside it, so all three compose: a sorted, filtered queue is one URL a
 * reviewer can send to whoever should be working it, and the back button
 * undoes a sort the way it undoes everything else. A button would need
 * client state, would ship JavaScript to every header cell, and would
 * lose the ordering on the next navigation.
 *
 * Clicking the active column flips its direction; clicking a different
 * one starts that column at `asc`. Starting a new column at ascending is
 * the convention every table on the web has trained people to expect,
 * and it is the right default even for dates — "oldest first" is what a
 * queue is worked in.
 */
export function SortHead({
  label,
  column,
  sort,
  dir,
  basePath,
  params,
  className,
}: {
  label: string;
  /** The `sort` value this column writes. */
  column: string;
  /** The column currently sorted on. */
  sort: string;
  dir: SortDir;
  basePath: string;
  /** Everything already in the query string, so a sort keeps the filters. */
  params: Record<string, string | undefined>;
  className?: string;
}) {
  const active = sort === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";

  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "sort" && key !== "dir") next.set(key, value);
  }
  // Re-ordering the list moves every row, so the page number the reader
  // was on no longer points at anything they were looking at. Dropping
  // it lands them at the top of the new order — the same reasoning that
  // makes `TableToolbar` drop it when a filter changes.
  next.delete("page");
  next.set("sort", column);
  next.set("dir", nextDir);

  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <TableHead
      // Announced to a screen reader as the sort state of the column,
      // which is the one thing the arrow conveys visually.
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("p-0", className)}
    >
      <Link
        href={`${basePath}?${next.toString()}`}
        className={cn(
          "flex h-[var(--row-h)] w-full items-center gap-1.5 px-4 transition-colors",
          // The ring turns inward — the first of the two deviations
          // `:focus-visible` in globals.css permits — and this is the
          // one place in the product where it repairs two different
          // failures at once, which is why it is written up here rather
          // than left as a class somebody later reads as cosmetic.
          //
          // The link fills its `TableHead` exactly (`p-0` there, `w-full`
          // and `h-[var(--row-h)]` here), so every edge of the ring lands
          // on a boundary something else owns:
          //
          //   - Top and the outer sides are CLIPPED. The header band is
          //     `sticky top-0` inside `Table`'s `overflow-auto` wrapper,
          //     so at rest its top edge is the wrapper's own top edge and
          //     an outward ring is scrolled-region overflow; the first
          //     and last columns lose their outer side the same way to
          //     the `Panel` `<section>`'s `overflow-hidden`.
          //   - The right edge was not clipped at all, and went missing
          //     just the same. Each `TableHead` is opaque (`bg-surface-2`)
          //     and sticky with `z-10`, so equal-z siblings paint in
          //     document order and the NEXT header's background lands on
          //     top of this one's outward ring. Left survived for the
          //     mirror-image reason: this header paints over the one
          //     before it.
          //
          // Measured on /ops/tenants, /ops/corridors and /ops/kyb, all 15
          // sort headers in both themes: bottom and left painted, top and
          // right painted nothing at all — an L, not a ring. Drawn on the
          // inside, the whole 2px band sits within the header's own box,
          // where no sibling reaches and no ancestor clips: all four edges
          // on all 15, at 15.26:1 light and 4.37:1 dark on the header
          // band, and 11.90 / 3.52 along the bottom, where the band
          // crosses the inset rule under the header.
          "focus-visible:-outline-offset-2",
          active ? "text-ink" : "hover:text-ink"
        )}
      >
        {label}
        {/* The inactive arrows are dimmed rather than hidden: a header
            that only reveals it is sortable on hover is one nobody
            discovers on a touch screen. */}
        <Icon
          className={cn("size-3.5 shrink-0", active ? "text-brand-text" : "text-ink-3/60")}
          aria-hidden
        />
      </Link>
    </TableHead>
  );
}
