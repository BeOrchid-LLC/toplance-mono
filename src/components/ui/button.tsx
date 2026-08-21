import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Controls are 52px by system rule; `sm` drops to the 44px row height.
 * Nothing here goes below 44px — that is the minimum tap target.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-semibold outline-none transition-[background,border-color,box-shadow,color] duration-[var(--dur-tap)] ease-[var(--ease-out)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-on-brand hover:bg-[color-mix(in_srgb,var(--brand)_88%,#fff)] active:bg-brand-press active:shadow-[inset_0_2px_4px_rgb(0_0_0/0.18)]",
        secondary:
          "border border-brand bg-transparent text-brand-text hover:bg-[color-mix(in_srgb,var(--brand)_8%,transparent)] active:bg-[color-mix(in_srgb,var(--brand)_16%,var(--surface))]",
        tertiary:
          "bg-transparent text-brand-text hover:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]",
        neutral:
          "border border-border-strong bg-surface text-ink hover:border-brand hover:text-brand-text",
        success: "bg-success text-white hover:brightness-110",
        warning: "bg-warning text-white hover:brightness-110",
        danger: "bg-danger text-white hover:brightness-110",
        ghost: "hover:bg-surface-2 hover:text-ink",
        link: "text-brand-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[var(--control-h)] px-[22px]",
        sm: "h-[var(--row-h)] px-4",
        icon: "size-[var(--row-h)] px-0",
        block: "h-[var(--control-h)] w-full px-[22px]",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
