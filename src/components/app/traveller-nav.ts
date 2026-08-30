import type { NavItem } from "@/components/app/app-nav";
import type { ApplicationStatus } from "@/lib/domain/status";

/**
 * The traveller's journey nav, in one place.
 *
 * Two surfaces render it: the `(app)` layout, over the application row it
 * already holds, and the landing page's `SiteChrome`, over what
 * `getSignedInChrome` could read. They built the list separately once and
 * drifted — the landing page's copy stopped at Documents, so the bar grew
 * entries the moment a traveller clicked through to their own console.
 * Same fix as `AppNav` reading the pathname rather than taking it as a
 * prop: one answer, so the two cannot disagree.
 *
 * Pure, and free of both `"use client"` and `server-only`, because a
 * client component and a server layout each need to call it.
 */
export function travellerNav({
  intakeComplete,
  status,
}: {
  intakeComplete: boolean;
  /** `null` when no application exists yet — a first visit to the site. */
  status: ApplicationStatus | null;
}): NavItem[] {
  // Visible but unwalkable until intake resolves a corridor: the journey
  // should be legible before it is available.
  const locked = !intakeComplete;

  return [
    { href: "/app", label: "Dashboard" },
    { href: "/app/requirements", label: "Requirements", locked },
    { href: "/app/documents", label: "Documents", locked },
    { href: "/app/messages", label: "Messages", locked },
    // Only once there is somewhere to have landed — this item does not
    // even exist (never mind lock) before approval, the same way the
    // corridor route group's own layout has nothing to head the screen
    // with until a corridor has resolved.
    ...(status === "approved"
      ? [{ href: "/app/companion", label: "After you land" }]
      : []),
  ];
}
