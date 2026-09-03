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

  // Reference data — but only into an empty corridors table. The
  // requirements engine reads corridors from the database, so a
  // migrated-but-unseeded environment fails every corridor lookup while
  // looking healthy from outside; that state should not be reachable
  // from a deploy. It is guarded because seed.sql replaces the
  // reference tables wholesale and each run issues new corridor ids,
  // detaching the checklist of every application pointing at the old
  // ones — so reseeding a populated environment stays a deliberate,
  // planned operation (`npm run db:seed`), never a deploy side effect.
  const seedSql = [
    join(here, "seed.sql"),
    join(root, "src", "lib", "db", "seed.sql"),
  ].find(existsSync);
  if (seedSql) {
    const {
      rows: [{ count }],
    } = await client.query(`SELECT count(*)::int AS count FROM corridors`);
    if (count === 0) {
      await client.query(readFileSync(seedSql, "utf8"));
      console.log("Corridors table was empty — seeded reference data.");
    } else {
      console.log(`Reference data present (${count} corridors) — seed skipped.`);
    }
  }

  /**
   * Corridors drafted through the review gate.
   *
   * Applied on **every** deploy, unlike the seed above, because this
   * file is additive by construction: each insert is `on conflict do
   * nothing` on the corridor's natural key, so it adds what is missing
   * and touches nothing that exists. Re-running it over an environment
   * where somebody has approved drafts leaves their decisions alone —
   * which is the property that lets it be a deploy step at all.
   *
   * Deliberately after the seed. On an empty database the seed writes
   * its four corridors first and this file skips those four on
   * conflict; on a populated one the seed is skipped and this fills the
   * gaps. Both paths land on the same set.
   *
   * Corridors are data, so without this they only ever exist wherever
   * someone happened to draft them.
   */
  const corridorsSql = [
    join(here, "corridors.sql"),
    join(root, "src", "lib", "db", "corridors.sql"),
  ].find(existsSync);
  if (corridorsSql) {
    const before = await client.query(`SELECT count(*)::int AS count FROM corridors`);
    await client.query(readFileSync(corridorsSql, "utf8"));
    const after = await client.query(`SELECT count(*)::int AS count FROM corridors`);
    const added = after.rows[0].count - before.rows[0].count;
    console.log(
      added === 0
        ? `Corridors up to date (${after.rows[0].count} present).`
        : `Added ${added} corridors — ${after.rows[0].count} present.`
    );
  }
} finally {
  await client.end();
}
