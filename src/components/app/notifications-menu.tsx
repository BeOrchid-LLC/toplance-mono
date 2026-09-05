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

type NotificationKind = Notification["kind"];

/**
 * Human copy for the bell — independent of the email subject line the
 * same event sends via `@/lib/notifications/templates`, because a list
 * item is read in passing and an inbox subject is read on its own.
 */
const KIND_COPY: Record<NotificationKind, string> = {
  application_submitted: "A case reached 100% and was submitted",
  status_changed: "Your application status changed",
  document_flagged: "A document needs another look",
  message_received: "You have a new message",
  itinerary_ready: "Your arrival plan is ready",
  companion_digest: "Your weekly digest is ready",
  checklist_changed: "Your document checklist changed",
  visa_expiring: "Your visa is approaching its expiry date",
  advisory_changed: "Travel advice for your destination changed",
};

function relativeTime(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
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

  function onOpenChange(open: boolean) {
    if (!open || markedThisOpen || unreadCount === 0) return;
    setMarkedThisOpen(true);
    markNotificationsRead().then(() => router.refresh());
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        className="relative grid size-9 place-items-center rounded-full hover:bg-surface-2"
      >
        <Bell className="size-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[340px]">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>

        {notifications.length === 0 ? (
          <p className="t-muted px-3 py-4">Nothing yet.</p>
        ) : (
          notifications.map((n, i) => (
            <React.Fragment key={n.id}>
              <DropdownMenuItem asChild>
                <Link
                  href={linkFor(n, fallbackHref)}
                  className="flex-col items-start gap-0.5 py-2"
                >
                  <span className={cn("t-body", !n.readAt && "font-semibold text-ink")}>
                    {KIND_COPY[n.kind]}
                  </span>
                  <span className="special">{relativeTime(n.createdAt)}</span>
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
