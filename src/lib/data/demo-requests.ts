import "server-only";

import { desc, eq } from "drizzle-orm";

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
 * Move one enquiry along the queue.
 *
 * Cannot write `converted`: that value has a second half —
 * `converted_org_id` — which only `provisionTenantTx` can write, in the
 * same transaction that creates the agency it points at. A row claiming
 * it became an agency it cannot name is worse than no status at all, so
 * the type excludes `converted` and the body refuses it again at
 * runtime, since a caller (a Server Action parsing a POST body) can hand
 * this a value the type system never saw.
 */
export async function setDemoRequestStatus(
  id: string,
  status: Exclude<DemoRequestStatus, "converted">
): Promise<{ ok: true } | { error: string }> {
  if ((status as DemoRequestStatus) === "converted") {
    return {
      error:
        "Conversion is recorded when the agency is created, not set as a status.",
    };
  }

  const updated = await db
    .update(demoRequests)
    .set({ status })
    .where(eq(demoRequests.id, id))
    .returning({ id: demoRequests.id });

  if (!updated.length) return { error: "We could not find that demo request." };

  return { ok: true };
}
