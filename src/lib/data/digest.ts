import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  companionUpdates,
  notifications,
  profiles,
} from "@/lib/db/schema";
import { DIGEST_INTERVAL_DAYS } from "@/lib/domain/digest";

/**
 * The approved travellers who are owed a post-arrival digest now.
 *
 * This is the cadence, and it lives here rather than in the scheduler
 * on purpose. `/api/cron/companion` is triggered by deploy-time config
 * — a Coolify scheduled task, or anything else hitting the URL on a
 * timer — and config is the one part of the system no test can reach.
 * So the schedule decides only how often we *look*; this decides who
 * actually gets one. Poll it daily and every frequency is honoured;
 * point it hourly by mistake and nobody is spammed.
 *
 * Ordered oldest-first so a capped batch spends its slots on whoever
 * has waited longest.
 */
export async function travellersDueForDigest(limit: number) {
  // When each traveller last had one. A grouped subquery joined in,
  // rather than a correlated `select max(...)` written by hand: Drizzle
  // then owns the column names, which matters because the client is
  // configured `casing: "snake_case"` while the schema keys are
  // camelCase. One row per recipient, so the join cannot multiply
  // applications.
  const lastDigest = db
    .select({
      recipientId: notifications.recipientId,
      sentAt: sql<string | null>`max(${notifications.createdAt})`.as("sent_at"),
    })
    .from(notifications)
    .where(eq(notifications.kind, "companion_digest"))
    .groupBy(notifications.recipientId)
    .as("last_digest");

  // A missing `companionDigest` key is the common case — `notificationPrefs`
  // defaults to `{}` — and must read as the documented default rather
  // than as "off". `is distinct from` gets that right where `!= 'off'`
  // would evaluate to NULL and silently exclude everyone who never
  // touched the setting. `readDigestFrequency` is the same rule in
  // TypeScript, for the screens.
  //
  // Interval lengths come from `DIGEST_INTERVAL_DAYS` rather than being
  // written out here, so widening a cadence stays one edit in one file.
  // `to_timestamp(0)` stands in for "never sent", which is always due.
  const due = and(
    eq(applications.status, "approved"),
    sql`(${profiles.notificationPrefs}->>'companionDigest') is distinct from 'off'`,
    // The `::int` is not decoration: the day counts are bound as query
    // parameters, which Postgres infers as `text`, and `make_interval`
    // has no `text` overload. Without the cast this is a runtime 42883
    // that no amount of typechecking would have shown.
    sql`coalesce(${lastDigest.sentAt}, to_timestamp(0)) <= now() - make_interval(days => (
      case (${profiles.notificationPrefs}->>'companionDigest')
        when 'daily' then ${DIGEST_INTERVAL_DAYS.daily}
        when 'monthly' then ${DIGEST_INTERVAL_DAYS.monthly}
        else ${DIGEST_INTERVAL_DAYS.weekly}
      end)::int)`
  );

  return db
    .select({
      applicationId: applications.id,
      travelerId: applications.travelerId,
    })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    .leftJoin(lastDigest, eq(lastDigest.recipientId, applications.travelerId))
    // Left-joined only to order by it: a NULL (tips never generated)
    // sorts first, then the oldest, so a capped batch always reaches
    // whoever has waited longest for a refresh.
    .leftJoin(
      companionUpdates,
      and(
        eq(companionUpdates.applicationId, applications.id),
        eq(companionUpdates.kind, "local_tips")
      )
    )
    .where(due)
    .orderBy(sql`${companionUpdates.generatedAt} asc nulls first`)
    .limit(limit);
}

/** How many travellers are due in total, ignoring the batch cap. */
export async function countDueForDigest(): Promise<number> {
  const rows = await travellersDueForDigest(Number.MAX_SAFE_INTEGER);
  return rows.length;
}
