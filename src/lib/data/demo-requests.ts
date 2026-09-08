import "server-only";

import { and, asc, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db/client";
import {
  demoRequests,
  organisations,
  profiles,
  type DemoRequestStatus,
} from "@/lib/db/schema";

/**
 * The assignee joined by an alias. `profiles` is not otherwise in this
 * query, but naming it explicitly keeps the join readable beside
 * `organisations` and leaves room for a second profile join later.
 */
const assignee = alias(profiles, "assignee");

/**
 * The demo queue, as the platform console reads it.
 *
 * A row here is a stranger — `demo_requests` references nothing about a
 * person and never will. `convertedOrgName` is the one thing joined in,
 * because "became Kite Travel" is the only fact about an enquiry that
 * lives outside this table.
 *
 * Conversion is not written here. It happens inside `provisionTenantTx`
 * (`@/lib/data/tenants`), which has to stamp this row in the same
 * transaction that creates the agency it points at.
 */
export type DemoRequestRow = {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  preferredAt: Date;
  preferredTz: string;
  locale: string;
  status: DemoRequestStatus;
  convertedOrgId: string | null;
  convertedOrgName: string | null;
  /**
   * Who is working this enquiry, and their name for the column that
   * shows it. Both `null` for an unassigned row, which is the normal
   * state of a new enquiry rather than a defect.
   */
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: Date;
};

/** One member of platform staff, as the assignee picker needs them. */
export type PlatformStaff = {
  id: string;
  fullName: string;
  email: string;
};

/**
 * Everyone who works at BeOrchid, for the picker on the enquiry queue.
 *
 * The first roster of actual staff in the product — `/ops/staff` lists
 * *invitations*, which is a different set: it excludes the founding
 * accounts made by hand in SQL before that screen existed, and includes
 * people who were asked and never accepted.
 *
 * Ordered by name because it is read as a list of people, and a picker
 * ordered by an opaque Clerk id is a picker nobody can scan.
 */
export async function listPlatformStaff(): Promise<PlatformStaff[]> {
  return db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(profiles)
    .where(eq(profiles.role, "staff"))
    .orderBy(asc(profiles.fullName));
}

/** Newest first: the queue is worked from the top. */
export async function listDemoRequests(): Promise<DemoRequestRow[]> {
  return db
    .select({
      id: demoRequests.id,
      fullName: demoRequests.fullName,
      email: demoRequests.email,
      companyName: demoRequests.companyName,
      jobTitle: demoRequests.jobTitle,
      preferredAt: demoRequests.preferredAt,
      preferredTz: demoRequests.preferredTz,
      locale: demoRequests.locale,
      status: demoRequests.status,
      convertedOrgId: demoRequests.convertedOrgId,
      convertedOrgName: organisations.name,
      assigneeId: demoRequests.assigneeId,
      assigneeName: assignee.fullName,
      createdAt: demoRequests.createdAt,
    })
    .from(demoRequests)
    .leftJoin(organisations, eq(organisations.id, demoRequests.convertedOrgId))
    .leftJoin(assignee, eq(assignee.id, demoRequests.assigneeId))
    .orderBy(desc(demoRequests.createdAt));
}

/**
 * Why `setDemoRequestStatus` refused to write, as a stable code rather
 * than a sentence — `@/app/[locale]/ops/tenants/actions.ts` is the only
 * place that turns one into a string, the same split `TenantError`
 * (`@/lib/data/tenants`) uses.
 *
 * `already_converted` is deliberately its own code, not folded into
 * `not_found`: the operator is looking at a row that exists, so telling
 * them it does not would be a worse lie than the one this guards
 * against. The caller maps it to `OPS_ACTIONS.demoRequestAlreadyConverted`.
 */
export type DemoRequestStatusError = "not_found" | "already_converted" | "invalid_status";

/**
 * Move one enquiry along the queue.
 *
 * Cannot write `converted`: that value has a second half —
 * `converted_org_id` — which only `provisionTenantTx` can write, in the
 * same transaction that creates the agency it points at. A row claiming
 * it became an agency it cannot name is worse than no status at all, so
 * the type excludes `converted` and the body refuses it again at
 * runtime (`invalid_status`), since a caller (a Server Action parsing a
 * POST body) can hand this a value the type system never saw. In
 * practice `updateDemoRequestStatus` already filters `converted` out
 * before it ever calls this — this is defence against a second caller
 * that forgets to.
 *
 * Separately, and this is the fix: a row that is *already* `converted`
 * must also refuse every other status, or un-converting it re-arms
 * `provisionTenantTx`'s guard against provisioning the same enquiry
 * twice (`convertedOrgId` would still point at the first agency while
 * `status` claimed the enquiry was merely `contacted`). That check and
 * the write happen in one statement — `UPDATE ... WHERE id = $1 AND
 * status <> 'converted'` — rather than a `SELECT` followed by a
 * conditional `UPDATE`, so there is no gap between deciding the row is
 * still open and closing it: two concurrent calls against the same row
 * serialize on the row lock Postgres already takes for the `UPDATE`
 * itself, and whichever commits first is the one the second one's own
 * `status <> 'converted'` then fails to match.
 */
export async function setDemoRequestStatus(
  id: string,
  status: Exclude<DemoRequestStatus, "converted">
): Promise<{ ok: true } | { error: DemoRequestStatusError }> {
  if ((status as DemoRequestStatus) === "converted") {
    return { error: "invalid_status" };
  }

  const updated = await db
    .update(demoRequests)
    .set({ status })
    .where(and(eq(demoRequests.id, id), ne(demoRequests.status, "converted")))
    .returning({ id: demoRequests.id });

  if (updated.length) return { ok: true };

  // The write above touched nothing. `converted` is terminal — nothing
  // ever moves a row off it once it lands there — so this second,
  // unlocked read cannot be racing anyone: whichever of "gone" or
  // "already converted" it sees is the answer that was already final by
  // the time the UPDATE above missed.
  const [row] = await db
    .select({ status: demoRequests.status })
    .from(demoRequests)
    .where(eq(demoRequests.id, id))
    .limit(1);

  return { error: row?.status === "converted" ? "already_converted" : "not_found" };
}

/**
 * Why `setDemoRequestAssignee` refused, on the same terms as
 * `DemoRequestStatusError`: a code, turned into a sentence by the one
 * action that calls it.
 *
 * `not_staff` is its own code rather than folded into `not_found`,
 * because the row the caller named does exist — it is a person, just
 * not one who works here, and "we could not find that" would send an
 * operator looking for a typo that is not there.
 */
export type DemoRequestAssigneeError =
  | "not_found"
  | "already_converted"
  | "not_staff";

/**
 * Put a member of staff's name against an enquiry, or take it off.
 *
 * Assignment is a label and not a lock — anyone on the platform team may
 * set it, clear it, or move a row's status regardless of whose name is
 * on it. What it answers is "is anyone on this", for a queue two people
 * work at once; `status` says how far along an enquiry is and has never
 * said who has it.
 *
 * `null` clears it, and that is an ordinary operation: putting an
 * enquiry back in the pool is as normal as taking one out of it.
 *
 * Two guards, in this order:
 *
 * - the assignee must be `role = 'staff'`. The picker only ever offers
 *   staff, but it posts an id, and a hand-made POST must not be able to
 *   file BeOrchid's sales queue against a traveller — whose name would
 *   then be rendered on an ops screen they have no part in. Checked
 *   before the write rather than left to the foreign key, which only
 *   proves the profile exists.
 * - a `converted` enquiry refuses assignment, the same way it refuses a
 *   status change. It is an agency now; a name against it would be a
 *   name against work nobody is going to do. Folded into the `UPDATE`'s
 *   own `WHERE` for the reason `setDemoRequestStatus` gives — no gap
 *   between deciding the row is open and writing to it.
 */
export async function setDemoRequestAssignee(
  id: string,
  assigneeId: string | null
): Promise<{ ok: true } | { error: DemoRequestAssigneeError }> {
  if (assigneeId !== null) {
    const [staff] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.id, assigneeId), eq(profiles.role, "staff")))
      .limit(1);

    if (!staff) return { error: "not_staff" };
  }

  const updated = await db
    .update(demoRequests)
    .set({ assigneeId })
    .where(and(eq(demoRequests.id, id), ne(demoRequests.status, "converted")))
    .returning({ id: demoRequests.id });

  if (updated.length) return { ok: true };

  // `converted` is terminal, so this second unlocked read cannot be
  // racing anyone — see the same paragraph in `setDemoRequestStatus`.
  const [row] = await db
    .select({ status: demoRequests.status })
    .from(demoRequests)
    .where(eq(demoRequests.id, id))
    .limit(1);

  return { error: row?.status === "converted" ? "already_converted" : "not_found" };
}
