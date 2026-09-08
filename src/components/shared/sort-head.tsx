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
