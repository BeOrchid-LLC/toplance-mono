import { parseArgs } from "node:util";

import { Pool } from "pg";

/**
 * Fill `toplance.corridor_requested` with plausible demand, so the
 * "asked for, not built" panels have something to show at a demo.
 *
 * Development tooling, not a fixture the product depends on. The panels
 * read the real event in production; this exists because that event is
 * empty on a fresh database, and an empty panel demonstrates nothing.
 *
 *   npm run corridors:seed-demand
 *   npm run corridors:seed-demand -- --clear
 *
 * Every row it writes carries `"seeded": true` in its props, and
 * `--clear` deletes exactly those. `analytics_events` is an append-only
 * record of things that really happened, so a tidy-up that matched on
 * the event name would take the product's own history with it — the
 * same trap the tests for this feature had to avoid.
 *
 * Uses `pg` directly rather than the app's Drizzle client, the same way
 * `draft-corridor.mts` does: `@/lib/db/client` is `server-only`, and
 * Node resolves neither that condition nor the `@/` alias.
 */

const { values } = parseArgs({
  options: {
    clear: { type: "boolean", default: false },
    /** Write to a database that is not on this machine. */
    force: { type: "boolean", default: false },
  },
});

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with --env-file-if-exists=.env.local.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demand data in production.");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
if (!isLocal && !values.force) {
  // Named rather than printed in full: a connection string carries a
  // password, and this line ends up in terminal scrollback and CI logs.
  console.error(
    `DATABASE_URL does not point at this machine. Re-run with --force if that is what you meant.`
  );
  process.exit(1);
}

/**
 * The demand to invent, as (nationality, destination, purpose, weight).
 *
 * Weighted the way the database's own `nationality_unserved` rows lean —
 * Ghana far ahead, then Kenya and Cameroon — because the point of a demo
 * is to show the shape of a real decision, and a flat list of ones shows
 * a reviewer nothing to prioritise.
 *
 * The last two are deliberately free text. `intake.ts` emits this event
 * from two branches, and an answer no country list maps ("Senegal")
 * records the traveller's own words rather than a code. Seeding only the
 * tidy shape would leave the messier half of the feature undemonstrated
 * and untested by hand.
 */
const DEMAND: {
  nationality: string;
  destination: string;
  purpose: string;
  weight: number;
  typed?: boolean;
}[] = [
  { nationality: "gh", destination: "gb", purpose: "work", weight: 34 },
  { nationality: "gh", destination: "ca", purpose: "study", weight: 27 },
  { nationality: "ke", destination: "gb", purpose: "work", weight: 22 },
  { nationality: "gh", destination: "us", purpose: "study", weight: 18 },
  { nationality: "cm", destination: "fr", purpose: "study", weight: 15 },
  { nationality: "ke", destination: "ae", purpose: "work", weight: 12 },
  { nationality: "za", destination: "de", purpose: "business", weight: 9 },
  { nationality: "cm", destination: "ca", purpose: "relocation", weight: 7 },
  { nationality: "ke", destination: "au", purpose: "study", weight: 5 },
  { nationality: "Senegal", destination: "Canada", purpose: "Work", weight: 11, typed: true },
  { nationality: "Uganda", destination: "United Kingdom", purpose: "Study", weight: 6, typed: true },
];

const pool = new Pool({ connectionString: url });

try {
  const cleared = await pool.query(
    `delete from analytics_events
      where name = 'toplance.corridor_requested'
        and props ->> 'seeded' = 'true'`
  );

  if (values.clear) {
    console.log(`Cleared ${cleared.rowCount} seeded request(s). Nothing written.`);
    process.exit(0);
  }

  if (cleared.rowCount) {
    console.log(`Cleared ${cleared.rowCount} request(s) from an earlier run.`);
  }

  // Read live coverage rather than assuming it. A seeded route that has
  // since been curated is correctly hidden by the panel, and a demo that
  // silently drops half its rows looks like a bug in the feature.
  const live = await pool.query<{ key: string }>(
    `select lower(nationality_iso || '|' || destination_iso || '|' || purpose) as key
       from corridors where is_live`
  );
  const liveKeys = new Set(live.rows.map((r) => r.key));

  const rows: { props: Record<string, unknown> }[] = [];
  const skipped: string[] = [];

  for (const route of DEMAND) {
    // Matches `routeKey` in `@/lib/domain/corridor-demand`. Free-text
    // entries are normalised by the app, not here, so they are checked
    // on what was typed and simply never match a live corridor.
    const key = [route.nationality, route.destination, route.purpose]
      .map((p) => p.trim().toLowerCase())
      .join("|");

    if (liveKeys.has(key)) {
      skipped.push(key);
      continue;
    }

    const props = route.typed
      ? {
          nationality: route.nationality,
          destination: route.destination,
          purpose: route.purpose,
        }
      : {
          nationalityIso: route.nationality,
          destinationIso: route.destination,
          purpose: route.purpose,
        };

    for (let i = 0; i < route.weight; i++) {
      rows.push({ props: { ...props, seeded: true } });
    }
  }

  if (rows.length) {
    // Spread over the last 60 days so the rows look like a log rather
    // than one import, and so they survive any window a caller applies.
    await pool.query(
      `insert into analytics_events (name, props, created_at)
       select 'toplance.corridor_requested',
              value,
              now() - (random() * interval '60 days')
         from jsonb_array_elements($1::jsonb)`,
      [JSON.stringify(rows.map((r) => r.props))]
    );
  }

  console.log(
    `Wrote ${rows.length} request(s) across ${DEMAND.length - skipped.length} route(s).`
  );
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} already live: ${skipped.join(", ")}`);
  }
} finally {
  await pool.end();
}
