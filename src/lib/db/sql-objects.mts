import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

/**
 * Applies the functions, triggers and views that Drizzle Kit does not
 * model. Runs as the second half of `npm run db:migrate`, so a plain
 * migrate leaves a complete database rather than one missing the
 * completion function every persona reads.
 */
const here = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env.local.");
}

const pool = new Pool({ connectionString });

try {
  await pool.query(readFileSync(join(here, "sql-objects.sql"), "utf8"));
  console.log("Applied functions, triggers and views.");
} finally {
  await pool.end();
}
