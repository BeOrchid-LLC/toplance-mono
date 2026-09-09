import "server-only";

import { count, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { corridors, demoRequests, supportRequests } from "@/lib/db/schema";

/**
 * A demo enquiry somebody still has to do something about — the
 * complement of `converted` and `declined`, which are the two endings.
 *
 * Exported because `/ops/tenants` counts the same set for its "Open
 * enquiries" figure. The rail badge used to count `new` alone, so the
 * number beside "Agencies" disagreed with the card on the page it
 * opened, which is exactly the drift this module's docstring claims to
 * prevent.
 */
export const OPEN_DEMO_STATUSES = ["new", "contacted", "scheduled"] as const;

export type OpsCounts = {
  /** Corridors sitting in `pending` — a reviewer's to-do list. */
  pendingRoutes: number;
  /** Demo enquiries still open, worked from `/ops/tenants`. */
  openDemoRequests: number;
  /**
   * Support requests nobody has picked up.
   *
   * Open only, not open-plus-claimed: a claimed request has somebody on
   * it, and a badge that keeps counting it would ask the whole team to
   * look at work that is already being done.
   */
  openSupport: number;
};

/**
 * The three figures the platform rail's badges carry.
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
  const [[routes], [demos], [support]] = await Promise.all([
    db
      .select({ n: count() })
      .from(corridors)
      .where(eq(corridors.reviewState, "pending")),
    db
      .select({ n: count() })
      .from(demoRequests)
      .where(inArray(demoRequests.status, [...OPEN_DEMO_STATUSES])),
    db
      .select({ n: count() })
      .from(supportRequests)
      .where(eq(supportRequests.state, "open")),
  ]);

  return {
    pendingRoutes: routes?.n ?? 0,
    openDemoRequests: demos?.n ?? 0,
    openSupport: support?.n ?? 0,
  };
}
