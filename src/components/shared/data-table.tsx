"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Pagination } from "@/components/shared/pagination";
import { PageSizeSelect } from "@/components/shared/page-size-select";
import { PAGE_SIZE_OPTIONS } from "@/lib/domain/sorting";
import { rowOffset } from "@/lib/domain/row-number";
import { SortHead } from "@/components/shared/sort-head";
import { TableToolbar, type ToolbarFilter } from "@/components/shared/table-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SortDir } from "@/lib/domain/sorting";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * One column: what it is called, whether it orders, and how a row
 * becomes a cell.
 *
 * `cell` is a function, which is what makes this component client-side
 * and not a choice: a function cannot cross the server/client boundary,
 * so the columns array has to be built on the same side that renders it.
 * Every caller therefore hands `DataTable` its rows already filtered,
 * sorted and sliced — the server still does that work, and only the page
 * being looked at is serialised.
 */
export type DataColumn<T> = {
  /** Stable id. Also the `?sort=` value when `sortable`. */
  id: string;
  label: string;
  sortable?: boolean;
  /** Right-aligns the column — for an actions cell or a bare number. */
  align?: "end";
  /**
   * A width hint for this column, as a literal Tailwind class —
   * `"w-[22%]"`, `"w-[120px]"`. Written out rather than interpolated
   * because Tailwind scans source for whole class names.
   *
   * A hint, not a rule. The table sizes columns to their content
   * (`table-auto`), so this is the width the column prefers when there
   * is room to honour it, and a column whose content will not fit
   * takes what it needs regardless. That is deliberate, and it is the
   * difference between this and the `table-fixed` version it replaced
   * on 2026-09-12: under `table-fixed` a 15% actions column was 151px
   * whatever was in it, and the 394px of buttons in `/ops/support`
   * spilled out across its neighbours. See `ui/table.tsx`.
   *
   * So: give the text columns hints, and leave an actions column
   * without one. Percentages need not total 100 and are not checked —
   * they are a statement about relative emphasis, and the browser
   * settles the rest.
   *
   * A column that truncates needs a ceiling as well, in `className` —
   * `"max-w-[260px]"`. `truncate` is `white-space: nowrap` plus
   * `overflow: hidden`, and only the second half of that does anything
   * here: the first half makes the cell's preferred width the whole
   * unbroken string, which is the width the column then asks for. One
   * enquiry whose address carried an invitation token took the Who
   * column to 624px and pushed the table off a 1680px monitor, with
   * `truncate` on it the whole time. The ceiling is the thing it
   * truncates against.
   */
  width?: string;
  className?: string;
  /** Hides the header text from sight but keeps it for a screen reader. */
  labelHidden?: boolean;
  cell: (row: T) => ReactNode;
};

/**
 * Every console table, as one component.
 *
 * What it owns is the chrome that was copied six times: the panel and its
 * header, the "showing N of M" line, the row-count badge, the search and
 * filter row, the column headers with their sort links, the two different
 * empty states, and the pager. What each caller still owns is its columns
 * — the only part that was ever actually different.
 *
 * Two bands above the rows, not four. Until 2026-09-09 the heading, the
 * search, and the paging controls each had a full-width row of their
 * own, so `/ops/dashboard` opened on three stacked rules with one
 * control apiece and a lot of empty space between them — the client
 * said so looking at the agencies table. They are now sorted by what
 * they are for. The header names the sheet and carries what changes
 * *which* rows are in it: the search, the filters, and any action that
 * makes one. The band under it describes the rows that resulted — how
 * many there are, how many to show at a time, and where in them the
 * reader is standing.
 *
 * That band appears only where it has a control to hold. A table showing
 * everything it holds already answers "how many" with its own rows, so
 * its count stays a `Badge` beside the heading rather than gaining a
 * rule and a strip of chrome to repeat what is on screen.
 *
 * The two empty states are not the same message and must not be merged.
 * "Nobody has been invited yet" is a fact about the product; "nothing
 * matches this search" is a fact about the filter the reader just set,
 * and it needs a way out. `DataTable` picks between them from the counts
 * rather than making each caller remember the distinction.
 */
export function DataTable<T>({
  rows,
  rowKey,
  columns,
  numbered = false,
  label,
  filteredLabel,
  countLabel,
  count,
  basePath = "",
  params = {},
  sort = "",
  dir = "asc",
  toolbar,
  pagination,
  locale,
  total,
  unfilteredTotal,
  empty,
  action,
  footer,
  className,
}: {
  /** The current page of rows: already filtered, sorted and sliced. */
  rows: T[];
  rowKey: (row: T) => string;
  columns: DataColumn<T>[];
  /**
   * Count the rows in a leading column.
   *
   * The count is of the whole table, not of the page: row 1 of page 3
   * reads 51. Off by default so a table that is a list of one thing —
   * a plan, a card — does not gain a column of 1.
   */
  numbered?: boolean;
  /** Panel heading. Names the sheet, and does not move when a filter does. */
  label: string;
  /**
   * What the count line says while a filter is on — usually
   * "Showing 12 of 96".
   *
   * It replaced the heading until 2026-09-09, which meant typing in the
   * search box renamed the panel and took the table's own name off the
   * screen. It now replaces the count instead, which is the thing a
   * filter actually changes.
   */
  filteredLabel?: string;
  /** The word after the number in the badge. Defaults to "rows"; "" for a bare number. */
  countLabel?: string;
  /** Badge number, when it is not the row count — a live total that excludes expired rows, say. */
  count?: number;
  /** Only needed by a table that sorts, filters or pages — the URL it writes. */
  basePath?: string;
  params?: Record<string, string | undefined>;
  sort?: string;
  dir?: SortDir;
  toolbar?: { placeholder: string; filters: ToolbarFilter[] };
  pagination?: { page: number; pageCount: number; size: number };
  locale: Locale;
  /** Rows after filtering, across every page. */
  total: number;
  /** Rows before any filter — what tells an empty table from an empty search. */
  unfilteredTotal: number;
  /** Shown when the table holds nothing at all. */
  empty: ReactNode;
  /**
   * One control at the end of the panel header, after the count badge.
   *
   * For the action that makes a row in *this* table and nothing else —
   * `/ops/staff`'s "Invite a colleague", which sat in the console bar
   * until 2026-09-08 and named a thing three screens away from the list
   * it fills. `PanelHeader` calls its right-hand slot one datum about
   * the sheet; a button that adds to the sheet is that, where a page-wide
   * export or a filter would not be.
   */
  action?: ReactNode;
  /**
   * A note under the table, in the band the pager would use.
   *
   * For a fact about the rows that are *not* here — the ops dashboard
   * counts its dormant clients rather than listing them, and that
   * sentence has to sit inside the panel or it reads as a caption
   * belonging to whatever comes next on the page. Not a place for
   * controls: the pager is the row above the table, not below this one.
   */
  footer?: ReactNode;
  className?: string;
}) {
  const offset = rowOffset(pagination);

  const isEmpty = unfilteredTotal === 0;
  // Only a table with a toolbar can have been filtered to nothing. Without
  // one there is no filter to have emptied it, so a zero count means the
  // rows simply are not there — and offering "clear the filters" to
  // somebody who set none sends them looking for a control that is not on
  // the screen.
  const isNoMatch = Boolean(toolbar) && !isEmpty && total === 0;

  // Hidden only when the table holds nothing at all: a search box over
  // "nothing yet" offers to narrow an empty set. It stays when a filter
  // has just emptied the table — that is the moment the reader most
  // needs the control that did it, and the way out below.
  const showToolbar = Boolean(toolbar) && !isEmpty;
  // Below the smallest option every choice shows the same rows, so the
  // select would be a control that does nothing.
  const showSize = Boolean(pagination) && total > PAGE_SIZE_OPTIONS[0];
  // The band earns its rule when it has a control in it. A table that
  // fits on one page at the smallest size has neither pager nor select,
  // and its count goes back to the badge — a whole row for one figure
  // over a list the reader can already see the end of is the chrome
  // this change set out to remove.
  //
  // Above the rows, not below them. The pager sat under the table until
  // 2026-09-08, which on a long page put the only way to page below a
  // screen of header and a screen of rows — far enough down that a
  // reader took the first page for the whole table.
  const showMeta =
    !isEmpty && !isNoMatch && (showSize || (pagination?.pageCount ?? 0) > 1);

  const countLine = filteredLabel ?? (
    <>
      <span className="num">{count ?? total}</span>{" "}
      {countLabel ?? ADMIN_CONSOLE.rowsWord[locale]}
    </>
  );

  return (
    <Panel className={className}>
      <PanelHeader
        label={label}
        // The header holds a 36px-tall field once it carries the search,
        // so its rows need room to breathe when they wrap under `sm`.
        className={showToolbar ? "gap-x-6 gap-y-3 py-3" : undefined}
        aside={
          <div
            className={cn(
              "flex items-center gap-3",
              // A definite width, so the search inside can be `flex-1`
              // and still have something to be a fraction of.
              showToolbar ? "w-full sm:w-auto sm:min-w-[320px] sm:flex-1" : "justify-end"
            )}
          >
            {toolbar && showToolbar && (
              <TableToolbar
                placeholder={toolbar.placeholder}
                filters={toolbar.filters}
                className="min-w-0 flex-1"
              />
            )}
            {/* No paging band to put it in, so the count keeps the slot
                `PanelHeader` calls one datum about the sheet. */}
            {!showMeta && <Badge variant="outline">{countLine}</Badge>}
            {action}
          </div>
        }
      />

      {pagination && showMeta && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <p className="t-muted whitespace-nowrap">{countLine}</p>
            {showSize && <PageSizeSelect size={pagination.size} locale={locale} />}
          </div>
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            basePath={basePath}
            params={params}
            locale={locale}
          />
        </div>
      )}

      {isEmpty ? (
        <PanelBody>{empty}</PanelBody>
      ) : isNoMatch ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">
            {ADMIN_CONSOLE.noMatch[locale]}{" "}
            <Link href={basePath} className="font-semibold text-brand-text hover:underline">
              {ADMIN_CONSOLE.clearFilters[locale]}
            </Link>
          </p>
        </PanelBody>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {numbered && (
                <TableHead className="w-12 text-end">
                  {ADMIN_CONSOLE.ordinalHeading[locale]}
                </TableHead>
              )}
              {columns.map((c) =>
                c.sortable ? (
                  <SortHead
                    key={c.id}
                    label={c.label}
                    column={c.id}
                    sort={sort}
                    dir={dir}
                    basePath={basePath}
                    params={params}
                    className={cn(c.width, c.className)}
                  />
                ) : (
                  <TableHead
                    key={c.id}
                    className={cn(c.width, c.align === "end" && "text-end", c.className)}
                  >
                    {/* An actions column has a header for a screen reader
                        and nothing for an eye — the buttons name
                        themselves. */}
                    {c.labelHidden ? <span className="sr-only">{c.label}</span> : c.label}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={rowKey(row)}>
                {numbered && (
                  <TableCell className="num t-muted text-end">{offset + i + 1}</TableCell>
                )}
                {columns.map((c) => (
                  <TableCell
                    key={c.id}
                    className={cn(c.width, c.align === "end" && "text-end", c.className)}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {footer && (
        <div className="border-t border-border px-5 py-3 sm:px-6">{footer}</div>
      )}

    </Panel>
  );
}
