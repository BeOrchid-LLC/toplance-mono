import { redirect } from "next/navigation";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { travellerNav } from "@/components/app/traveller-nav";
import { SetupNotice } from "@/components/shared/setup-notice";
import { homeFor } from "@/lib/auth/routes";
import { hasDatabaseEnv } from "@/lib/db/client";
import {
  getApplication,
  getProfile,
} from "@/lib/data/applications";
import {
  getNotifications,
  unreadMessageCount,
  unreadNotificationCount,
} from "@/lib/notifications/notify";
import { isApplicationPaid } from "@/lib/data/payments";
import { decideClientPaywall } from "@/lib/payments/gates";
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
  // has to come before the reads below, because `getApplication`
  // opens a draft on sight and a reviewer must never come to own one.
  if (profile.role !== "traveler") redirect(homeFor(profile.role));

  const [application, notifications, unreadCount, unreadMessages, avatarUrl] =
    await Promise.all([
      getApplication(),
      getNotifications(profile.id),
      unreadNotificationCount(profile.id),
      // The Messages badge. Counted separately from the bell's because
      // the two are now disjoint: `message_received` left the bell so
      // that one arriving message is reported once, on the item that
      // clears it. See `notInTheBell`.
      unreadMessageCount(profile.id),
      // Private bucket, so the photo is signed fresh per render — the
      // same stance the profile page takes.
      profile.avatarPath ? signedDocumentUrl(profile.avatarPath) : null,
    ]);

  /**
   * The paywall, and it is the whole console rather than one screen: a
   * client pays for their application before anything in it opens.
   *
   * `/checkout` deliberately sits outside this route group, so it is not
   * behind the layout that would send it here — a redirect a page also
   * receives is a loop, not a gate.
   *
   * Everything already loaded above is loaded anyway on the way past;
   * this adds one indexed read. Existing applications were settled at
   * zero by the 0028 backfill, so nobody mid-case meets this.
   */
  if (
    decideClientPaywall({
      hasApplication: !!application,
      applicationPaid: application ? await isApplicationPaid(application.id) : false,
    }) === "checkout"
  ) {
    redirect("/checkout");
  }

  // Profile is reachable from the account menu (`profileHref` below),
  // not the navbar — the nav carries the application journey only.
  const nav = travellerNav({
    intakeComplete: !!application?.intakeComplete,
    status: application?.status ?? null,
    unreadMessages,
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
