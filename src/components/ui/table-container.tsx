"use client";

import * as React from "react";

/**
 * The box a table sits in, and the one piece of it that has to measure.
 *
 * It exists because of two requests that pull against each other. The
 * client asked on 17 September for the page to be the only thing that
 * scrolls — a table that scrolled inside a scrolling page trapped the
 * wheel at its own end, and its header stuck to the table rather than
 * to the screen — and for no sideways scroll on a desktop. The header
 * now sticks under the console bar, which only works while nothing
 * between the header and the page is a scroll container: any `overflow`
 * other than `visible`/`clip` on this box makes the header stick to the
 * box instead, and a box that never scrolls vertically holds it still.
 *
 * So the box stays `overflow: visible` whenever the table fits, which on
 * a laptop is every table built to fit. The sideways scroll comes back
 * only when the table is measurably wider than the box — a narrow
 * window, or a table whose unshrinkable controls outgrow its panel —
 * because the alternative there is not "no scroll", it is controls cut
 * off by the panel's rounded clip where nobody can reach them. In that
 * state the header sticks to the top of the box and not the page; that
 * is the price of the fallback, and it is only paid where the fallback
 * is.
 *
 * `data-overflow` is what the stylesheet keys on (`globals.css`, under
 * "the table's scroll fallback"), so the server render and a reader
 * without JavaScript get the page-scrolling layout.
 */
export function TableContainer({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = React.useState(false);

  React.useEffect(() => {
    const box = ref.current;
    const table = box?.querySelector<HTMLTableElement>(":scope > table");
    if (!box || !table) return;

    // The table's own width, not the box's `scrollWidth`: the table is
    // laid out the same whether the box scrolls or not, so the answer
    // cannot flip because of the style it switches — no oscillation.
    // A pixel of slack for subpixel rounding.
    const measure = () => setOverflowing(table.offsetWidth > box.clientWidth + 1);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-slot="table-container"
      data-overflow={overflowing ? "" : undefined}
      className="w-full"
    >
      {children}
    </div>
  );
}
