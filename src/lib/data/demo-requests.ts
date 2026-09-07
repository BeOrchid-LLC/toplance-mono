import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { demoRequests, organisations, type DemoRequestStatus } from "@/lib/db/schema";

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
  createdAt: Date;
};

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
      createdAt: demoRequests.createdAt,
    })
    .from(demoRequests)
    .leftJoin(organisations, eq(organisations.id, demoRequests.convertedOrgId))
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
