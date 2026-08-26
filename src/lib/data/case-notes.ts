import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, caseNotes, profiles } from "@/lib/db/schema";

export type CaseNoteView = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
};

export type CaseNoteResult = { ok: true } | { error: string };

/**
 * One note from the review desk. Like `reviewDocumentTx`, this decides
 * nothing about access — the caller guards with `canWriteCaseNotes`
 * first, so `authorId` is always a staff member's id.
 */
export async function addCaseNote(
  applicationId: string,
  authorId: string,
  body: string
): Promise<CaseNoteResult> {
  const text = body.trim();
  if (!text) return { error: "Write the note first." };
  if (text.length > 2000) {
    return { error: "That note is over 2,000 characters — split it up." };
  }

  const [app] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "That case does not exist." };

  await db.insert(caseNotes).values({ applicationId, authorId, body: text });
  return { ok: true };
}

/**
 * Notes newest first, each carrying its author's name — or none, when
 * the author's profile is gone. The note outlives its author because
 * the case file is the record, not the person who wrote in it.
 */
export async function getCaseNotes(
  applicationId: string
): Promise<CaseNoteView[]> {
  return db
    .select({
      id: caseNotes.id,
      body: caseNotes.body,
      createdAt: caseNotes.createdAt,
      authorName: profiles.fullName,
    })
    .from(caseNotes)
    .leftJoin(profiles, eq(profiles.id, caseNotes.authorId))
    .where(eq(caseNotes.applicationId, applicationId))
    .orderBy(desc(caseNotes.createdAt));
}
