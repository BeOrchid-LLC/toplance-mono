import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[96px] w-full rounded-md border border-border-strong bg-surface p-4 text-base text-ink transition-[border-color,box-shadow] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
        // As `Input`: the base outline draws it, and the `--brand` border
        // and wash that stood here are gone rather than recoloured. See
        // `:focus-visible` in globals.css.
        "placeholder:text-ink-3",
        "aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
