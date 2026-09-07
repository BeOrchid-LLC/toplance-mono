import "server-only";

import { and, asc, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, messages, profiles, type Message } from "@/lib/db/schema";

/**
 * A case thread has two sides, and only ever two: the traveller, and
 * the agency handling their case.
 *
 * It used to be typed as `"traveler" | "staff"`, with a note that
 * `org_member` never reached here because `canWriteMessages` had no
 * sponsorship branch. Both halves of that stopped being true at #51 —
 * the agency became a participant, and BeOrchid stopped being one — so
 * an agency reviewer's message was being stored under the traveller's
 * own role. The thread would have shown the agency talking to itself in
 * the traveller's voice.
 *
 * A side rather than a role because the read/unread arithmetic below is
 * two-sided, and the column now holds three values: `staff` rows survive
 * from before the correction and read as the agency's side of the
 * conversation, which is what they were.
 */
export type MessageSide = "traveler" | "agency";

/** What the column holds for each side. */
function storedRole(side: MessageSide): "traveler" | "org_member" {
  return side === "traveler" ? "traveler" : "org_member";
}

/**
 * "Written by the other side", as a `where` clause.
 *
 * `ne(senderRole, readerRole)` used to say this, and stopped being true
 * when the column grew a third value: an agency reader would have marked
 * its own legacy `staff` messages as read, and counted them as unread
 * before that. The sides are defined by the traveller — everything else
 * is the agency — so one comparison covers both directions.
 */
function fromTheOtherSide(readerSide: MessageSide) {
  return readerSide === "traveler"
    ? ne(messages.senderRole, "traveler")
    : eq(messages.senderRole, "traveler");
}

/** Which side a stored row is on — anyone who is not the traveller is the agency. */
export function sideOf(senderRole: Message["senderRole"]): MessageSide {
  return senderRole === "traveler" ? "traveler" : "agency";
}

export type MessageView = {
  id: string;
  body: string;
  /** Which side wrote it — never the raw column, so a legacy `staff` row renders correctly. */
  side: MessageSide;
  senderName: string | null;
  createdAt: Date;
  readAt: Date | null;
};

export type MessageResult = { ok: true } | { error: string };

/**
 * One message on a case thread. Like `addCaseNote`, this decides nothing
 * about access — the caller guards with `canWriteMessages` first, so
 * `senderId`/`senderRole` are trusted to already match the caller.
 */
export async function sendMessageRow(
  applicationId: string,
  senderId: string,
  side: MessageSide,
  body: string
): Promise<MessageResult> {
  const text = body.trim();
  if (!text) return { error: "Write your message first." };
  if (text.length > 2000) {
    return { error: "That message is over 2,000 characters — split it up." };
  }

  const [app] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "That case does not exist." };

  await db
    .insert(messages)
    .values({ applicationId, senderId, senderRole: storedRole(side), body: text });
  return { ok: true };
}

/**
 * A thread, oldest first — a conversation reads top to bottom, unlike
 * case notes which read newest first as a running log. Carries each
 * message's sender name, or none when the sender's profile is gone: the
 * message outlives its sender because the thread is the record, not the
 * person who wrote in it.
 */
export async function listMessages(applicationId: string): Promise<MessageView[]> {
  const rows = await db
    .select({
      id: messages.id,
      body: messages.body,
      senderRole: messages.senderRole,
      senderName: profiles.fullName,
      createdAt: messages.createdAt,
      readAt: messages.readAt,
    })
    .from(messages)
    .leftJoin(profiles, eq(profiles.id, messages.senderId))
    .where(eq(messages.applicationId, applicationId))
    .orderBy(asc(messages.createdAt));

  // Mapped here rather than rendered from the column, so one place
  // decides what a `staff` row from before #51 means and every thread
  // agrees with it.
  return rows.map(({ senderRole, ...row }) => ({ ...row, side: sideOf(senderRole) }));
}

/**
 * `readAt` means "read by the other side" — set when the counterpart to
 * `readerRole` opens the thread, never when a sender re-reads their own
 * words. A single UPDATE guarded by `senderRole != readerRole` and
 * `readAt is null`, so calling this on an already-read thread is a
 * no-op rather than a second write.
 */
export async function markThreadRead(
  applicationId: string,
  readerSide: MessageSide
): Promise<void> {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.applicationId, applicationId),
        fromTheOtherSide(readerSide),
        isNull(messages.readAt)
      )
    );
}

/** The badge on a thread: unread messages from the other side, per role. */
export async function unreadCountFor(
  applicationId: string,
  readerSide: MessageSide
): Promise<number> {
  const rows = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.applicationId, applicationId),
        fromTheOtherSide(readerSide),
        isNull(messages.readAt)
      )
    );
  return rows.length;
}
