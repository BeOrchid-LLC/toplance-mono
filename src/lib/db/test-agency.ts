import "server-only";

import { db } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";

/**
 * A stable agency for a test fixture that needs one.
 *
 * Since the v1.3 tenancy every case belongs to exactly one agency —
 * `applications.org_id` is `not null` — so any fixture that inserts an
 * application has to insert an agency first. Twenty test files needed
 * the same three lines, which is what this exists to stop.
 *
 * Give each suite its own fixed `id`, so two files running against the
 * same database cannot delete each other's agency out from under a case.
 * `onConflictDoNothing` makes it idempotent across a `beforeEach` that
 * runs per test.
 *
 * Deliberately not cleaned up. `applications.org_id` is `restrict`, so a
 * delete has to be ordered after whatever cascade removes the cases, and
 * getting that ordering wrong in twenty suites buys nothing: the id is
 * fixed, so a suite reuses its one row every run rather than
 * accumulating them, and no test counts or lists organisations.
 */
export async function seedTestAgency(id: string, name = "Test agency"): Promise<string> {
  await db.insert(organisations).values({ id, name }).onConflictDoNothing();
  return id;
}
