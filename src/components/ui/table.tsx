import * as React from "react";

import { TableContainer } from "@/components/ui/table-container";
import { cn } from "@/lib/utils";

/**
 * Client override, locked: 13px floor inside data tables only. Columns
 * truncate long text with a title attribute rather than wrapping it.
 *
 * And, since the client's review of 17 September, two more that this
 * wrapper exists to keep: **the page is the only vertical scroller**, and
 * **a table fits its panel on a laptop** — 1280px wide with the rail
 * open — rather than scrolling sideways.
 *
 * History worth not repeating. On 2026-09-12 the "no horizontal scroll"
 * half of the rule was set aside because `/ops/support` ended in three
 * buttons measuring 394px in a column the fixed layout gave 151px, and
 * the buttons painted across their neighbours. The fix then was content
 * sizing plus a sideways-scrolling wrapper, with the wrapper also capped
 * at a max height so a long page of rows scrolled inside the panel. The
 * client rejected both scrolls: the inner one trapped the wheel at the
 * table's end (`overscroll-contain`) and made the header stick to the
 * box rather than the screen, and the sideways one hid columns.
 *
 * What stayed from that change is content sizing (`table-auto`, the
 * default): a column is never narrower than what cannot shrink in it, so
 * buttons still get their width first and never overlap. What changed
 * is what can shrink. A column of unbounded text (`DataColumn.floor`)
 * no longer lends its whole string to the column's width — it declares
 * a floor and truncates against whatever the table gives it — so the
 * table's minimum width is the sum of its floors and its controls,
 * which is what has to fit in 1280px.
 *
 * No `min-w-[720px]` floor below `lg` any more: that floor was a
 * sideways scroll by construction.
 *
 * The wrapper is `TableContainer`, which leaves the box `overflow:
 * visible` — so the header sticks to the page under the console bar —
 * and switches to a sideways scroll only when the table measurably does
 * not fit. That fallback is for a narrow window; on a laptop a table
 * that triggers it is a table whose columns need a diet.
 *
 * The scrollbars themselves are painted in `globals.css`, keyed on
 * `data-slot="table-container"`: an overlay scrollbar is invisible
 * until the reader is already scrolling, and a table that has fallen
 * back to scrolling needs to say so before it is touched.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <TableContainer>
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-base", className)}
        {...props}
      />
    </TableContainer>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors last:border-0 hover:bg-surface-2 data-[state=selected]:bg-[color-mix(in_srgb,var(--warning)_8%,transparent)]",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // Square ends. The rounded corners were right when a table sat
        // loose on the page, and wrong now that every one of them sits
        // inside a `Panel`: the header band stops short of the panel's
        // own edge, leaving a notch of card behind each corner rather
        // than one clean rule across the table.
        // Not `whitespace-nowrap`. A header that cannot wrap sets its
        // column's floor at the width of the whole phrase, and in a
        // console table the widest phrases sit over the narrowest data:
        // "YOUR CASES" held 134px open above a column of single digits,
        // while the route beside it wrapped its country pair across
        // three lines to pay for it. Wrapping is opportunistic — the
        // browser only takes the second line when the column is
        // genuinely too narrow for one — and `--row-h` has room for two
        // lines of caps at this size, so nothing moves on a wide screen.
        // A label that wraps past two lines — a four-word header in a
        // wrapping locale over a narrow column — grows the header row
        // past `--row-h`, which is allowed; the band grows with it.
        "special-caps h-[var(--row-h)] bg-surface-2 px-4 text-start align-middle",
        // Sticks under the console bar as the page scrolls, so a
        // reader deep in the rows keeps the column names. The offset is
        // not a class: it depends on whether `TableContainer` has fallen
        // back to scrolling sideways, where the header has to stick to
        // the box's own top instead — see "the table's scroll fallback"
        // in `globals.css`.
        //
        // The rule under the band is an inset shadow rather than a
        // border because `border-collapse: collapse` hands the row
        // border to the `tr`, which scrolls away with its row.
        // `bg-surface-2` is opaque for the same reason: rows would
        // otherwise read straight through the band as they pass under.
        "sticky z-10 shadow-[inset_0_-1px_0_var(--border)]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-4 align-middle", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
