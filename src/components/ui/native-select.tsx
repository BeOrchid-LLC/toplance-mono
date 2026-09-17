import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The console's one select: a native `<select>` behind a styled face.
 *
 * Native per guideline §10 — on a phone it opens the system picker, which
 * is faster and already in the reader's own language. Styled because the
 * browser's own chevron and padding differ by engine and did not match
 * anything else on the page.
 *
 * One component because there were three class strings. The table
 * header's filters (`table-toolbar.tsx`) had `ps-3 pe-8`, a drawn chevron
 * and semibold text; the enquiry rows' status and assignee selects had
 * `px-4`, the browser's chevron and regular weight. The client's review
 * of 17 September asked for the row's padding to match the header's
 * twice, and the second time was because the two strings had drifted
 * apart again. Now a row control differs from a header control only in
 * height, which it takes from the row (`h-[var(--row-h)]` through
 * `className`) so it stands level with the buttons beside it.
 *
 * `icon` sits at the start, for a control whose face shows a value
 * rather than its name — the toolbar's sort. The accessible name then
 * has to come from `aria-label`.
 *
 * Form fields are not this: a select a traveller fills in beside inputs
 * takes the form's height and weight (`demo-dialog.tsx`,
 * `profile-fields.tsx`), and matching the table would set it apart from
 * the field above it.
 */
export const nativeSelectClass =
  "h-9 appearance-none rounded-[var(--radius-sm)] border border-border-strong bg-surface ps-3 pe-8 text-base font-semibold text-ink disabled:cursor-not-allowed disabled:text-ink-3";

function NativeSelect({
  className,
  wrapperClassName,
  icon,
  children,
  ...props
}: React.ComponentProps<"select"> & {
  /** On the positioning wrapper — for a width or a margin. */
  wrapperClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div data-slot="native-select" className={cn("relative", wrapperClassName)}>
      {icon && (
        <span
          className="pointer-events-none absolute start-2.5 top-1/2 flex -translate-y-1/2 text-ink-3 [&_svg]:size-4"
          aria-hidden
        >
          {icon}
        </span>
      )}
      <select className={cn(nativeSelectClass, icon && "ps-8", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
    </div>
  );
}

export { NativeSelect };
