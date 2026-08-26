import "server-only";

import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";
import type { AnalyticsEvent } from "@/lib/analytics/events";

/**
 * Record one product event.
 *
 * Never throws. An analytics write is not worth failing a document
 * upload for: a traveller on a bad connection should not lose a passport
 * scan because a metrics insert timed out. The failure is logged and
 * swallowed.
 *
 * `userId` is passed in rather than read from the session here, so this
 * module stays free of request context and can be called from anywhere
 * that already knows who is acting.
 */
export async function track(
  event: AnalyticsEvent,
  props: Record<string, unknown> = {},
  userId: string | null = null
): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({ name: event, userId, props });
  } catch (error) {
    console.error(`[analytics] could not record "${event}"`, error);
  }
}
