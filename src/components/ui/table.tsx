import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Client override, locked: 13px floor inside data tables only. Columns
 * truncate long text with a title attribute rather than wrapping it.
 *
 * The rule used to end "and no horizontal scroll on desktop". It was
 * overridden on 2026-09-12, by the person who set it, because the
 * console had grown a row of controls it cannot honour: `/ops/support`
 * ends in Chat + Assign to me + Mark resolved, which measure 394px
 * together, and the 15% column they were given is 151px at the panel
 * width a 1366px laptop leaves. Nothing about that is a styling choice
 * — 394 does not fit in 151 — so the only question was which way it
 * broke. It broke silently: `td` is `overflow: visible` and the buttons
 * are `shrink-0 whitespace-nowrap`, so instead of clipping or scrolling
 * they painted leftward across the Status and Assignee cells and sat on
 * top of them. Measured at 1180px, 1018px, 900px, 800px and 700px of
 * panel, the overlap was there at every one.
 *
 * So the table now sizes its columns to their content and the wrapper
 * scrolls under it. Content sizing is what does the work: a column is
 * never narrower than what is in it, so the buttons get their width
 * before anything else is shared out, at every viewport measured.
 *
 * The 900px floor is doing less than it looks. Every console table
 * measured wants more than it anyway — `/ops/support` 1015px,
 * `/ops/staff` 1078px, `/ar/ops/enquiries` 1737px — so it binds only on
 * a table whose columns are all truncatable text and could otherwise
 * collapse to nothing. A table that needs a higher floor should pass
 * its own `min-w-[…]`: `twMerge` drops this one.
 *
 * Two things this replaced, worth not reinventing:
 *
 *   - `table-fixed` with percentage columns. It makes text truncate
 *     predictably, which is why it was tried, but a percentage is a
 *     share of whatever is left and a button is a fixed number of
 *     pixels. Under it the action column is squeezed and its contents
 *     overflow, which is the bug above. Content sizing gets the buttons
 *     their width first and shares the rest.
 *   - `@max-[900px]:min-w-[900px]`, a container query. The floor now
 *     applies at every width; `w-full` already wins whenever the panel
 *     is wider than it, so the query was only ever describing what
 *     `min-width` does on its own.
 *
 * The wrapper also caps its height at `--table-max-h` and scrolls the
 * rows inside it. A page of 10 rows was taller than a laptop viewport,
 * so everything the panel puts after the table — its footer, and the
 * next panel on the page — sat below a screen of rows nobody had asked
 * to read. Capping here rather than at each call site means the pager,
 * which sits above the table, stays on screen while the rows move under
 * it. `overflow-auto`, not `overflow-y-auto`: a single scrollable axis
 * promotes the other one out of `visible` anyway, so asking for both is
 * the honest spelling.
 *
 * That scroll box also clips anything painted outside it, which is why
 * `SortHead` draws its focus ring inward. A header sitting at the top of
 * this wrapper has no room outside itself for a 2px ring, so widening
 * the cap or dropping `overflow-auto` here is a change to how the
 * console's 15 sort headers indicate focus — the reasoning, and what was
 * measured, is in `shared/sort-head.tsx`.
 *
 * The scrollbars themselves are painted in `globals.css`, keyed on
 * `data-slot="table-container"`: an overlay scrollbar is invisible
 * until the reader is already scrolling, and a table that scrolls
 * sideways by design needs to say so before it is touched.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="max-h-[var(--table-max-h)] w-full overflow-auto overscroll-contain"
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom border-collapse text-base min-w-[900px]",
          className
        )}
        {...props}
      />
    </div>
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
        "special-caps h-[var(--row-h)] bg-surface-2 px-4 text-start align-middle",
        // Sticks to the top of the scrolling wrapper, so scrolling the
        // rows never leaves a reader guessing which column is which.
        // The rule under the band is an inset shadow rather than a
        // border because `border-collapse: collapse` hands the row
        // border to the `tr`, which scrolls away with its row.
        //
        // `bg-surface-2` has to be opaque for that to work — rows would
        // otherwise read straight through the band as they pass under
        // it — and the opacity has one consequence worth knowing about
        // here. Every header carries the same `z-10`, so they paint in
        // document order and each one's background lands on top of its
        // left-hand neighbour's outward edge. `SortHead` therefore draws
        // its focus ring inside its own box; see the note there before
        // changing this fill or this stacking.
        "sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--border)]",
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
