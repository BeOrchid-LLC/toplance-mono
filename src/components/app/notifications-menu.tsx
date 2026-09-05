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
import { markNotificationsRead } from "@/app/(app)/actions";
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
 * Opening the menu marks everything in it read: there is no separate
 * "mark as read" affordance. `router.refresh()` after the write is what
 * clears the badge without a full reload.
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
  const [markedThisOpen, setMarkedThisOpen] = React.useState(false);
  const { locale } = useLocale();
  const t = useT();

  function onOpenChange(open: boolean) {
    if (!open || markedThisOpen || unreadCount === 0) return;
    setMarkedThisOpen(true);
    markNotificationsRead().then(() => router.refresh());
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
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
        <DropdownMenuLabel>{t(NOTIFICATIONS.title)}</DropdownMenuLabel>

        {notifications.length === 0 ? (
          <p className="t-muted px-3 py-4">{t(NOTIFICATIONS.empty)}</p>
        ) : (
          notifications.map((n, i) => (
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
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
