"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Panel, PanelBody } from "@/components/shared/panel";
import { TablePager } from "@/components/shared/pagination";
import { PillCell } from "@/components/shared/pill-cell";
import { PAGE_SIZE_OPTIONS } from "@/lib/domain/sorting";
import { rowOffset } from "@/lib/domain/row-number";
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
import {
  buildSortOptions,
  sortOptionValue,
  type ColumnSort,
} from "@/lib/domain/sort-options";
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
  /** Stable id. Also the `?sort=` value when the column sorts. */
  id: string;
  label: string;
  /**
   * Offers this column in the table's sort control, and says what kind
   * of order it is — which decides the options' words ("A–Z", "newest
   * first", "high to low") and which direction leads. See `ColumnSort`.
   *
   * The header itself stays a plain label either way: since the
   * client's review of 17 September, a header is never a control.
   * The page still does the sorting, on its own allow-list.
   */
  sort?: ColumnSort;
  /**
   * `end` right-aligns the column — for an actions cell or a bare
   * number. `center` centres header and cells; a `pill` column is
   * centred without asking.
   */
  align?: "end" | "center";
  /**
   * Makes this a status column: every pill in it is as wide as the
   * widest one it can show, and centred, header included — the client's
   * review of 17 September. `labels` is every label the column can show
   * in the current locale, straight from its label map; `control` says
   * some rows show a `NativeSelect` in the pill's place. See `PillCell`.
   */
  pill?: { labels: readonly string[]; control?: boolean };
  /**
   * A width hint for this column, as a literal Tailwind class —
   * `"w-[22%]"`, `"w-[120px]"`. Written out rather than interpolated
   * because Tailwind scans source for whole class names.
   *
   * A hint, not a rule. The table sizes columns to their content
   * (`table-auto`), so this is the share the column prefers when there
   * is room to honour it, and a column whose content will not shrink
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
   */
  width?: string;
  className?: string;
  /**
   * Makes this a column of unbounded text that truncates, and says how
   * narrow it may go — a literal Tailwind class, `"min-w-[9rem]"`.
   *
   * Why a floor rather than the ceiling it replaced on 2026-09-17: the
   * client asked for tables that fit a 1280px laptop without scrolling
   * sideways, and a truncating column is the only kind that can give
   * width back. `truncate` alone gives none: it is `white-space:
   * nowrap`, so the column's minimum width is the whole unbroken string
   * — one enquiry whose address carried an invitation token took the
   * Who column to 624px. The ceiling that fixed that (`max-w-[260px]`)
   * still made 260px the column's minimum, and five such minimums plus
   * a row of buttons is wider than a laptop.
   *
   * `DataTable` wraps the cell's content in a block with `contain:
   * inline-size`, which makes the content contribute nothing to the
   * column's intrinsic width, and puts this floor on it — so the column
   * asks for exactly the floor, takes whatever share of the spare width
   * the table hands it, and the text inside truncates against that.
   * On a block inside the cell rather than on the cell because
   * `min-width`/`max-width` on a `td` are undefined in CSS 2.1 auto
   * table layout and Firefox ignores them there (Bugzilla 823483).
   *
   * The content still has to truncate itself (`block truncate`) and
   * carry a `title`, so the whole string is a hover away.
   */
  floor?: string;
  /** Hides the header text from sight but keeps it for a screen reader. */
  labelHidden?: boolean;
  cell: (row: T) => ReactNode;
};

function alignClass(column: { align?: "end" | "center"; pill?: unknown }) {
  if (column.align === "end") return "text-end";
  if (column.align === "center" || column.pill) return "text-center";
  return undefined;
}

/**
 * Every console table, as one component.
 *
 * What it owns is the chrome that was copied six times: the panel and its
 * header, the search, filter and sort controls, the column headers, the
 * two different empty states, and the pager. What each caller still owns
 * is its columns — the only part that was ever actually different.
 *
 * One band above the rows. Until 2026-09-09 the heading, the search and
 * the paging controls each had a full-width row; then two, a header with
 * the search and a second band with the row count, a rows-per-page
 * select and "Page 1 of 5". The client's review of 17 September asked
 * for one, taking Gmail's as the model: the title at the start, the
 * filters and sort beside it, the search in the middle, and the pager
 * — "1–25 of 104" with its arrows — at the far end. The row count went
 * with the second band, at the client's word: the `#` column already
 * counts the rows, and the pager's range says how many there are.
 *
 * Below `lg` there is not room for one row, so the search takes a line
 * of its own under the title and pager rather than squeezing them.
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
  basePath = "",
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
  /**
   * Panel heading. Names the sheet, and does not move when a filter
   * does — a search that renamed the panel took the table's own name off
   * the screen.
   */
  label: string;
  /** The page's own address, for the "clear the filters" way out. */
  basePath?: string;
  /** The order the page sorted the rows in — what the sort control shows. */
  sort?: string;
  dir?: SortDir;
  /**
   * `searchParam` and `pageParam` for a table that shares its page with
   * another — see `TableToolbar`. Both default to `q` and `page`.
   */
  toolbar?: {
    placeholder: string;
    filters: ToolbarFilter[];
    searchParam?: string;
    pageParam?: string;
  };
  pagination?: { page: number; pageCount: number; size: number };
  locale: Locale;
  /** Rows after filtering, across every page. */
  total: number;
  /** Rows before any filter — what tells an empty table from an empty search. */
  unfilteredTotal: number;
  /** Shown when the table holds nothing at all. */
  empty: ReactNode;
  /**
   * One control in the header, just before the pager.
   *
   * For the action that makes a row in *this* table and nothing else —
   * `/ops/staff`'s "Invite a colleague", which sat in the console bar
   * until 2026-09-08 and named a thing three screens away from the list
   * it fills. A page-wide export or a filter would not belong here.
   */
  action?: ReactNode;
  /**
   * A note under the table.
   *
   * For a fact about the rows that are *not* here — the ops dashboard
   * counts its dormant clients rather than listing them, and that
   * sentence has to sit inside the panel or it reads as a caption
   * belonging to whatever comes next on the page. Not a place for
   * controls: the pager is in the header.
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

  // The pager earns its place when it has something to do: another page
  // to go to, or a rows-per-page choice that would change what is shown.
  // At or under the smallest page size every choice shows the same rows,
  // and a single page has nowhere to go — then the rows on screen are
  // the whole answer and the header carries no pager at all.
  const showPager =
    Boolean(pagination) &&
    !isEmpty &&
    !isNoMatch &&
    ((pagination?.pageCount ?? 0) > 1 || total > PAGE_SIZE_OPTIONS[0]);

  const sortOptions = buildSortOptions(columns, locale);
  const toolbarSort =
    sortOptions.length > 0
      ? {
          value: sortOptionValue(sort, dir),
          options: sortOptions,
          label: ADMIN_CONSOLE.sortLabel[locale],
        }
      : undefined;

  return (
    <Panel className={className}>
      {/* `PanelHeader`'s anatomy — same height, padding and rule — laid
          out as one row of its own, because `PanelHeader` holds a label
          and one datum and this holds up to four groups. */}
      <div className="flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-5 py-3 sm:px-6">
        <h2 className="t-title order-0">{label}</h2>
        {toolbar && showToolbar && (
          <TableToolbar
            placeholder={toolbar.placeholder}
            filters={toolbar.filters}
            sort={toolbarSort}
            searchParam={toolbar.searchParam}
            pageParam={toolbar.pageParam}
          />
        )}
        {(action || (pagination && showPager)) && (
          <div
            className={cn(
              // Pushed to the end. From `md` the search's own auto
              // margins do that and centre the search, so this one
              // steps aside rather than taking a third share of the
              // space and pulling the search off-centre.
              "order-3 ms-auto flex items-center gap-3",
              showToolbar && "md:ms-0"
            )}
          >
            {action}
            {pagination && showPager && (
              <TablePager
                page={pagination.page}
                pageCount={pagination.pageCount}
                size={pagination.size}
                total={total}
                locale={locale}
              />
            )}
          </div>
        )}
      </div>

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
              {columns.map((c) => (
                <TableHead
                  key={c.id}
                  // Which column the rows are in order of, for a screen
                  // reader. Nothing for an eye: a header is a label, one
                  // colour and one weight, and the order is named in the
                  // sort control above.
                  aria-sort={
                    c.sort && sort === c.id
                      ? dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(c.width, alignClass(c), c.className)}
                >
                  {/* An actions column has a header for a screen reader
                      and nothing for an eye — the buttons name
                      themselves. */}
                  {c.labelHidden ? <span className="sr-only">{c.label}</span> : c.label}
                </TableHead>
              ))}
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
                    className={cn(c.width, alignClass(c), c.className)}
                  >
                    {c.floor ? (
                      <div className={cn("[contain:inline-size]", c.floor)}>
                        {c.cell(row)}
                      </div>
                    ) : c.pill ? (
                      <PillCell labels={c.pill.labels} control={c.pill.control}>
                        {c.cell(row)}
                      </PillCell>
                    ) : (
                      c.cell(row)
                    )}
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
