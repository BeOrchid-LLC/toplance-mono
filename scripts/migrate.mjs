import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

/**
 * Applies pending Drizzle migrations and then the SQL objects, using
 * only `pg` — the one database package the standalone build keeps as a
 * real module. Exists so the deployed image can migrate its own
 * database from Coolify's post-deployment command; drizzle-kit is a dev
 * dependency and never ships.
 *
 * Bookkeeping is write-compatible with drizzle-kit's: same
 * drizzle.__drizzle_migrations table, hash = sha256 of the file, and
 * created_at = the journal's `when`, so local `npm run db:migrate` and
 * this script can be used interchangeably against the same database.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await client.query(
    `CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`
  );

  const { rows } = await client.query(
    `SELECT created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1`
  );
  const lastApplied = rows[0] ? Number(rows[0].created_at) : 0;

  const journal = JSON.parse(
    readFileSync(join(root, "drizzle", "meta", "_journal.json"), "utf8")
  );

  let applied = 0;
  for (const entry of journal.entries) {
    if (entry.when <= lastApplied) continue;

    const sql = readFileSync(join(root, "drizzle", `${entry.tag}.sql`), "utf8");
    const statements = sql.split("--> statement-breakpoint");

    await client.query("BEGIN");
    try {
      for (const statement of statements) {
        if (statement.trim()) await client.query(statement);
      }
      await client.query(
        `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
        [createHash("sha256").update(sql).digest("hex"), entry.when]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${entry.tag} failed: ${error.message}`);
    }
    applied += 1;
    console.log(`Applied ${entry.tag}`);
  }

  if (applied === 0) console.log("No pending migrations.");

  // Functions, triggers and views are idempotent, applied on every run
  // — same as `npm run db:migrate`. The image copies the file next to
  // this script; in the repo it lives with the schema.
  const sqlObjects = [
    join(here, "sql-objects.sql"),
    join(root, "src", "lib", "db", "sql-objects.sql"),
  ].find(existsSync);
  await client.query(readFileSync(sqlObjects, "utf8"));
  console.log("Applied functions, triggers and views.");
} finally {
  await client.end();
}
