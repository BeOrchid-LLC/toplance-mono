import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

/**
 * Applies `corridors.sql` to whatever `DATABASE_URL` points at.
 *
 * Separate from `db:seed` on purpose. Seeding replaces the reference
 * tables wholesale — right for a fresh laptop, wrong for an environment
 * where people review drafts, because it would erase their decisions.
 * This one only ever adds.
 */
const here = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env.local.");
}

const pool = new Pool({ connectionString });

try {
  const before = await pool.query<{ n: string }>("select count(*) as n from corridors");
  await pool.query(readFileSync(join(here, "corridors.sql"), "utf8"));
  const after = await pool.query<{ n: string }>("select count(*) as n from corridors");

  const added = Number(after.rows[0].n) - Number(before.rows[0].n);
  console.log(
    added === 0
      ? `No new corridors — all ${after.rows[0].n} were already present.`
      : `Added ${added} corridors. The database now holds ${after.rows[0].n}.`
  );
} finally {
  await pool.end();
}
