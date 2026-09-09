import "server-only";

import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  organisations,
  profiles,
  supportMessages,
  supportRequests,
  type SupportMessage,
  type SupportRequestState,
} from "@/lib/db/schema";

/**
 * Support requests, as the platform console and an agency each read
 * them.
 *
 * Two profile joins, so both aliased: the person who wrote the request
 * and the member of staff who has it are different people and the table
 * shows both. `organisations` is joined because "who is asking" is the
 * first thing an operator needs and it does not live on this row.
 */
const author = alias(profiles, "support_author");
const assignee = alias(profiles, "support_assignee");

export type SupportRequestRow = {
  id: string;
  orgId: string;
  orgName: string | null;
  raisedBy: string | null;
  raisedByName: string | null;
  subject: string;
  body: string;
  state: SupportRequestState;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

const columns = {
  id: supportRequests.id,
  orgId: supportRequests.orgId,
  orgName: organisations.name,
  raisedBy: supportRequests.raisedBy,
  raisedByName: author.fullName,
  subject: supportRequests.subject,
  body: supportRequests.body,
  state: supportRequests.state,
  assigneeId: supportRequests.assigneeId,
  assigneeName: assignee.fullName,
  createdAt: supportRequests.createdAt,
  resolvedAt: supportRequests.resolvedAt,
};

/**
 * Every request, newest first.
 *
 * Newest rather than oldest-open-first: an operator opening this screen
 * is answering "what has come in", and the toolbar's state filter is
 * how they get to the backlog. A queue that opened on the oldest row
 * would bury a dispute raised this morning.
 */
export async function listSupportRequests(): Promise<SupportRequestRow[]> {
  return db
    .select(columns)
    .from(supportRequests)
    .leftJoin(organisations, eq(organisations.id, supportRequests.orgId))
    .leftJoin(author, eq(author.id, supportRequests.raisedBy))
    .leftJoin(assignee, eq(assignee.id, supportRequests.assigneeId))
    .orderBy(desc(supportRequests.createdAt));
}

/**
 * One agency's own requests, for the panel under its Contact Support
 * form — so nobody sends the same thing twice, and so an agency can see
 * that somebody picked it up.
 *
 * Scoped by `orgId` in the query rather than filtered after the fact:
 * this is the one read in the file an agency member can reach, and a
 * filter applied in the page would be one refactor away from leaking
 * another tenant's dispute.
 */
export async function listSupportRequestsForOrg(
  orgId: string
): Promise<SupportRequestRow[]> {
  return db
    .select(columns)
    .from(supportRequests)
    .leftJoin(organisations, eq(organisations.id, supportRequests.orgId))
    .leftJoin(author, eq(author.id, supportRequests.raisedBy))
    .leftJoin(assignee, eq(assignee.id, supportRequests.assigneeId))
    .where(eq(supportRequests.orgId, orgId))
    .orderBy(desc(supportRequests.createdAt));
}

/** How many are still waiting — the rail's badge. */
export async function openSupportCount(): Promise<number> {
  const rows = await db
    .select({ id: supportRequests.id })
    .from(supportRequests)
    .where(eq(supportRequests.state, "open"));
  return rows.length;
}

export type SupportError = "not_found" | "already_resolved";

/**
 * Put a name on a request, or take it off.
 *
 * A label rather than a lock, exactly as on the demo queue: anyone may
 * claim a row somebody else is on. Claiming is additive — it takes
 * nothing away from anyone — so it commits on the click with no dialog.
 */
export async function claimSupportRequest(
  id: string,
  assigneeId: string | null
): Promise<SupportError | null> {
  const [row] = await db
    .select({ state: supportRequests.state })
    .from(supportRequests)
    .where(eq(supportRequests.id, id));
  if (!row) return "not_found";

  await db
    .update(supportRequests)
    .set({ assigneeId, state: assigneeId ? "claimed" : "open" })
    .where(and(eq(supportRequests.id, id), eq(supportRequests.state, row.state)));
  return null;
}

/**
 * Close a request.
 *
 * Stamps `resolved_at` rather than deleting anything: a resolved
 * dispute is the record of what happened, which is most of the row's
 * value. Reopening is `claimSupportRequest`, which is why resolving
 * does not clear the assignee.
 */
export async function resolveSupportRequest(id: string): Promise<SupportError | null> {
  const [row] = await db
    .select({ state: supportRequests.state })
    .from(supportRequests)
    .where(eq(supportRequests.id, id));
  if (!row) return "not_found";
  if (row.state === "resolved") return "already_resolved";

  await db
    .update(supportRequests)
    .set({ state: "resolved", resolvedAt: new Date() })
    .where(eq(supportRequests.id, id));
  return null;
}

/** An agency asking for help. Returns the new row's id. */
export async function raiseSupportRequest(input: {
  orgId: string;
  raisedBy: string;
  subject: string;
  body: string;
}): Promise<string> {
  const [row] = await db
    .insert(supportRequests)
    .values(input)
    .returning({ id: supportRequests.id });
  return row.id;
}

/** Oldest open first, for anything that needs the backlog in order. */
export async function listOpenSupportRequests(): Promise<SupportRequestRow[]> {
  return db
    .select(columns)
    .from(supportRequests)
    .leftJoin(organisations, eq(organisations.id, supportRequests.orgId))
    .leftJoin(author, eq(author.id, supportRequests.raisedBy))
    .leftJoin(assignee, eq(assignee.id, supportRequests.assigneeId))
    .where(eq(supportRequests.state, "open"))
    .orderBy(asc(supportRequests.createdAt));
}

/** One request on its own, for the screen that shows its thread. */
export async function getSupportRequest(id: string): Promise<SupportRequestRow | null> {
  const [row] = await db
    .select(columns)
    .from(supportRequests)
    .leftJoin(organisations, eq(organisations.id, supportRequests.orgId))
    .leftJoin(author, eq(author.id, supportRequests.raisedBy))
    .leftJoin(assignee, eq(assignee.id, supportRequests.assigneeId))
    .where(eq(supportRequests.id, id));
  return row ?? null;
}

export type SupportMessageRow = SupportMessage & { authorName: string | null };

/**
 * A thread, oldest first — the order a conversation is read in, and the
 * opposite of every queue in this console, which are worked newest
 * first.
 */
export async function listSupportMessages(
  requestId: string
): Promise<SupportMessageRow[]> {
  return db
    .select({
      id: supportMessages.id,
      requestId: supportMessages.requestId,
      authorId: supportMessages.authorId,
      authorName: author.fullName,
      fromStaff: supportMessages.fromStaff,
      body: supportMessages.body,
      createdAt: supportMessages.createdAt,
    })
    .from(supportMessages)
    .leftJoin(author, eq(author.id, supportMessages.authorId))
    .where(eq(supportMessages.requestId, requestId))
    .orderBy(asc(supportMessages.createdAt));
}

/**
 * Add to a thread.
 *
 * A staff reply moves an open request to `claimed` and puts the
 * replier's name on it when nobody had it: answering somebody is
 * taking the request, and leaving it in the queue as unclaimed after
 * you have written to the agency invites a colleague to answer it
 * twice. It never moves a request that is already claimed — that would
 * take a row off the person holding it.
 */
export async function postSupportMessage(input: {
  requestId: string;
  authorId: string;
  fromStaff: boolean;
  body: string;
}): Promise<SupportMessage> {
  const [row] = await db.insert(supportMessages).values(input).returning();

  if (input.fromStaff) {
    await db
      .update(supportRequests)
      .set({ state: "claimed", assigneeId: input.authorId })
      .where(and(eq(supportRequests.id, input.requestId), eq(supportRequests.state, "open")));
  }

  return row;
}
