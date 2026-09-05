import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Client override, locked: 13px floor inside data tables only, and no
 * horizontal scroll on desktop. Columns set explicit widths and truncate
 * with a title attribute; below 900px the wrapper scrolls, because on a
 * phone that is the honest behaviour.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="w-full max-lg:overflow-x-auto">
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
        "special-caps h-[var(--row-h)] whitespace-nowrap bg-surface-2 px-4 text-start align-middle first:rounded-s-sm last:rounded-e-sm",
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
