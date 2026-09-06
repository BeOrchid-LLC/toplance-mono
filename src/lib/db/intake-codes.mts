import { Pool } from "pg";

import { normaliseAnswer } from "../domain/normalise-answer.ts";

/**
 * Fill `intake_answers.code` for every row, using the same function the
 * write path uses.
 *
 * A script rather than SQL inside the migration, because the chip tables
 * live in `INTAKE_QUESTIONS` and a copy of them in a migration goes
 * stale the first time a chip is reworded. Idempotent and safe to
 * re-run: it recomputes every row, so it also repairs codes after a chip
 * value changes.
 *
 * A null result is left null. That is the honest state — the answer
 * matches no chip in any of the ten languages, so no rule naming that
 * topic can be evaluated for this traveller, and the requirement stays
 * hedged rather than being hidden.
 *
 * Raw `pg` like the other scripts in this directory: they run outside
 * Next, so there is no module alias to resolve.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query<{
  id: string;
  question_key: string;
  value: string;
  code: string | null;
}>('select id, question_key, value, code from intake_answers');

let changed = 0;
let unmatched = 0;

for (const row of rows) {
  const code = normaliseAnswer(row.question_key, row.value);
  if (code === null) unmatched += 1;
  if (code === row.code) continue;

  await pool.query('update intake_answers set code = $1 where id = $2', [code, row.id]);
  changed += 1;
}

console.log(
  `intake codes: ${rows.length} answers, ${changed} updated, ${unmatched} left unmatched (they keep the hedge)`
);

await pool.end();
