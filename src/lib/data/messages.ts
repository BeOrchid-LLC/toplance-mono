import "server-only";

import { and, asc, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, messages, profiles, type Message } from "@/lib/db/schema";

/** Only the two roles that ever send a message — `senderRole` from the
 * caller's actor is always one of these; `org_member` (a sponsor) never
 * reaches here because `canWriteMessages` has no sponsorship branch. */
export type MessageSenderRole = "traveler" | "staff";

export type MessageView = {
  id: string;
  body: string;
  senderRole: Message["senderRole"];
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
  senderRole: MessageSenderRole,
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

  await db.insert(messages).values({ applicationId, senderId, senderRole, body: text });
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
  return db
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
  readerRole: MessageSenderRole
): Promise<void> {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.applicationId, applicationId),
        ne(messages.senderRole, readerRole),
        isNull(messages.readAt)
      )
    );
}

/** The badge on a thread: unread messages from the other side, per role. */
export async function unreadCountFor(
  applicationId: string,
  readerRole: MessageSenderRole
): Promise<number> {
  const rows = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.applicationId, applicationId),
        ne(messages.senderRole, readerRole),
        isNull(messages.readAt)
      )
    );
  return rows.length;
}
