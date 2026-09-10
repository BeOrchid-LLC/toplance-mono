import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink transition-[border-color,box-shadow] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
        // Focus is the base rule's, not this component's. The pair removed
        // from here recoloured the border to `--brand` and laid a 22%
        // `--brand` wash outside it — 2.078:1 and about 1.2:1 respectively
        // on a dark plate — while `outline-none` switched off the ring
        // that would have been 4.985:1. An input is not inside a clip, so
        // the outline lands with room around it.
        "placeholder:text-ink-3",
        // Border alone, like `Textarea`. The `aria-invalid:ring-…` that
        // stood here set `--tw-ring-color` and nothing else: Tailwind v4
        // composes the ring's box-shadow in the ring-*width* utility,
        // and the only one on this component was the
        // `focus-visible:ring-[3px]` removed above. So the wash painted
        // in no state at all, and giving it a width back would mark
        // every invalid field with a permanent 3px halo the rest of the
        // product does not use.
        "aria-invalid:border-danger",
        "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3",
        "file:h-full file:border-0 file:bg-transparent file:text-base file:font-medium",
        className
      )}
      {...props}
    />
  );
}

export { Input };
