"use server";

import { eq } from "drizzle-orm";

import { db, hasDatabaseEnv } from "@/lib/db/client";
import {
  applications,
  organisations,
  orgMembers,
  type Notification,
} from "@/lib/db/schema";
import { getActor, getProfile } from "@/lib/data/applications";
import type { ApplicationStatus } from "@/lib/domain/status";
import {
  getNotifications,
  unreadNotificationCount,
} from "@/lib/notifications/notify";

/**
 * Everything the landing page needs to dress its bar as the signed-in
 * visitor's own console bar — the traveller's, the employer's or the
 * reviewer's, matching what each surface's real layout renders. A
 * discriminated union so the component cannot mix one persona's nav
 * with another's subtitle.
 */
export type SignedInChrome =
  | {
      persona: "traveler";
      name: string;
      email: string;
      /**
       * The two facts `travellerNav` builds the journey nav from, passed
       * raw rather than pre-reduced to a `locked` flag: the landing page
       * renders the same list the `(app)` layout does, and the item for
       * the post-arrival companion depends on the status, not the lock.
       * `status` is null when no application exists yet.
       */
      intakeComplete: boolean;
      status: ApplicationStatus | null;
      notifications: Notification[];
      unreadCount: number;
    }
  | {
      persona: "org_member";
      name: string;
      email: string;
      orgName: string | null;
    }
  | {
      persona: "staff";
      name: string;
      email: string;
      staffRole: string | null;
      notifications: Notification[];
      unreadCount: number;
    };

/**
 * Fetched from the client after Clerk resolves, so the landing page
 * itself stays `force-static` and edge-cached — the one design decision
 * that page documents about itself.
 *
 * Only ever the caller's own data: the profile comes off the session,
 * and the application read is a plain select — visiting the marketing
 * page must not create a draft application the way `/app` does.
 */
export async function getSignedInChrome(): Promise<SignedInChrome | null> {
  if (!hasDatabaseEnv) return null;

  const [profile, actor] = await Promise.all([getProfile(), getActor()]);
  if (!profile || !actor) return null;

  if (actor.role === "staff") {
    const [notifications, unreadCount] = await Promise.all([
      getNotifications(profile.id),
      unreadNotificationCount(profile.id),
    ]);
    return {
      persona: "staff",
      name: profile.fullName,
      email: profile.email,
      staffRole: actor.staffRole,
      notifications,
      unreadCount,
    };
  }

  if (actor.role === "org_member") {
    const [membership] = await db
      .select({ orgName: organisations.name })
      .from(orgMembers)
      .innerJoin(organisations, eq(organisations.id, orgMembers.orgId))
      .where(eq(orgMembers.userId, profile.id))
      .limit(1);
    return {
      persona: "org_member",
      name: profile.fullName,
      email: profile.email,
      orgName: membership?.orgName ?? null,
    };
  }

  const [[application], notifications, unreadCount] = await Promise.all([
    db
      .select({
        intakeComplete: applications.intakeComplete,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.travelerId, profile.id))
      .limit(1),
    getNotifications(profile.id),
    unreadNotificationCount(profile.id),
  ]);

  return {
    persona: "traveler",
    name: profile.fullName,
    email: profile.email,
    intakeComplete: !!application?.intakeComplete,
    status: application?.status ?? null,
    notifications,
    unreadCount,
  };
}
