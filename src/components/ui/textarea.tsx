import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[96px] w-full rounded-md border border-border-strong bg-surface p-4 text-base text-ink outline-none transition-[border-color,box-shadow] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
        "placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]",
        "aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
