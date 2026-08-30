"use client";

import * as React from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { travellerNav } from "@/components/app/traveller-nav";
import { SiteNav } from "@/components/site/site-nav";
import {
  getSignedInChrome,
  type SignedInChrome,
} from "@/app/(site)/actions";

/**
 * The landing page's bar, decided on the client. The page is
 * `force-static`, so the server cannot know who is looking at it; once
 * Clerk resolves a session this swaps the marketing nav for the same
 * `AppBar` that person's own console shows — the traveller's journey
 * nav, the employer's People view or the reviewer's case queue — and a
 * server action fills in what only the database knows.
 *
 * Until that lands, the bar already stands as an empty product bar with
 * Clerk's own name on the account chip; a beat later the persona nav,
 * the Postgres name and the bell settle in.
 */
export function SiteChrome() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [chrome, setChrome] = React.useState<SignedInChrome | null>(null);

  // No reset on sign-out: the signed-out branch below never reads
  // `chrome`, and signing back in refetches over whatever is stale.
  React.useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    getSignedInChrome().then((data) => {
      if (!cancelled) setChrome(data);
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  if (!isLoaded || !isSignedIn) return <SiteNav />;

  const fallbackName = user?.fullName ?? "";
  const fallbackEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  if (!chrome) {
    // The product bar's shell while the persona loads — never the
    // marketing nav, which would flash "Sign in" at someone signed in.
    return <AppBar nav={[]} name={fallbackName} email={fallbackEmail} />;
  }

  if (chrome.persona === "staff") {
    return (
      <AppBar
        nav={[{ href: "/ops", label: "Case queue" }]}
        name={chrome.name || fallbackName}
        email={chrome.email || fallbackEmail}
        subtitle={`Toplance operations · ${chrome.staffRole ?? "reviewer"}`}
        notifications={
          <NotificationsMenu
            notifications={chrome.notifications}
            unreadCount={chrome.unreadCount}
            fallbackHref="/ops"
          />
        }
      />
    );
  }

  if (chrome.persona === "org_member") {
    return (
      <AppBar
        nav={[{ href: "/employer", label: "People" }]}
        name={chrome.name || fallbackName}
        email={chrome.email || fallbackEmail}
        subtitle={
          chrome.orgName ? `${chrome.orgName} · HR` : "Organisation console"
        }
      />
    );
  }

  return (
    <AppBar
      nav={travellerNav({
        intakeComplete: chrome.intakeComplete,
        status: chrome.status,
      })}
      name={chrome.name || fallbackName}
      email={chrome.email || fallbackEmail}
      profileHref="/app/profile"
      notifications={
        <NotificationsMenu
          notifications={chrome.notifications}
          unreadCount={chrome.unreadCount}
          fallbackHref="/app"
        />
      }
    />
  );
}
