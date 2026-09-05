import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, corridors, profiles } from "@/lib/db/schema";
import {
  getCompanionUpdate,
  isStale,
  upsertCompanionUpdate,
} from "@/lib/data/companion";
import { advisoryChanged, type Advisory } from "@/lib/safety/advisories";
import { fetchAdvisories } from "@/lib/safety/fetch-advisories";

/**
 * The cached travel advisories for one application, and the change
 * detection that turns a re-read into an alert.
 *
 * Cached in `companion_updates` under its own `kind`, alongside the
 * companion's local tips — the table's `kind` column is plain text, so a
 * second sort of content needed no migration and inherits the same
 * upsert and staleness helpers.
 */

const KIND = "safety_advisory";

/**
 * How long a stored advisory is trusted before the sources are re-read.
 *
 * A day, not the local tips' seven. Tips are orientation prose that ages
 * gently; an advisory is the one thing on that page whose whole value is
 * being current, and a week-old "no change" is a claim we would not want
 * to have made.
 */
const STALE_AFTER_DAYS = 1;

type CachedAdvisories = { advisories: Advisory[] };

function readCache(payload: unknown): Advisory[] {
  const advisories = (payload as Partial<CachedAdvisories> | null)?.advisories;
  return Array.isArray(advisories) ? advisories : [];
}

/**
 * Re-read the advisories for a destination if the cached copy is old,
 * and say which of them moved since we last looked.
 *
 * `changed` is what an alert is built from, and it is empty in every
 * case where an alert would be wrong: the first time an application is
 * ever checked (there is no previous reading to compare, so the
 * traveller sees the advisory on the page rather than in their inbox), a
 * cache that is still fresh, and a refresh where every source was
 * unreachable.
 *
 * That last one is the important one. A failed fetch serves the stored
 * copy rather than an empty list — stale but true beats blank, and an
 * advisory that merely failed to load must never read as one that was
 * withdrawn.
 */
export async function refreshAdvisoriesIfStale(
  applicationId: string,
  destinationIso: string
): Promise<{ advisories: Advisory[]; changed: Advisory[] }> {
  const existing = await getCompanionUpdate(applicationId, KIND);
  const cached = existing ? readCache(existing.payload) : [];

  if (existing && !isStale(existing, STALE_AFTER_DAYS)) {
    return { advisories: cached, changed: [] };
  }

  const fetched = await fetchAdvisories(destinationIso);

  // Every source down. Keep what we last read and claim no change.
  if (fetched.length === 0) {
    return { advisories: cached, changed: [] };
  }

  // Compared per source, never across them: FCDO moving says nothing
  // about whether the State Department did.
  const changed = existing
    ? fetched.filter((next) => {
        const previous = cached.find((c) => c.source === next.source) ?? null;
        return advisoryChanged(previous, next);
      })
    : [];

  await upsertCompanionUpdate(applicationId, KIND, {
    advisories: fetched,
  } satisfies CachedAdvisories);

  return { advisories: fetched, changed };
}

/**
 * Approved travellers whose destination is known, for the advisory sweep.
 *
 * A corridor is required rather than optional: the advisory is looked up
 * by destination, and an application with no corridor has no destination
 * to look one up for.
 *
 * Gated on the traveller's own preference, unlike the expiry sweep next
 * door. The distinction is worth stating, because the two look alike and
 * are not: `visa_expiring` ignores this setting on purpose, since a date
 * on somebody's leave to remain is a deadline they asked us to watch and
 * not a subscription. A travel advisory is a companion update — it is
 * the same kind of thing as the weekly orientation email, arriving on
 * its own schedule — so a traveller who switched the companion off has
 * already said what they want, and reaching them anyway would make that
 * switch a lie.
 *
 * It reuses `companionDigest` rather than introducing a second setting.
 * A traveller who wants safety alerts but no digest is a real person,
 * but they are better served by one switch that means what it says than
 * by two they have to find; the advisory is also still on the companion
 * page for anyone who goes looking, whatever this says.
 *
 * `is distinct from 'off'` rather than `!= 'off'` for the reason
 * `digest.ts` gives at length: `notificationPrefs` defaults to `{}`, and
 * `!=` against a missing key evaluates to NULL, which would silently
 * drop every traveller who never opened the setting.
 */
export async function approvedTravellersForAdvisories(
  limit: number
): Promise<{ applicationId: string; travelerId: string; destinationIso: string }[]> {
  return db
    .select({
      applicationId: applications.id,
      travelerId: applications.travelerId,
      destinationIso: corridors.destinationIso,
    })
    .from(applications)
    .innerJoin(corridors, eq(corridors.id, applications.corridorId))
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    .where(
      and(
        eq(applications.status, "approved"),
        isNotNull(applications.corridorId),
        sql`(${profiles.notificationPrefs}->>'companionDigest') is distinct from 'off'`
      )
    )
    .limit(limit);
}
