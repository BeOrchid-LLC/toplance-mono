import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Status pills. 13px is permitted here because a pill is static
 * metadata, never an interactive control — the one `.special`
 * exemption to the 16px floor.
 *
 * Pills carry a text label at all times; colour reinforces the state
 * rather than encoding it, so no icon is needed to disambiguate.
 *
 * Status → colour mapping is locked:
 *   Not started → outline · In progress → neutral · Submitted → info
 *   Under review → warning · Approved → success · Rejected → danger
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-semibold tracking-[0.02em] [&_svg]:size-4 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-ink-2 border border-border",
        brand:
          "border border-[color-mix(in_srgb,var(--brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand)_12%,var(--mix))] text-brand-text",
        info: "border border-[color-mix(in_srgb,var(--info)_28%,transparent)] bg-[color-mix(in_srgb,var(--info)_13%,var(--mix))] text-info-ink",
        success:
          "border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[color-mix(in_srgb,var(--success)_14%,var(--mix))] text-success-ink",
        warning:
          "border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--warning)_16%,var(--mix))] text-warning-ink",
        danger:
          "border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_13%,var(--mix))] text-danger-ink",
        outline: "border border-border-strong text-ink-2",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
