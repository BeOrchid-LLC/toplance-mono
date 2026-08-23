import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

/**
 * Reference data, not fixtures: the corridors are what the requirements
 * engine reads to build a traveller's checklist, so an empty database
 * gives every traveller an empty list. Safe to re-run — seed.sql clears
 * the reference tables before rewriting them.
 */
const here = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env.local.");
}

const pool = new Pool({ connectionString });

try {
  await pool.query(readFileSync(join(here, "seed.sql"), "utf8"));
  console.log("Seeded corridors, requirements and the demo organisation.");
} finally {
  await pool.end();
}
