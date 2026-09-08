import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Applies the pending migrations, and fails loudly when one does not.
 *
 * This replaces `drizzle-kit migrate` in `npm run db:migrate`, for one
 * reason: drizzle-kit swallowed a failing migration and exited 0. On
 * 2026-09-07 it reported "applying migrations…" and success while
 * applying nothing at all, against an empty database — which in CI is a
 * green deploy onto a schema that was never created.
 *
 * The programmatic migrator throws, and the message names the statement
 * and the Postgres error under it. Both are printed here, because the
 * outer message alone says only which query failed and not why.
 *
 * Everything else is unchanged: the same `drizzle/` folder, the same
 * journal, the same `drizzle.__drizzle_migrations` bookkeeping. Note
 * that it runs every pending migration in ONE transaction — so a
 * migration may not use an enum value that an earlier pending migration
 * added. Splitting them across files does not change that; see the
 * `platform_invite_has_no_org` comment in `schema.ts`.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env.local.");
}

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "../../../drizzle");
const pool = new Pool({ connectionString });

try {
  await migrate(drizzle(pool), { migrationsFolder });
  console.log("Migrations applied.");
} catch (error) {
  const failure = error as Error & { cause?: Error };
  console.error(failure.message);
  if (failure.cause) console.error(`Cause: ${failure.cause.message}`);
  // Non-zero, so a deploy stops here rather than continuing onto a
  // schema that was rolled back.
  process.exitCode = 1;
} finally {
  await pool.end();
}
