/**
 * Opens the database connection before any test needs it.
 *
 * The database-backed suites do not fail evenly. In `travel-records`,
 * run alone on a quiet machine, the first test takes 11,375ms and the
 * other seven take between 17 and 87ms — and the 11 seconds are not the
 * test, they are `pg` opening its first socket to a Postgres running in
 * a Docker VM. Whichever test is written first in a file pays for the
 * whole file, so a file goes red at its top and green everywhere else,
 * the red moves when the file order changes, and the whole thing reads
 * as a flaky suite rather than as one fixed cost in the wrong place.
 *
 * Warming here puts that cost in setup, where the budget is the hook
 * timeout and where it belongs: it is the cost of having a database at
 * all, not the cost of any assertion.
 *
 * It warms the pool the tests actually use rather than a private one of
 * its own — `client.ts` caches on `globalThis`, so the connection this
 * opens is the connection they get, and the cost is paid once per worker
 * instead of once per pool.
 *
 * Deliberately not fatal. A checkout with no `DATABASE_URL`, or a
 * container that is down, is the case these suites already handle by
 * skipping themselves — turning it into a setup crash would replace a
 * clear skip with an obscure failure.
 */
if (process.env.DATABASE_URL) {
  try {
    const { db } = await import("@/lib/db/client");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`select 1`);
  } catch {
    // Down or unreachable. The suites that need it skip themselves.
  }
}
