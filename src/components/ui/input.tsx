import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none transition-[border-color,box-shadow] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
        "placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]",
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
