import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { databaseBackedTests } from "./vitest.db-tests.mts";

/**
 * `server-only` throws unless it is resolved under React's "react-server"
 * condition, which Vitest does not set. The package ships an empty module
 * for exactly that condition, but its `exports` map hides it from a
 * subpath import — so point at the file directly rather than adding
 * "react-server" to the global conditions, which would change how React
 * itself resolves.
 */
const serverOnlyStub = fileURLToPath(
  new URL("./node_modules/server-only/empty.js", import.meta.url)
);

/**
 * `next/root-params` ships a module that throws — the compiler is meant
 * to replace it, and Vitest does not compile. See the stub for why it
 * answers `undefined` rather than a plausible locale.
 */
const rootParamsStub = fileURLToPath(
  new URL("./vitest.root-params.mts", import.meta.url)
);

const DB_TESTS = databaseBackedTests();

const shared = {
  environment: "node" as const,
  setupFiles: ["./vitest.setup.mts"],

  /**
   * A cold `pg` pool has to be reachable before the first test in a file
   * can assert anything, and that connect is the slowest thing any of
   * these files does — measured at 8 to 12 seconds on a machine under
   * memory pressure, against 1.4ms for a query once the pool is warm.
   * Vitest's 5s default therefore failed whichever test happened to be
   * first in its file and passed every one after it, which is why the
   * reds moved between runs and read as a flaky machine.
   *
   * These ceilings are that worst measured connect with room, not a
   * licence for a slow test: nothing here takes more than about 100ms
   * warm, so a test that actually reaches this limit has a fault of its
   * own rather than a cold socket.
   */
  testTimeout: 20_000,
  hookTimeout: 30_000,
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": serverOnlyStub,
      "next/root-params": rootParamsStub,
    },
  },
  test: {
    /**
     * How many files may be in flight at once. Runner-level rather than
     * per-project — the pool is the runner's, and both projects draw
     * their workers from it.
     *
     * Vitest's default is one fork per CPU less one, 13 here, and each
     * fork is a process holding the whole module graph. Thirteen of them
     * beside a dev server put this machine into swap: 8.7GB of a 10GB
     * swap file in use, 60MB of RAM free, and Postgres answering a cold
     * connect in 8 to 12 seconds against 1.4ms warm.
     *
     * Four is not a tuning result; it is where the suite stops competing
     * with itself. Raise it with VITEST_MAX_WORKERS given the memory.
     *
     * `maxWorkers`, not `poolOptions.forks.maxForks` — Vitest 4 removed
     * the latter, and it fails as a type error rather than being
     * ignored, which is the good outcome.
     */
    maxWorkers: Number(process.env.VITEST_MAX_WORKERS) || 4,

    /**
     * Two projects, because the suite has two kinds of test in it and
     * they want opposite things.
     *
     * `npm test` failed 18 tests on one run of this machine, 81 on the
     * next and 36 on a third, every failure a timeout in a
     * database-backed file with no error of its own, moving between runs
     * with Postgres otherwise idle. It was recorded as a flaky machine
     * in a handoff and in a commit message. It is two measurable causes
     * and one that genuinely is the machine:
     *
     * 1. Connections. Vitest's fork pool takes one worker per CPU less
     *    one — 13 here — each a process with its own `pg` Pool whose
     *    default `max` is 10, against `max_connections` of 100. That is
     *    130, and `too many clients already` appeared 16 times in one
     *    run underneath 44 timeouts that hid it. `poolMax` in
     *    `src/lib/db/client.ts` is the fix; the fork cap below keeps the
     *    arithmetic comfortable.
     *
     * 2. Row locks. These suites take `SELECT … FOR UPDATE` on the same
     *    fixture rows in `applications` and `org_members`. Run
     *    concurrently they block each other; sampling `pg_stat_activity`
     *    mid-run caught the waits. Serialising the database project took
     *    the same files from 43 failures to 4 — which is what this
     *    split is for, and it is a correctness property rather than a
     *    tuning result: it holds on a fast machine too.
     *
     * 3. Memory. With 8.7GB of a 10GB swap file in use and 60MB of RAM
     *    free, a handful still time out however they are scheduled.
     *    Nothing in this file can fix that one, and it is the residual
     *    to check for before believing a red here.
     *
     * The pure project keeps its parallelism — 85 files that touch no
     * socket, and serialising those would cost minutes to fix a problem
     * they do not have.
     */
    projects: [
      {
        resolve: {
          tsconfigPaths: true,
          alias: {
            "server-only": serverOnlyStub,
            "next/root-params": rootParamsStub,
          },
        },
        test: {
          ...shared,
          name: "pure",
          include: ["src/**/*.test.ts"],
          exclude: DB_TESTS,
          /**
           * The two projects run in separate groups, and Vitest requires
           * that explicitly once their worker counts differ — which they
           * do, because `fileParallelism: false` pins the database
           * project to one.
           *
           * Pure first: 85 files that touch no socket, so the fastest
           * feedback in the run arrives before anything waits on
           * Postgres.
           */
          sequence: { groupOrder: 0 },
        },
      },
      {
        resolve: {
          tsconfigPaths: true,
          alias: {
            "server-only": serverOnlyStub,
            "next/root-params": rootParamsStub,
          },
        },
        test: {
          ...shared,
          name: "db",
          include: DB_TESTS,
          // The second file opens the pool before the first test can be
          // charged for it — see the file itself for the measurement.
          setupFiles: ["./vitest.setup.mts", "./vitest.setup.db.mts"],
          /**
           * One file at a time. See cause 2 above — these files share
           * fixture rows and lock them.
           */
          fileParallelism: false,

          /**
           * Isolation stays ON, and the cost of that is known and paid
           * deliberately.
           *
           * Each file gets a fresh module registry, so each file builds
           * its own `pg` Pool and pays the cold connect the setup file
           * describes — 48 times, which measured 192s of a 428s run.
           * Turning isolation off shares one pool across the project and
           * takes the run to 258s.
           *
           * It also breaks seven tests. `billing/actions.test.ts` failed
           * on assertions rather than timeouts the moment the registry
           * was shared: these suites mock modules, and mocks outlive a
           * file that no longer gets its own graph. Trading seven false
           * reds for 170 seconds is the wrong way round — a suite that
           * lies is worth less than a suite that is slow, and this one
           * has already cost days by lying in the other direction.
           */

          /** Second group — see the pure project for why the order is stated. */
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
