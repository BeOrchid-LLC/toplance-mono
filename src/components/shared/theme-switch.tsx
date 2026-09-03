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
 * Three variants, for three amounts of room.
 *
 * `track` is the full 60px slider. It survives only inside the account
 * menu on mobile, where appearance is a named setting on its own row and
 * a switch is what a setting looks like.
 *
 * `bare` is what both bars use now: the icon alone, no border of its
 * own, because it sits inside `SettingsCluster` and shares that shell
 * with the language control. Two settings, one object — the bars used to
 * spend two identical bordered boxes side by side on them, which bound
 * them into a unit that competed with the call to action next to it.
 *
 * There used to be a third, `icon`: a bordered square sized to match
 * the boxed language menu next to it. Both bars, the auth layout and the
 * invite page were its only callers, and all four now set the pair down
 * as one `SettingsCluster` instead — so it went with them rather than
 * staying on as a variant nothing reaches for.
 */
export function ThemeSwitch({
  className,
  variant = "track",
}: {
  className?: string;
  variant?: "track" | "bare";
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

  if (variant === "bare") {
    return (
      <button
        {...shared}
        className={cn(
          // Rounded only on the leading edge: the cluster's own radius
          // is on the wrapper, and a fully rounded child would show its
          // corners against the divider on the other side.
          "grid size-9 shrink-0 place-items-center rounded-l-[var(--radius-sm)] text-ink-2 transition-colors duration-[var(--dur-toggle)] ease-[var(--ease-out)] hover:bg-surface-2 hover:text-ink",
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
