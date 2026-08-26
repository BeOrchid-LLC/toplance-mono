import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { travelRecords, type TravelRecord } from "@/lib/db/schema";

export type TravelRecordInput = {
  country: string;
  purpose?: string;
  startedOn?: string;
  endedOn?: string;
  note?: string;
};

export type TravelRecordResult = { ok: true } | { error: string };

/** What `<input type="date">` submits; anything else is a typed guess. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Record one past trip, in the traveller's own words. Every mutation in
 * this module is scoped to `travelerId` — the session user's id, never a
 * form field — so there is no way to write into someone else's history.
 */
export async function addTravelRecord(
  travelerId: string,
  input: TravelRecordInput
): Promise<TravelRecordResult> {
  const country = input.country.trim();
  if (!country) return { error: "Say which country the trip was to." };
  if (country.length > 80) return { error: "That country name is too long." };

  const purpose = input.purpose?.trim() || null;
  if (purpose && purpose.length > 120) {
    return { error: "Keep the purpose short — a phrase, not a story." };
  }

  const note = input.note?.trim() || null;
  if (note && note.length > 500) {
    return { error: "That note is over 500 characters." };
  }

  const startedOn = input.startedOn?.trim() || null;
  const endedOn = input.endedOn?.trim() || null;
  if ((startedOn && !ISO_DATE.test(startedOn)) || (endedOn && !ISO_DATE.test(endedOn))) {
    return { error: "Pick the dates from the date picker." };
  }
  // ISO dates compare correctly as strings.
  if (startedOn && endedOn && endedOn < startedOn) {
    return { error: "A trip cannot end before it starts." };
  }

  await db
    .insert(travelRecords)
    .values({ travelerId, country, purpose, startedOn, endedOn, note });
  return { ok: true };
}

/** Most recent trips first; trips with no date sink to the end. */
export async function listTravelRecords(
  travelerId: string
): Promise<TravelRecord[]> {
  return db
    .select()
    .from(travelRecords)
    .where(eq(travelRecords.travelerId, travelerId))
    .orderBy(
      sql`${travelRecords.startedOn} desc nulls last`,
      desc(travelRecords.createdAt)
    );
}

/**
 * Delete scoped to owner and id together: asking to remove a record that
 * is not yours is indistinguishable from one that does not exist.
 */
export async function removeTravelRecord(
  travelerId: string,
  recordId: string
): Promise<TravelRecordResult> {
  const deleted = await db
    .delete(travelRecords)
    .where(
      and(
        eq(travelRecords.id, recordId),
        eq(travelRecords.travelerId, travelerId)
      )
    )
    .returning({ id: travelRecords.id });

  if (deleted.length === 0) return { error: "That record is not on your history." };
  return { ok: true };
}
