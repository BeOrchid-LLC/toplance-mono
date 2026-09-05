import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  companionUpdates,
  corridors,
  profiles,
} from "@/lib/db/schema";
import {
  getCompanionUpdate,
  isStale,
  upsertCompanionUpdate,
} from "@/lib/data/companion";
import { advisoryChanged, type Advisory } from "@/lib/safety/advisories";
import { fetchAdvisories, type AdvisoryFetch } from "@/lib/safety/fetch-advisories";

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

/**
 * Two readings, not one.
 *
 * `advisories` is what the sources last said — the page renders this, and
 * refreshing it is the whole point of the cache. `alerted` is the reading
 * the traveller has actually been told about, and it moves only when an
 * alert is genuinely sent.
 *
 * Keeping them apart is what makes the alert survive a page view. With a
 * single reading, `refreshAdvisoriesIfStale` had to overwrite the very
 * baseline it compares against; the companion page calls it on render and
 * discards `changed`, so a traveller opening their page after a
 * government moved its advice silently consumed the change, and the
 * nightly sweep — comparing against the already-updated copy — found
 * nothing to send, permanently. That page is approved-only, which is
 * exactly the population the sweep exists for.
 */
type CachedAdvisories = { advisories: Advisory[]; alerted: Advisory[] };

function asAdvisories(value: unknown): Advisory[] {
  return Array.isArray(value) ? (value as Advisory[]) : [];
}

function readCache(payload: unknown): CachedAdvisories {
  const row = payload as Partial<CachedAdvisories> | null;
  const advisories = asAdvisories(row?.advisories);

  return {
    advisories,
    // A row written before the two were split has no `alerted`. Treating
    // the last reading as the baseline reproduces the old behaviour for
    // that one row and seeds it properly on the next write — which is the
    // quiet choice, and the only one that cannot mail somebody about a
    // change that predates this code.
    alerted: row?.alerted === undefined ? advisories : asAdvisories(row.alerted),
  };
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
 *
 * `changed` is compared against the *alerted* baseline and this function
 * never moves that baseline — only `markAdvisoriesAlerted` does, after an
 * alert is really away. So a caller that ignores `changed` (the companion
 * page does, because rendering a page is not the moment to email
 * somebody) costs the traveller nothing: the change is still pending the
 * next time the sweep looks.
 */
export async function refreshAdvisoriesIfStale(
  applicationId: string,
  destinationIso: string,
  memo?: AdvisoryFetch
): Promise<{ advisories: Advisory[]; changed: Advisory[] }> {
  const existing = await getCompanionUpdate(applicationId, KIND);
  const cached = existing
    ? readCache(existing.payload)
    : { advisories: [], alerted: [] };

  // A fresh cache still reports what is pending. It is not a re-read, so
  // it can find nothing new — but something the page refreshed an hour
  // ago and never mentioned to anybody is still owed to the traveller,
  // and this is the branch the sweep lands in when that happened.
  if (existing && !isStale(existing, STALE_AFTER_DAYS)) {
    return {
      advisories: cached.advisories,
      changed: changedSince(cached.alerted, cached.advisories, true),
    };
  }

  const fetched = await fetchAdvisories(destinationIso, memo);

  // Every source down. Keep what we last read and claim no change.
  if (fetched.length === 0) {
    return { advisories: cached.advisories, changed: [] };
  }

  const changed = changedSince(cached.alerted, fetched, existing !== null);

  await upsertCompanionUpdate(applicationId, KIND, {
    advisories: fetched,
    // On a first sighting the reading *is* the baseline: there was
    // nothing to compare it against, the traveller sees it on the page
    // rather than in their inbox, and the next move of the source is the
    // first thing worth alerting on. Seeding it empty instead would make
    // every source look new for ever — `advisoryChanged(null, next)` is
    // false — so no change would ever be reported at all.
    //
    // Afterwards it is left exactly where it was. Moving it here would
    // mark as "told" something nobody has been told yet, which is the
    // mistake this split exists to make impossible.
    alerted: existing ? cached.alerted : fetched,
  } satisfies CachedAdvisories);

  return { advisories: fetched, changed };
}

/**
 * Which of `next` has moved since the traveller was last alerted.
 *
 * Compared per source, never across them: FCDO moving says nothing about
 * whether the State Department did.
 *
 * A first sighting is never a change — `advisoryChanged` enforces that
 * per source, and `hasHistory` covers the whole application, so deploying
 * this cannot mail every approved traveller about advice that has sat
 * unchanged for a year.
 */
function changedSince(
  alerted: Advisory[],
  next: Advisory[],
  hasHistory: boolean
): Advisory[] {
  if (!hasHistory) return [];

  return next.filter((advisory) => {
    const previous = alerted.find((a) => a.source === advisory.source) ?? null;
    return advisoryChanged(previous, advisory);
  });
}

/**
 * Record that the traveller has now been told about these advisories.
 *
 * Called only after `notify` reports the alert actually went out, so a
 * failed send is retried on the next sweep rather than swallowed. Writes
 * the current reading as the new baseline and leaves `advisories`
 * untouched — this is bookkeeping about what was said, not a refresh.
 */
export async function markAdvisoriesAlerted(applicationId: string): Promise<void> {
  const existing = await getCompanionUpdate(applicationId, KIND);
  if (!existing) return;

  const cached = readCache(existing.payload);

  await upsertCompanionUpdate(applicationId, KIND, {
    advisories: cached.advisories,
    alerted: cached.advisories,
  } satisfies CachedAdvisories);
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
 *
 * Of whoever is left, oldest-cache-first, nulls (never checked at all)
 * ahead of everything — the same rule `travellersDueForDigest` uses, and
 * for the same reason. `limit` with no `orderBy` is not a fair sample:
 * Postgres returns whichever rows it reaches first, which is stable in
 * practice, so at more than `limit` eligible travellers the same ones
 * were swept every night and the rest were never checked at all.
 * Bounding the work is fine; bounding it to the same subset for ever is
 * a traveller who never hears about a change.
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
    // Inner-joined to read the preference below: a traveller with no
    // profile row has nobody to alert anyway.
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    // Left-joined only to order by it, the same shape
    // `travellersDueForDigest` uses.
    .leftJoin(
      companionUpdates,
      and(
        eq(companionUpdates.applicationId, applications.id),
        eq(companionUpdates.kind, KIND)
      )
    )
    .where(
      and(
        eq(applications.status, "approved"),
        isNotNull(applications.corridorId),
        sql`(${profiles.notificationPrefs}->>'companionDigest') is distinct from 'off'`
      )
    )
    .orderBy(sql`${companionUpdates.generatedAt} asc nulls first`)
    .limit(limit);
}
