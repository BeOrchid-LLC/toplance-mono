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

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  if (!profile) redirect("/sign-in?next=/app");

  const [application, notifications, unreadCount] = await Promise.all([
    getOrCreateApplication(),
    getNotifications(profile.id),
    unreadNotificationCount(profile.id),
  ]);
  const locked = !application?.intakeComplete;

  // Profile is reachable from the account menu (`profileHref` below),
  // not the navbar — the nav carries the application journey only.
  const nav: NavItem[] = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/requirements", label: "Requirements", locked },
    { href: "/app/documents", label: "Documents", locked },
    { href: "/app/messages", label: "Messages", locked },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={nav}
        name={profile.fullName}
        email={profile.email}
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
