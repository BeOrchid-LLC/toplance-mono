import type { NavItem } from "@/components/app/app-nav";
import type { ApplicationStatus } from "@/lib/domain/status";

/**
 * The traveller's journey nav, in one place.
 *
 * One surface renders it now: the `(app)` layout, over the application
 * row it already holds. It was pulled out when there were two — the
 * landing page used to dress its bar as the signed-in visitor's own
 * console and built this list separately, and the two drifted, the
 * landing page's copy stopping at Documents so the bar grew entries the
 * moment a traveller clicked through. That second caller is gone with
 * the swap itself: the marketing header is now the same for everyone.
 *
 * The list stays here rather than being inlined into its one caller.
 * Same reasoning as `AppNav` reading the pathname instead of taking it
 * as a prop — one answer, in the place a second surface would find it —
 * and `opsNav` is modelled on this.
 *
 * Pure, and free of both `"use client"` and `server-only`, so either a
 * client component or a server layout can call it.
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
