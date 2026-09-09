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
        "aria-invalid:border-danger aria-invalid:ring-[color-mix(in_srgb,var(--danger)_22%,transparent)]",
        "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3",
        "file:h-full file:border-0 file:bg-transparent file:text-base file:font-medium",
        className
      )}
      {...props}
    />
  );
}

export { Input };
