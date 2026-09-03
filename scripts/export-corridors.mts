import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

/**
 * Local corridors → a SQL file another environment can apply.
 *
 * Corridors are data, not code, so `git push` moves the engine and
 * leaves the rows behind. This is how the rows travel.
 *
 * Two properties matter more than the format:
 *
 * - **Non-destructive.** `seed.sql` replaces the reference tables
 *   wholesale, which is right for a fresh laptop and wrong for staging:
 *   staging is where drafts get *reviewed*, and re-running a destructive
 *   seed there would erase somebody's approvals without saying so. Every
 *   insert here is `on conflict do nothing` on the corridor's natural
 *   key, so a second run over a reviewed database changes nothing.
 * - **Review state is carried, not reset.** A draft arrives pending and
 *   dark, exactly as it sits here. Nothing crosses the approval gate by
 *   being exported.
 */
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "lib", "db", "corridors.sql");
const manifest = join(here, "..", "src", "lib", "db", "corridors.live.json");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env.local.");
}

/**
 * A calendar date literal.
 *
 * `pg` parses a `date` column into a Date at **local** midnight, so
 * `toISOString()` rolls it back a day for anyone east of UTC — the
 * export would quietly shift every `effective_from` by one. Read the
 * local components instead, which is what pg put there.
 */
const dateLit = (d: Date | string): string => {
  if (typeof d === "string") return `date '${d}'`;
  const p = (n: number) => String(n).padStart(2, "0");
  return `date '${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}'`;
};

/** A SQL literal, or `null`. Postgres escapes a quote by doubling it. */
const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return `timestamptz '${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const pool = new Pool({ connectionString });

try {
  const { rows: corridors } = await pool.query(
    `select * from corridors
     order by destination_iso, purpose, version`
  );
  const { rows: requirements } = await pool.query(
    `select * from corridor_requirements order by corridor_id, sort_order`
  );

  const byCorridor = new Map<string, typeof requirements>();
  for (const r of requirements) {
    const list = byCorridor.get(r.corridor_id) ?? [];
    list.push(r);
    byCorridor.set(r.corridor_id, list);
  }

  const blocks = corridors.map((c) => {
    const reqs = byCorridor.get(c.id) ?? [];
    const state = c.is_live ? "live" : c.review_state;

    /**
     * `approved_by` is an FK to `profiles`, and an approver who exists
     * on this laptop need not exist on the target. A subquery yields
     * null when they are absent, so the row imports either way and the
     * attribution survives wherever the same person does.
     */
    const approver =
      c.approved_by === null
        ? "null"
        : `(select id from profiles where id = ${lit(c.approved_by)})`;

    const values = [
      lit(c.nationality_iso), lit(c.destination_iso), lit(c.purpose),
      lit(c.visa_name), lit(c.version), dateLit(c.effective_from),
      lit(c.source_name), lit(c.source_url),
      lit(c.processing_weeks_min), lit(c.processing_weeks_max),
      lit(c.government_fee_minor === null ? null : Number(c.government_fee_minor)),
      lit(c.government_fee_currency),
      lit(c.is_live), lit(c.last_verified_at), lit(c.review_state),
      approver, lit(c.approved_at), lit(c.reject_reason), lit(c.source_hash),
    ].join(", ");

    const head =
      `-- ---------- ${c.destination_iso.toUpperCase()} · ${c.purpose} · v${c.version} · ${state} ----------\n` +
      `with c as (\n` +
      `  insert into corridors (\n` +
      `    nationality_iso, destination_iso, purpose, visa_name, version, effective_from,\n` +
      `    source_name, source_url, processing_weeks_min, processing_weeks_max,\n` +
      `    government_fee_minor, government_fee_currency,\n` +
      `    is_live, last_verified_at, review_state, approved_by, approved_at,\n` +
      `    reject_reason, source_hash\n` +
      `  )\n` +
      `  values (${values})\n` +
      `  on conflict on constraint corridors_corridor_version_key do nothing\n` +
      `  returning id\n` +
      `)\n`;

    // No requirements is a real state — a corridor drafted from a page
    // that listed none. Insert the corridor alone rather than emitting
    // a `values ()` Postgres will reject.
    if (reqs.length === 0) return `${head}select 1 from c;`;

    const rows = reqs
      .map(
        (r) =>
          `  (${[lit(r.doc_key), lit(r.name), lit(r.description), lit(r.category),
                lit(r.is_required), lit(r.sort_order), lit(r.source_url)].join(", ")})`
      )
      .join(",\n");

    return (
      `${head}` +
      `insert into corridor_requirements\n` +
      `  (corridor_id, doc_key, name, description, category, is_required, sort_order, source_url)\n` +
      `select c.id, v.doc_key, v.name, v.description, v.category, v.is_required, v.sort_order, v.source_url\n` +
      `from c, (values\n${rows}\n` +
      `) as v(doc_key, name, description, category, is_required, sort_order, source_url);`
    );
  });

  const live = corridors.filter((c) => c.is_live).length;
  const header = [
    "-- ============================================================",
    "-- TOPLANCE — corridors, exported from a working database.",
    "--",
    "-- Generated by `npm run corridors:export`. Do not hand-edit: draft",
    "-- with `npm run corridor:draft`, review, then re-export.",
    "--",
    `-- ${corridors.length} corridors (${live} live, ${corridors.length - live} in review)`,
    `-- ${requirements.length} requirements`,
    "--",
    "-- Safe to re-run: every insert is `on conflict do nothing` on the",
    "-- corridor's natural key, so applying this over a database where",
    "-- someone has already reviewed drafts leaves their decisions alone.",
    "-- It adds corridors; it never edits or removes one.",
    "-- ============================================================",
    "",
  ].join("\n");

  writeFileSync(out, `${header}\n${blocks.join("\n\n")}\n`);

  /**
   * The live set, machine-readable.
   *
   * `LIVE_CORRIDORS` in `@/lib/domain/corridors` is the shop window —
   * the board, the landing count, the dead-end copy — and it drifting
   * from what the database serves is the bug that once advertised
   * Canada, took a traveller through eleven questions and then said we
   * do not cover Canada. Its test used to read `seed.sql`, which stopped
   * being the whole story the moment corridors were drafted rather than
   * hand-written. Emitting the set here means the test compares against
   * what actually shipped, and a regex over SQL cannot match nothing.
   */
  writeFileSync(
    manifest,
    `${JSON.stringify(
      corridors
        .filter((c) => c.is_live)
        .map((c) => ({
          nationalityIso: c.nationality_iso,
          destinationIso: c.destination_iso,
          purpose: c.purpose,
        }))
        .sort((a, b) =>
          `${a.destinationIso}${a.purpose}`.localeCompare(
            `${b.destinationIso}${b.purpose}`
          )
        ),
      null,
      2
    )}\n`
  );
  console.log(
    `Wrote ${corridors.length} corridors (${live} live) and ` +
      `${requirements.length} requirements to src/lib/db/corridors.sql`
  );
} finally {
  await pool.end();
}
