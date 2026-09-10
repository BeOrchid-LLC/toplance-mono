import { Pool } from "pg";

import { FX_SOURCE, fetchLatestRates } from "../src/lib/fx/provider.ts";

/**
 * Fill `fx_rates` once, from the command line.
 *
 * The table is filled by a daily scheduled task hitting
 * `/api/cron/fx-rates`, which is deploy-time config — so on a developer's
 * machine, and on a staging environment nobody has wired a scheduler to,
 * it is simply empty. Every caller treats an empty table as "show no
 * converted figure", which is correct and which looks exactly like the
 * feature not existing. It cost a round of client feedback.
 *
 * Why this does not just call `refreshFxRates()`, which is the same
 * write: that module reaches the database through `@/lib/db/client`, and
 * a path alias does not resolve under `--experimental-strip-types`.
 * Every other script here talks to Postgres through `pg` for the same
 * reason. The *provider* is imported rather than re-implemented, so the
 * request and the source name have one definition — only the insert is
 * restated, and it is pinned by `fx_rates_pair` either way.
 *
 * `--conditions=react-server` is what lets that import work at all:
 * `provider.ts` opens with `server-only`, which resolves to a module
 * that throws under Node's default conditions.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL is set.");
  process.exit(1);
}

const latest = await fetchLatestRates();

if (!latest) {
  // One message where there were two. The provider needs no key, so
  // "nothing is configured" has stopped being a way this can fail.
  console.error("The rates provider did not answer. Nothing was written.");
  process.exit(1);
}

const fetchedAt = new Date();
const entries = Object.entries(latest.rates);

const pool = new Pool({ connectionString: url });
try {
  // One statement, for the reason `refreshFxRates` gives: a partial
  // refresh would leave the table quoting two different mornings.
  await pool.query(
    `insert into fx_rates (base, quote, rate, fetched_at, source)
     select * from unnest($1::text[], $2::text[], $3::text[], $4::timestamptz[], $5::text[])
     on conflict on constraint fx_rates_pair do update
       set rate = excluded.rate,
           fetched_at = excluded.fetched_at,
           source = excluded.source`,
    [
      entries.map(() => latest.base),
      entries.map(([quote]) => quote),
      // Fixed notation rather than `toString`, which switches to an
      // exponent for the very small rates and would store `1e-7` as text.
      entries.map(([, rate]) => rate.toFixed(10)),
      entries.map(() => fetchedAt),
      entries.map(() => FX_SOURCE),
    ]
  );
} finally {
  await pool.end();
}

console.log(`Wrote ${entries.length} rates against ${latest.base}.`);
