import { redirect } from "next/navigation";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { travellerNav } from "@/components/app/traveller-nav";
import { SetupNotice } from "@/components/shared/setup-notice";
import { homeFor } from "@/lib/auth/routes";
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
  // `/go`, not `/sign-in`. The proxy walks a signed-in visitor off the
  // auth pages, so sending a session that has no profile row back there
  // bounces it straight here again — an endless redirect rather than an
  // explanation. `/go` is where that chain is allowed to stop.
  if (!profile) redirect("/go");

  // Holding a profile is not the same as belonging here. `/go` sends
  // each role to its own console, but nothing routed someone who typed
  // this path, kept a bookmark or followed a stale link — and the answer
  // has to come before the reads below, because `getOrCreateApplication`
  // opens a draft on sight and a reviewer must never come to own one.
  if (profile.role !== "traveler") redirect(homeFor(profile.role));

  const [application, notifications, unreadCount, avatarUrl] =
    await Promise.all([
      getOrCreateApplication(),
      getNotifications(profile.id),
      unreadNotificationCount(profile.id),
      // Private bucket, so the photo is signed fresh per render — the
      // same stance the profile page takes.
      profile.avatarPath ? signedDocumentUrl(profile.avatarPath) : null,
    ]);

  // Profile is reachable from the account menu (`profileHref` below),
  // not the navbar — the nav carries the application journey only.
  const nav = travellerNav({
    intakeComplete: !!application?.intakeComplete,
    status: application?.status ?? null,
  });

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={nav}
        name={profile.fullName}
        email={profile.email}
        avatarUrl={avatarUrl}
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
