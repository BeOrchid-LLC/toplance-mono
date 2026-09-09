"use client";

import * as React from "react";

/**
 * The thread's window in the case rail: a fixed height, showing the end
 * of the conversation.
 *
 * Both halves answer the same complaint. The rail sits beside a
 * checklist that runs to a dozen rows, and an uncapped thread grows
 * downwards — so the composer's position depended on how much had
 * already been said, and on a talkative case it was somewhere off the
 * bottom of the screen. A height puts the composer at the same place on
 * every case.
 *
 * Given a height, the window has to show the newest message rather than
 * the oldest. `MessageThread` reads top to bottom for the good reason
 * written on it, which leaves a scroll box parked on the first thing
 * anybody said months ago; a reviewer opening a case is answering the
 * last message, not re-reading the first.
 *
 * The effect keys on `count`, not on the messages: a new message should
 * move the scroll, and nothing else should. Re-pinning on every render
 * would haul the reader back to the bottom while they were reading
 * history — a `router.refresh()` fires on this page every time a
 * document is verified or flagged.
 */
export function ThreadViewport({
  count,
  label,
  children,
}: {
  /** How many messages are rendered inside. */
  count: number;
  /** Names the scroll region, which is focusable and so needs one. */
  label: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    // `scrollTop` rather than `scrollIntoView`: this moves one box, and
    // `scrollIntoView` on a nested scroller also nudges the page behind
    // it. Instant either way — a jump-to-end is not a transition, and
    // an animated one would be a moving target for anybody reading.
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  return (
    <div
      ref={ref}
      // Focusable because it scrolls: a keyboard reader with no way into
      // the box cannot reach the history inside it. `overscroll-contain`
      // stops a wheel at the end of the thread from carrying on into the
      // page and taking the whole panel with it.
      tabIndex={0}
      role="region"
      aria-label={label}
      // One height at every width. The rail widens at `xl`, and a wider
      // column already fits more conversation into the same pixels —
      // growing the window there as well was the change that pushed the
      // desk past the bottom of a laptop screen on the widest layout,
      // which is the one place it had room to spare.
      className="max-h-60 overflow-y-auto overscroll-contain"
    >
      {children}
    </div>
  );
}
