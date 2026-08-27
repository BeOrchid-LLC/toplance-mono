import { redirect } from "next/navigation";

import { AppBar, type NavItem } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import {
  getOrCreateApplication,
  getProfile,
} from "@/lib/data/applications";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { signedDocumentUrl } from "@/lib/storage/documents";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  if (!profile) redirect("/sign-in?next=/app");

  const [application, notifications, unreadCount, avatarUrl] =
    await Promise.all([
      getOrCreateApplication(),
      getNotifications(profile.id),
      unreadNotificationCount(profile.id),
      // Private bucket, so the photo is signed fresh per render — the
      // same stance the profile page takes.
      profile.avatarPath ? signedDocumentUrl(profile.avatarPath) : null,
    ]);
  const locked = !application?.intakeComplete;

  // Profile is reachable from the account menu (`profileHref` below),
  // not the navbar — the nav carries the application journey only.
  const nav: NavItem[] = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/requirements", label: "Requirements", locked },
    { href: "/app/documents", label: "Documents", locked },
    { href: "/app/messages", label: "Messages", locked },
    // Only once there is somewhere to have landed — this item does not
    // even exist (never mind lock) before approval, the same way the
    // corridor route group's own layout has nothing to head the screen
    // with until a corridor has resolved.
    ...(application?.status === "approved"
      ? [{ href: "/app/companion", label: "After you land" }]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={nav}
        name={profile.fullName}
        email={profile.email}
        avatarUrl={avatarUrl}
        showAgentButton
        profileHref="/app/profile"
        notifications={
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/app"
          />
        }
      />

      {children}
    </div>
  );
}
