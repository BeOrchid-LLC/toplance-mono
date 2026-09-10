import "server-only";

import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { analyticsEvents, corridors } from "@/lib/db/schema";
import {
  rankRequestedRoutes,
  routeKey,
  type RequestedRoute,
} from "@/lib/domain/corridor-demand";

/**
 * What travellers asked for and nobody built, for the ops console.
 *
 * The wiring only. The ranking, the two recorded shapes and the
 * exclusion rule are all in `@/lib/domain/corridor-demand`, tested
 * without a database.
 *
 * Like every other module under `src/lib/data`, this decides no access.
 * Its caller guards first — and on the dashboard that guard is `owner`.
 */

/** How many routes the panels show. Six, like the demand lists beside them. */
export const REQUESTED_ROUTES_LIMIT = 6;

export type RequestedRoutes = {
  /** The busiest few, for the panel. */
  routes: RequestedRoute[];
  /**
   * Every distinct unbuilt route, for the counter beside it.
   *
   * Separate from `routes.length` on purpose. The counter used to read
   * that, which pegged it at the display limit: a console reporting "6"
   * whether six routes were missing or sixty. Two numbers because the
   * screen genuinely asks two questions — what should we build first,
   * and how much is there.
   */
  total: number;
};

/**
 * The most-requested routes with no live corridor behind them.
 *
 * Deliberately all-time, unlike the dashboard's usage panel and its
 * 30-day window. That window answers "what is happening now"; this list
 * answers "what should we build next", and a route somebody asked for
 * six weeks ago is exactly as unbuilt today as it was then. Ageing it
 * out would quietly retire the demand for the corridors that take
 * longest to notice.
 *
 * Two reads rather than one join. Grouping the events in SQL keeps the
 * row count down to distinct props bags — the same reason
 * `dashboardData` aggregates this table rather than pulling it — while
 * the coverage read is the whole live set, unlimited on purpose: a
 * corridor missing from it is reported to a reviewer as a gap to go and
 * build, so there is no sample of it that would be safe.
 */
export async function requestedRoutes(
  limit: number = REQUESTED_ROUTES_LIMIT
): Promise<RequestedRoutes> {
  const [asked, live] = await Promise.all([
    db
      .select({ props: analyticsEvents.props, n: count() })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.name, "toplance.corridor_requested"))
      .groupBy(analyticsEvents.props),

    db
      .select({
        nationalityIso: corridors.nationalityIso,
        destinationIso: corridors.destinationIso,
        purpose: corridors.purpose,
      })
      .from(corridors)
      .where(eq(corridors.isLive, true)),
  ]);

  const liveKeys = new Set(
    live.map((row) =>
      routeKey(row.nationalityIso, row.destinationIso, row.purpose)
    )
  );

  // Ranked once, unlimited, then split. Ranking twice at two limits
  // would be two chances for the counter and the list to disagree about
  // the same set on the same screen.
  const ranked = rankRequestedRoutes(
    asked.map((row) => ({ props: row.props, count: row.n })),
    liveKeys,
    Number.POSITIVE_INFINITY
  );

  return { routes: ranked.slice(0, limit), total: ranked.length };
}
