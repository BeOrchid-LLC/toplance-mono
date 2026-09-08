import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Controls are 52px by system rule; `sm` drops to the 44px row height.
 *
 * `bar` is the one size that goes below 44px, and only where a pointer
 * is the input: it matches the 36px chrome in the console's working bar
 * from `md` up, and stays at the 44px minimum tap target below that.
 * See the size itself for why the exception is drawn there.
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
        /**
         * The console's working bar, and nothing else.
         *
         * That bar is a row of 36px chrome — the rail toggle, the search
         * field, the table filters, the theme-and-language cluster — and
         * a 52px call to action standing in it did not read as emphasis
         * so much as a misalignment: four controls on one baseline
         * and a fifth overhanging them at both ends. Client's call,
         * 2026-09-08.
         *
         * 36px is under the 44px tap minimum the comment above states,
         * so it applies from `md` only, and below `md` this button is
         * the taller of the two things it stands next to.
         *
         * That *is* a compromise, and it is worth naming rather than
         * explaining away. What thins out below `md` is `SettingsCluster`
         * (`max-md:hidden` in `AdminShell`) and `RailToggle` (`lg:` and
         * up), but `NotificationsMenu` does not: it is `size-9` — 36px —
         * at every width, in this same header row, immediately beside
         * these buttons on `/ops/staff` and `/ops/tenants`. So the
         * alignment this size exists to fix is not absent below `md`,
         * it is outranked. A row of chrome that looks a little uneven
         * costs a phone user a glance; a 36px primary action costs them
         * the tap. The tap wins.
         *
         * The icon steps down with it. A 20px glyph in a 36px button
         * leaves 8px of air and reads as an icon that outgrew its
         * container.
         *
         * The corner steps down too, and for the same reason the height
         * did: `--radius-sm` is what every other control in that bar is
         * cut to — the cluster, the rail toggle, the search field, the
         * filters — so the system default of `--radius-md` left one
         * button in the row rounder than its neighbours. Radius reads as
         * a family resemblance, and 14px beside 10px reads as two
         * families. Overrides the base `rounded-md` through `twMerge`.
         */
        bar: "h-[var(--row-h)] rounded-[var(--radius-sm)] px-4 md:h-9 md:px-3.5 md:text-[13px] md:[&_svg:not([class*='size-'])]:size-4",
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
