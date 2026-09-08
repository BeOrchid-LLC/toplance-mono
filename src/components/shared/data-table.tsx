"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Pagination } from "@/components/shared/pagination";
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
  className,
}: {
  /** The current page of rows: already filtered, sorted and sliced. */
  rows: T[];
  rowKey: (row: T) => string;
  columns: DataColumn<T>[];
  /** Panel heading when nothing is filtered. */
  label: string;
  /** Panel heading when something is — usually "Showing 12 of 96". */
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
  className?: string;
}) {
  const isEmpty = unfilteredTotal === 0;
  // Only a table with a toolbar can have been filtered to nothing. Without
  // one there is no filter to have emptied it, so a zero count means the
  // rows simply are not there — and offering "clear the filters" to
  // somebody who set none sends them looking for a control that is not on
  // the screen.
  const isNoMatch = Boolean(toolbar) && !isEmpty && total === 0;

  return (
    <Panel className={className}>
      <PanelHeader
        label={filteredLabel ?? label}
        aside={
          <Badge variant="outline">
            <span className="num">{count ?? total}</span>{" "}
            {countLabel ?? ADMIN_CONSOLE.rowsWord[locale]}
          </Badge>
        }
      />

      {/* Hidden only when the table holds nothing at all: a search box
          over "nothing yet" offers to narrow an empty set. It stays when
          a filter has just emptied the table — that is the moment the
          reader most needs the control that did it, and the way out
          below. */}
      {toolbar && !isEmpty && (
        <TableToolbar
          placeholder={toolbar.placeholder}
          filters={toolbar.filters}
          className="border-b border-border px-5 py-3 sm:px-6"
        />
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
                    className={c.className}
                  />
                ) : (
                  <TableHead
                    key={c.id}
                    className={cn(c.align === "end" && "text-end", c.className)}
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
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell
                    key={c.id}
                    className={cn(c.align === "end" && "text-end", c.className)}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {pagination && !isEmpty && !isNoMatch && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={total}
          size={pagination.size}
          basePath={basePath}
          params={params}
          locale={locale}
          className="border-t border-border px-5 py-4 sm:px-6"
        />
      )}
    </Panel>
  );
}
