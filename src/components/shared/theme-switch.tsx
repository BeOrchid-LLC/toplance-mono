"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/**
 * Sun/moon sliding switch.
 *
 * The visual state is driven entirely by CSS off the `dark` class that
 * next-themes puts on <html>, not by React state. That avoids the
 * usual mounted-flag effect and, more importantly, means the knob is
 * already in the right place on first paint instead of snapping across
 * after hydration.
 *
 * The knob sits under the active icon, so whichever icon it covers
 * switches to a colour that reads against it.
 *
 * `variant="icon"` is the marketing surface's version: one square button
 * showing the mode you are in, sized and bordered to match the language
 * menu beside it. A 60px sliding track next to a primary call to action
 * reads as a piece of furniture competing with the thing people came to
 * press — in chrome, the switch should be the quietest control there.
 * The product screens keep the track, where there is no CTA to lose to.
 */
export function ThemeSwitch({
  className,
  variant = "track",
}: {
  className?: string;
  variant?: "track" | "icon";
}) {
  const { resolvedTheme, setTheme } = useTheme();

  const shared = {
    type: "button",
    role: "switch",
    // Undefined until next-themes resolves, so the server and client
    // can disagree for one frame on this attribute alone.
    suppressHydrationWarning: true,
    "aria-checked": resolvedTheme === "dark",
    "aria-label": "Dark mode",
    title: "Dark mode",
    onClick: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
  } as const;

  if (variant === "icon") {
    return (
      <button
        {...shared}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-sm border border-border-strong bg-surface text-ink-2 transition-colors duration-[var(--dur-toggle)] ease-[var(--ease-out)] hover:border-brand hover:text-ink",
          className
        )}
      >
        {/* Both icons ship; `dark:` decides. Same reason as the track —
            the correct one is painted before hydration, not after. */}
        <Sun className="size-4 dark:hidden" aria-hidden />
        <Moon className="hidden size-4 dark:block" aria-hidden />
      </button>
    );
  }

  return (
    <button
      {...shared}
      className={cn(
        "inline-flex min-h-[var(--row-h)] shrink-0 items-center justify-center rounded-[var(--radius-pill)] px-1",
        className
      )}
    >
      <span className="relative flex h-8 w-[60px] items-center rounded-[var(--radius-pill)] border border-border-strong bg-surface-2 transition-colors duration-[var(--dur-toggle)] ease-[var(--ease-out)]">
        <span
          aria-hidden
          className="absolute left-0.5 top-0.5 size-[26px] rounded-full bg-surface shadow-[var(--shadow-sm)] transition-transform duration-[var(--dur-toggle)] ease-[var(--ease-out)] dark:translate-x-[28px]"
        />
        <span className="relative z-10 grid flex-1 place-items-center text-warning-ink transition-colors duration-[var(--dur-toggle)] dark:text-ink-3">
          <Sun className="size-5" />
        </span>
        <span className="relative z-10 grid flex-1 place-items-center text-ink-3 transition-colors duration-[var(--dur-toggle)] dark:text-brand-text">
          <Moon className="size-5" />
        </span>
      </span>
    </button>
  );
}
