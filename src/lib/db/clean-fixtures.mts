import { Pool } from "pg";

/**
 * Remove the rows the test suites create, in an order the foreign keys
 * allow.
 *
 * `npm run db:clean-fixtures`. Needed because a failing run can leave
 * fixtures behind — a suite that throws mid-test may not finish its own
 * teardown — and the next run then fails on a duplicate key or waits on
 * a lock, which looks like a new bug and is not one.
 *
 * `applications.org_id` became `restrict` with the v1.3 tenancy, so the
 * order below is load-bearing: applications before organisations, always.
 * Deleting an agency that still holds a case is refused, and a refusal
 * inside a teardown aborts the rest of it.
 *
 * Scoped to the fixture shapes the suites use — `test_%` ids, the
 * `@test.invalid` domain, and the `00000000-0000-4000-8000-%` agency
 * ids. It will not touch a developer's own account or seeded corridor
 * data.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const steps: [string, string][] = [
  ["invitations", `delete from invitations where email like '%@test.invalid' or email like '%@example.com' or token like 'tok%'`],
  ["applications", `delete from applications where traveler_id like 'test\\_%'`],
  ["org_members", `delete from org_members where user_id like 'test\\_%'`],
  ["profiles", `delete from profiles where id like 'test\\_%' or email like '%@test.invalid'`],
  [
    "organisations",
    `delete from organisations o
       where not exists (select 1 from applications a where a.org_id = o.id)
         and (o.id::text like '00000000-0000-4000-8000-%' or o.name like '%Test%')`,
  ],
];

for (const [label, sql] of steps) {
  const { rowCount } = await pool.query(sql);
  console.log(`${label.padEnd(14)} ${rowCount}`);
}

await pool.end();
