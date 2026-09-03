"use client";

import { cn } from "@/lib/utils";

import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";

/**
 * Appearance and language, as one object.
 *
 * Both bars used to set these down as two separately bordered controls
 * with identical treatment — a square icon button and a boxed dropdown,
 * same border, same radius, same height, touching. Two unrelated
 * settings that read as a single unit anyway, and the unit was heavy
 * enough to argue with the call to action beside it.
 *
 * So they become one unit honestly: one border, one radius, a hairline
 * between the halves, and hover resolving to whichever half the pointer
 * is over. The saving is a border, a globe and a chevron — which is most
 * of what was crowding the right-hand end of the bar.
 *
 * Below `md` the product bar drops this entirely and `AccountMenu`
 * carries both settings on named rows instead; there is no room here,
 * and a setting you have to recognise from an icon is worse than one
 * with a label on it.
 */
export function SettingsCluster({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border border-border-strong bg-surface",
        className
      )}
    >
      <ThemeSwitch variant="bare" />
      <span aria-hidden className="h-5 w-px shrink-0 bg-border" />
      <LocaleMenu variant="bare" />
    </div>
  );
}
