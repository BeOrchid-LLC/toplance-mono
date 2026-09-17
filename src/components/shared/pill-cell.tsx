import type { ReactNode } from "react";

import { badgeVariants } from "@/components/ui/badge";
import { nativeSelectClass } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

/**
 * A status cell whose pill is as wide as the widest pill its column can
 * show, and centred in it.
 *
 * The client's review of 17 September: pills in one column "must all be
 * of the same width, and centrally aligned". A column of "Live" and
 * "Suspended" at their own widths reads as a ragged edge down the
 * table, and the eye compares the shapes before it reads the words.
 *
 * Measured by the browser, not by us. Every label the column can show is
 * laid invisibly into the same grid cell as the real pill, so the cell
 * is exactly as wide as the widest of them — in this locale, in this
 * font, with no character-count guess about Arabic or Yorùbá — and the
 * real pill stretches to fill it. The copies are `aria-hidden` and
 * `invisible`, so a screen reader reads one status and nothing
 * else, and the copies take no pointer.
 *
 * What stretches is any `Badge` (`data-slot="badge"`) or `NativeSelect`
 * inside: the enquiry queue's status column is a select on most rows and
 * a pill on the converted ones, and the two share one width — pass
 * `control` so the copies are measured in the select's padding and
 * type, which is the wider of the two.
 *
 * One pill per cell is the intended shape. A cell holding two stacks
 * them, each full width, until its column folds them into one status.
 */
export function PillCell({
  labels,
  control = false,
  children,
}: {
  /** Every label this column can show, in the reader's locale. */
  labels: readonly string[];
  /** Size to a `NativeSelect` rather than a badge. */
  control?: boolean;
  children: ReactNode;
}) {
  const sizer = control
    ? cn(nativeSelectClass, "block h-auto whitespace-nowrap")
    : badgeVariants({ variant: "outline" });

  return (
    <span className="inline-grid max-w-full align-middle">
      {labels.map((label, i) => (
        <span
          // By position: two statuses can share a word in some locale.
          key={i}
          aria-hidden
          className={cn(sizer, "invisible col-start-1 row-start-1 w-auto select-none")}
        >
          {label}
        </span>
      ))}
      <span
        className={cn(
          "col-start-1 row-start-1 flex flex-wrap justify-center gap-1.5",
          "[&_[data-slot=badge]]:w-full [&_[data-slot=badge]]:justify-center",
          "[&_[data-slot=native-select]]:w-full [&_select]:w-full"
        )}
      >
        {children}
      </span>
    </span>
  );
}
