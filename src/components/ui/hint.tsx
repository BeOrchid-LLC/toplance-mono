"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";

/**
 * A small info mark that explains the thing beside it.
 *
 * A popover rather than `title=""`: the native tooltip does not open on
 * keyboard focus, does not appear on touch at all, and cannot be styled
 * — three ways of not being read by the people most likely to need it.
 *
 * It opens on hover *and* on focus, and the same sentence is also the
 * trigger's accessible name, so a screen reader gets it without having
 * to open anything. The trigger is a real button for the same reason.
 *
 * Only for a fact that is genuinely secondary. Anything a traveller
 * needs in order to act belongs on the screen — a product that hides
 * its explanations behind icons is a product that has decided nobody
 * reads them.
 */
export function Hint({ label }: { label: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        // The three outline classes that stood here restated the base
        // rule's width and offset exactly and then repainted its colour
        // from `--ring` to `--brand` — the one call site in the product
        // that kept the base outline and still managed to break it, at
        // 2.078:1 on a dark plate. Restating a rule in order to change one
        // declaration of it is how a system ends up with two; the rule is
        // right, so this trigger simply lets it draw.
        className="inline-grid size-5 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink-2"
      >
        <Info className="size-4" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          collisionPadding={12}
          // Hover on the panel itself would be a trap on a control
          // whose open state is driven by the trigger's hover.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-w-[34ch] rounded-md border border-border bg-surface px-3 py-2 text-[13px] leading-relaxed text-ink-2 shadow-[var(--shadow-lg)]"
        >
          {label}
          <Popover.Arrow className="fill-[var(--surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
