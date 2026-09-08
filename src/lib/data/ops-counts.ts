import "server-only";

import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { corridors, demoRequests } from "@/lib/db/schema";

export type OpsCounts = {
  /** Corridors sitting in `pending` — a reviewer's to-do list. */
  pendingRoutes: number;
  /** Demo enquiries still at `new`, worked from `/ops/tenants`. */
  newDemoRequests: number;
};

/**
 * The two figures the platform rail's badges carry.
 *
 * Its own query rather than counting rows a page already fetched,
 * because the pages showing the rail do not all fetch them: the corridor
 * list selects corridors anyway, but `/ops/staff` has no reason to and
 * would have to pass zeroes — so the same rail would show badges on one
 * screen and none on the next, and somebody reading the colleagues page
 * could not see that four routes had arrived while they were there.
 *
 * Both counts are things a person then does something about. The rail
 * deliberately carries no badge for the number of agencies: that is a
 * fact about the platform rather than a queue, and a badge on every row
 * is decoration that stops being read.
 *
 * The agency console's own badges are not here — `countOrgClients` and
 * `listInvitations` already answer those, scoped to one organisation,
 * and a second counter beside them would be the drift this module
 * exists to prevent.
 */
export async function getOpsCounts(): Promise<OpsCounts> {
  const [[routes], [demos]] = await Promise.all([
    db
      .select({ n: count() })
      .from(corridors)
      .where(eq(corridors.reviewState, "pending")),
    db
      .select({ n: count() })
      .from(demoRequests)
      .where(eq(demoRequests.status, "new")),
  ]);

  return {
    pendingRoutes: routes?.n ?? 0,
    newDemoRequests: demos?.n ?? 0,
  };
}
