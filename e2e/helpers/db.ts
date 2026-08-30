import { Client } from "pg";

import { loadEnvLocal } from "./env";

loadEnvLocal();

/**
 * The suite's own hand into Postgres, for the three things a browser
 * cannot honestly do.
 *
 * 1. **Making an account staff.** There is deliberately no code path for
 *    it — the README says so — so the only way a spec can reach the ops
 *    console is the same `update profiles ...` a Director would run.
 * 2. **Standing a case up.** The ops journey is about reviewing a
 *    submitted file, not about producing one; seeding it here keeps that
 *    spec self-contained instead of chained to the traveller's.
 * 3. **Clearing up.** Every spec signs in as a fixed address, so it has
 *    to be able to delete what the last run left behind.
 *
 * Raw SQL over `pg` rather than the app's Drizzle client: importing
 * `@/lib/db/*` would drag `server-only` and the whole app graph into the
 * test process, and this is meant to be the outside looking in.
 */
async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. The e2e suite talks to the real local Postgres — run `npm run db:up && npm run db:migrate && npm run db:seed` and check .env.local."
    );
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** The corridor every journey travels: Nigeria → United Kingdom, work. */
export async function skilledWorkerCorridorId(): Promise<string> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      "select id from corridors where nationality_iso = 'ng' and destination_iso = 'gb' and purpose = 'work' limit 1"
    );
    if (!rows[0]) {
      throw new Error(
        "No ng→gb work corridor in the database. Run `npm run db:seed` before the e2e suite."
      );
    }
    return rows[0].id;
  });
}

/**
 * Everything a previous run of these emails left behind. `profiles`
 * cascades to applications, documents, messages and memberships, so the
 * two extra statements are for the rows that hang off nothing: an
 * invitation addressed to an invitee who never existed as a profile, and
 * an organisation whose only member has just been deleted.
 */
export async function resetAccounts(
  emails: string[],
  organisationNames: string[] = []
): Promise<void> {
  await withClient(async (client) => {
    await client.query("delete from invitations where email = any($1::text[])", [emails]);
    await client.query("delete from profiles where email = any($1::text[])", [emails]);
    if (organisationNames.length) {
      await client.query("delete from organisations where name = any($1::text[])", [
        organisationNames,
      ]);
    }
    // Seeded travellers carry a synthetic id rather than a Clerk one, so
    // they are recognisable without a matching email. Only the stale
    // ones: another suite (or another branch) may be mid-run against the
    // same database, and its case is not this run's litter.
    await client.query(
      "delete from profiles where id like 'e2e_seed_%' and created_at < now() - interval '1 hour'"
    );
  });
}

/**
 * Staff, the way the README grants it — no UI, no action, no seam in the
 * app. Fails loudly if the account is not there yet: a spec that reaches
 * `/ops` believing it was promoted and quietly seeing the refusal screen
 * is a worse failure than this one.
 */
export async function promoteToStaff(
  email: string,
  staffRole: "reviewer" | "owner" = "reviewer"
): Promise<void> {
  await withClient(async (client) => {
    // The profile write races the post-sign-up navigation: Clerk's
    // session activation refreshes the router, the proxy walks the
    // now-signed-in visitor off the auth page, and `signUp`'s
    // "left the auth surface" signal can fire while `completeProfile`'s
    // insert is still in flight. Wait for the row — briefly, and still
    // loudly — before judging the sign-up unfinished.
    const deadline = Date.now() + 15_000;
    for (;;) {
      const result = await client.query(
        "update profiles set role = 'staff', staff_role = $2 where email = $1",
        [email, staffRole]
      );
      if (result.rowCount === 1) return;
      if ((result.rowCount ?? 0) > 1 || Date.now() > deadline) {
        throw new Error(
          `Expected exactly one profile for ${email} to promote, found ${result.rowCount}. Did the sign-up finish?`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  });
}

/**
 * How many applications an account owns.
 *
 * Zero is the interesting number. The traveller console provisions a
 * draft on sight, so a staff account holding one is proof it was let
 * into a console that is not its own.
 */
export async function applicationCountFor(email: string): Promise<number> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ count: number }>(
      `select count(*)::int as count
         from applications a
         join profiles p on p.id = a.traveler_id
        where p.email = $1`,
      [email]
    );
    return Number(rows[0]?.count ?? 0);
  });
}

/**
 * Wipes an account's applications.
 *
 * Sign-up already leaves a draft behind while the account is still a
 * traveller, so a spec proving that the traveller console provisions
 * nothing for staff has to start the reviewer from nothing — otherwise
 * the row that is already there hides the write under test.
 */
export async function clearApplicationsFor(email: string): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      "delete from applications where traveler_id in (select id from profiles where email = $1)",
      [email]
    );
  });
}

export type SeededCase = { applicationId: string; caseRef: string; travellerName: string };

/**
 * A submitted case for the reviewer to work, complete with a checklist
 * whose documents are all waiting on a verdict.
 *
 * The traveller behind it is synthetic — a `profiles` row with an id no
 * Clerk user has — because the ops journey never signs in as them. What
 * matters to the queue is that the row exists, carries a corridor and
 * sits in `submitted`.
 */
export async function seedSubmittedCase(travellerName: string): Promise<SeededCase> {
  const corridorId = await skilledWorkerCorridorId();

  return withClient(async (client) => {
    const travellerId = `e2e_seed_${Date.now()}`;

    await client.query(
      `insert into profiles (id, full_name, email, country_iso, role)
       values ($1, $2, $3, 'ng', 'traveler')`,
      [travellerId, travellerName, `${travellerId}@example.com`]
    );

    const { rows } = await client.query<{ id: string; case_ref: string }>(
      `insert into applications (traveler_id, corridor_id, status, intake_complete, submitted_at)
       values ($1, $2, 'submitted', true, now())
       returning id, case_ref`,
      [travellerId, corridorId]
    );

    // The same checklist `adoptRuleSet` would have built, in the state an
    // upload leaves each row in: a file has arrived, nobody has judged it.
    await client.query(
      `insert into documents (application_id, doc_key, name, state, storage_path, is_required, sort_order)
       select $1::uuid, r.doc_key, r.name, 'checking', $1::text || '/' || r.doc_key || '/seeded.jpg', r.is_required, r.sort_order
       from corridor_requirements r
       where r.corridor_id = $2`,
      [rows[0].id, corridorId]
    );

    return { applicationId: rows[0].id, caseRef: rows[0].case_ref, travellerName };
  });
}

/**
 * The rest of a checklist, verified.
 *
 * Approval is gated on every required document being verified
 * (`changeStatusTx` re-runs that check inside its own transaction), and
 * a reviewer would click through all ten. The spec clicks the first one
 * for real — that is the verdict path under test — and buys the other
 * nine here, because nine more clicks on the same button prove the same
 * thing nine more times.
 */
export async function verifyRemainingDocuments(applicationId: string): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      "update documents set state = 'verified' where application_id = $1 and state <> 'verified'",
      [applicationId]
    );
  });
}

/**
 * Fast-forward a real signed-up traveller to the far side of a decision.
 *
 * The companion screen is what approval unlocks, and the walk to
 * approval — intake, uploads, a reviewer's verdict — is exactly what the
 * other two specs prove through the UI. Repeating it here would buy
 * nothing but minutes, so this spec buys the state and tests the screen.
 */
export async function approveApplicationFor(email: string): Promise<string> {
  const corridorId = await skilledWorkerCorridorId();

  return withClient(async (client) => {
    // Same race `promoteToStaff` waits out: the row is provisioned by
    // the first app screen the account reaches, which the caller has
    // just navigated to.
    const deadline = Date.now() + 15_000;
    let travellerId: string | undefined;
    while (!travellerId) {
      const { rows } = await client.query<{ id: string }>(
        "select id from profiles where email = $1 limit 1",
        [email]
      );
      travellerId = rows[0]?.id;
      if (travellerId) break;
      if (Date.now() > deadline) {
        throw new Error(`No profile for ${email}. Did the sign-up finish?`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const { rows } = await client.query<{ id: string }>(
      `insert into applications (traveler_id, corridor_id, status, intake_complete, submitted_at, decided_at)
       values ($1, $2, 'approved', true, now(), now())
       on conflict (traveler_id) do update
         set corridor_id = excluded.corridor_id,
             status = 'approved',
             intake_complete = true,
             submitted_at = coalesce(applications.submitted_at, now()),
             decided_at = now()
       returning id`,
      [travellerId, corridorId]
    );

    await client.query(
      `insert into documents (application_id, doc_key, name, state, is_required, sort_order)
       select $1, r.doc_key, r.name, 'verified', r.is_required, r.sort_order
       from corridor_requirements r
       where r.corridor_id = $2
       on conflict (application_id, doc_key) do update set state = 'verified'`,
      [rows[0].id, corridorId]
    );

    return rows[0].id;
  });
}

/** The application's status as the database has it — for one assertion the UI cannot make. */
export async function statusOf(applicationId: string): Promise<string> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ status: string }>(
      "select status from applications where id = $1",
      [applicationId]
    );
    if (!rows[0]) throw new Error(`No application ${applicationId}`);
    return rows[0].status;
  });
}
