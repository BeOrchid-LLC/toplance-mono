"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationsRead } from "@/app/[locale]/(app)/actions";
import type { Notification } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n/locales";
import { NOTIFICATIONS } from "@/lib/i18n/app-chrome";
import { RELATIVE_TIME } from "@/lib/i18n/relative-time";

type NotificationKind = Notification["kind"];

/**
 * Human copy for the bell — independent of the email subject line the
 * same event sends via `@/lib/notifications/templates`, because a list
 * item is read in passing and an inbox subject is read on its own.
 * The strings themselves live in `NOTIFICATIONS.kind`, one per language.
 */
function kindCopy(kind: NotificationKind, locale: Locale): string {
  return NOTIFICATIONS.kind[kind][locale];
}

function relativeTime(date: Date, locale: Locale): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return RELATIVE_TIME.justNow[locale];
  if (minutes < 60) {
    return RELATIVE_TIME.minutesAgo[locale].replace("{n}", String(minutes));
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return RELATIVE_TIME.hoursAgo[locale].replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days < 7) return RELATIVE_TIME.daysAgo[locale].replace("{n}", String(days));
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Every kind's payload carries `url` (see `NotificationPayload`); this is a defensive fallback, not the normal path. */
function linkFor(n: Notification, fallbackHref: string): string {
  const payload = n.payload;
  if (payload && typeof payload === "object" && "url" in payload) {
    const url = (payload as { url?: unknown }).url;
    if (typeof url === "string" && url) return url;
  }
  return fallbackHref;
}

/**
 * The bell. `notifications` and `unreadCount` are fetched server-side by
 * the caller — `getNotifications` and `unreadNotificationCount` both read
 * the database, which a client component may not do — so this only ever
 * renders what it was handed.
 *
 * Reading is a thing you do, not a thing that happens to you. Opening
 * the menu used to mark everything in it read, which made the badge
 * clear itself and — worse — destroyed the bold on every unread row at
 * the exact moment somebody looked at it: the styling below has existed
 * since the bell shipped and nobody had ever seen it. "Read all" in the
 * header does that write now, and `router.refresh()` after it is what
 * clears the badge without a full reload.
 *
 * It does not confirm. Marking read takes away no access, no data and
 * nobody's work in progress, so it falls outside the rule in `AGENTS.md`
 * the way promoting a member does.
 */
export function NotificationsMenu({
  notifications,
  unreadCount,
  fallbackHref = "/app",
}: {
  notifications: Notification[];
  unreadCount: number;
  /** Where an item with no usable `payload.url` should point. */
  fallbackHref?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const { locale } = useLocale();
  const t = useT();

  function readAll() {
    startTransition(async () => {
      await markNotificationsRead();
      // The menu is deliberately left open. The point of the button is
      // watching the bold come off the rows you have just read; closing
      // on the click would hide the only thing it does.
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={
          unreadCount > 0
            ? NOTIFICATIONS.ariaUnread[locale].replace("{n}", String(unreadCount))
            : t(NOTIFICATIONS.ariaNoUnread)
        }
        className="relative grid size-9 place-items-center rounded-full hover:bg-surface-2"
      >
        <Bell className="size-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute end-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[340px]">
        {/* Outside the scroll container below, so the label and the
            button stay put while fifteen notifications move past them.
            A "Read all" that scrolls away is one you have to scroll back
            up to find. */}
        <div className="flex items-center justify-between gap-2">
          <DropdownMenuLabel>{t(NOTIFICATIONS.title)}</DropdownMenuLabel>
          {/* A menu item rather than a bare `<button>`, styled back down
              to a text control. A button dropped inside Radix's content
              is invisible to the menu's own arrow-key navigation and
              closes it on Tab — so the one control here that is not a
              link would have been the one control a keyboard could not
              reach. `preventDefault` on select is what keeps the menu
              open, since selecting an item normally closes it. */}
          <DropdownMenuItem
            disabled={pending || unreadCount === 0}
            onSelect={(event) => {
              event.preventDefault();
              readAll();
            }}
            className="min-h-0 shrink-0 px-2 py-1 text-xs font-medium text-brand-text"
          >
            {t(NOTIFICATIONS.readAll)}
          </DropdownMenuItem>
        </div>

        {notifications.length === 0 ? (
          <p className="t-muted px-3 py-4">{t(NOTIFICATIONS.empty)}</p>
        ) : (
          /**
           * Both halves of the cap earn their place: `20rem` keeps the
           * menu from running down a tall desktop window, and `60vh`
           * keeps it inside a short laptop one, where a fixed height is
           * how a dropdown ends up taller than the viewport. It lands
           * about five and a half rows in, so the sixth is half-visible
           * — which is what says "there is more" before a scrollbar has
           * to.
           *
           * The scroll lives here rather than on `DropdownMenuContent`,
           * which is shared with every other menu in the product and has
           * no list long enough to need it.
           */
          <div className="max-h-[min(60vh,20rem)] overflow-y-auto">
            {notifications.map((n, i) => (
              <React.Fragment key={n.id}>
                <DropdownMenuItem asChild>
                  <Link
                    href={linkFor(n, fallbackHref)}
                    className="flex-col items-start gap-0.5 py-2"
                  >
                    <span className={cn("t-body", !n.readAt && "font-semibold text-ink")}>
                      {kindCopy(n.kind, locale)}
                    </span>
                    <span className="special">{relativeTime(n.createdAt, locale)}</span>
                  </Link>
                </DropdownMenuItem>
                {i < notifications.length - 1 && <DropdownMenuSeparator />}
              </React.Fragment>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
