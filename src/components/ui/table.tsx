import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Client override, locked: 13px floor inside data tables only, and no
 * horizontal scroll on desktop. Columns set explicit widths and truncate
 * with a title attribute; below 900px the wrapper scrolls, because on a
 * phone that is the honest behaviour.
 *
 * The wrapper also caps its height at `--table-max-h` and scrolls the
 * rows inside it. A page of 10 rows was taller than a laptop viewport,
 * so everything the panel puts after the table — its footer, and the
 * next panel on the page — sat below a screen of rows nobody had asked
 * to read. Capping here rather than at each call site means the pager,
 * which sits above the table, stays on screen while the rows move under
 * it. `overflow-auto`, not `overflow-y-auto`: a single scrollable axis
 * promotes the other one out of `visible` anyway, so asking for both is
 * the honest spelling — and on desktop the columns fit, so no
 * horizontal bar appears.
 *
 * That scroll box also clips anything painted outside it, which is why
 * `SortHead` draws its focus ring inward. A header sitting at the top of
 * this wrapper has no room outside itself for a 2px ring, so widening
 * the cap or dropping `overflow-auto` here is a change to how the
 * console's 15 sort headers indicate focus — the reasoning, and what was
 * measured, is in `shared/sort-head.tsx`.
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
          "w-full caption-bottom border-collapse text-base max-lg:min-w-[720px]",
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
        "special-caps h-[var(--row-h)] whitespace-nowrap bg-surface-2 px-4 text-start align-middle",
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
