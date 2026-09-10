import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/lib/db/schema";
import { isPrivateHost } from "@/lib/db/private-host";

export { isPrivateHost };

/**
 * Whether this process has a database to talk to.
 *
 * The public marketing page has no session and must render whether or
 * not the stack is configured — a missing .env.local should disable the
 * parts that need a database, not take the whole site down. Pages that
 * need one check this and show the setup notice instead.
 */
export const hasDatabaseEnv = Boolean(process.env.DATABASE_URL);

export const SETUP_STEPS = [
  "npm run db:up          # starts Postgres and MinIO in Docker",
  "cp .env.local.example .env.local",
  "npm run db:migrate     # applies the schema",
  "npm run db:seed        # loads the corridors",
] as const;

/**
 * Names a connection string that would cross a network in the clear.
 *
 * The product tells every traveller their documents are "encrypted at
 * rest and in transit", and the brief asks for it of all user data. The
 * pool was built as `new Pool({ connectionString })` with no `ssl`
 * option and no `sslmode` anywhere in the repo — so whether the wire
 * carrying passport numbers and dates of birth was encrypted depended
 * entirely on a substring of an environment variable nobody checked.
 * The failure mode is the bad one: it works perfectly, and silently.
 *
 * This reports rather than repairs. Forcing `ssl: { rejectUnauthorized:
 * false }` would encrypt the wire while accepting any certificate
 * offered — which stops a passive listener and not an active one, and
 * would have looked like a fix. `verify-full` versus `require` is a real
 * choice about whether the host's certificate is checked, and it belongs
 * to whoever owns the deployment, stated in the connection string where
 * it can be read.
 *
 * Returns the parsed reason rather than acting on it, so the decision of
 * what to do about it lives at the one call site below, and so this can
 * be tested without a live pool.
 */
export function insecureConnectionReason(url: string | undefined): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Unparseable is not this function's problem to report: `pg` gives a
    // better error for it than we can, on first query.
    return null;
  }

  // `new URL` keeps the brackets on an IPv6 literal; the check does not.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (isPrivateHost(host)) return null;

  const sslmode = parsed.searchParams.get("sslmode");
  if (!sslmode) {
    return `DATABASE_URL points at ${host} with no sslmode. Add ?sslmode=verify-full (or sslmode=require if the host's certificate cannot be verified) — without it the connection may be made in the clear.`;
  }
  if (sslmode === "disable" || sslmode === "allow" || sslmode === "prefer") {
    return `DATABASE_URL sets sslmode=${sslmode} for ${host}, which permits an unencrypted connection. Use sslmode=verify-full, or sslmode=require at minimum.`;
  }

  return null;
}

/**
 * One pool per process. `new Pool` opens no connection on its own, so
 * building it without a URL is harmless: the failure surfaces on first
 * query, and `hasDatabaseEnv` is what stops us getting there.
 *
 * Next reloads modules in development, so the pool is cached on
 * `globalThis` — otherwise every hot reload leaks one until Postgres
 * refuses new connections.
 */
const globalForDb = globalThis as unknown as { pool?: Pool; sslWarned?: boolean };

export type InsecureConnectionAction = "allow" | "warn" | "refuse";

/**
 * What to do about a connection string that would cross a network in
 * the clear. Pure, so the choice can be tested without a live pool.
 *
 * Production refuses; everywhere else warns. Both halves are deliberate.
 *
 * Refusing in production makes an unencrypted connection carrying
 * passport numbers impossible rather than merely noticed, and the cost —
 * a missing query parameter becoming an outage on deploy — is now much
 * smaller than it was when this only warned. `isPrivateHost` no longer
 * fires on Coolify's own Docker network, so reaching this branch in
 * production means the database really is being addressed across a
 * network we do not control, with no `sslmode` to protect it. That is
 * not a configuration slip to log and carry on from.
 *
 * Warning elsewhere keeps a developer pointing at a staging database, or
 * a CI job with a bare connection string, out of the same trap: those
 * are not carrying real travellers' data, and an outage there teaches
 * nothing.
 *
 * The remaining risk is honest and worth stating: a production deploy
 * whose `DATABASE_URL` loses its `sslmode` will not start. That is the
 * intended behaviour — a site that is down leaks nothing.
 */
export function actionForInsecureConnection(input: {
  reason: string | null;
  isProduction: boolean;
}): InsecureConnectionAction {
  if (!input.reason) return "allow";
  return input.isProduction ? "refuse" : "warn";
}

/**
 * Said at module load, before a single row moves — a connection that
 * should have been encrypted and was not cannot be un-sent once it is
 * noticed.
 *
 * The warning latches once per process. The pool is cached on
 * `globalThis` because Next re-executes this module on every hot reload;
 * without the same latch the warning would repeat until it became
 * scenery.
 */
const insecure = insecureConnectionReason(process.env.DATABASE_URL);
const action = actionForInsecureConnection({
  reason: insecure,
  isProduction: process.env.NODE_ENV === "production",
});

if (action === "refuse") {
  // Not a warning that can be scrolled past: nothing downstream of this
  // module gets a pool, so no query can be made in the clear.
  throw new Error(`INSECURE DATABASE CONNECTION\n${insecure}`);
}

if (action === "warn" && !globalForDb.sslWarned) {
  globalForDb.sslWarned = true;
  console.warn(`⚠️  INSECURE DATABASE CONNECTION\n   ${insecure}`);
}

/**
 * How many connections one process may hold.
 *
 * Pure, and takes its environment as an argument, so the budget can be
 * checked without opening a socket.
 *
 * Production keeps the driver's own default of 10 — this is not a
 * tuning knob and changing it there is somebody's load test, not this
 * function's business. What it exists for is the test run, where the
 * shape of the process tree makes 10 the wrong number by arithmetic:
 * Vitest's fork pool starts one worker per CPU less one, each worker is
 * a process with its own module graph and therefore its own Pool, and
 * `max_connections` on the local Postgres is 100. Eleven cores is
 * enough to exhaust it. The symptom is not an error anyone reads — it is
 * `too many clients already` on one worker while a dozen others sit out
 * a 5s timeout waiting for a slot, which reads exactly like a slow
 * machine.
 *
 * Three is the budget: a file may hold a transaction and query inside
 * it, which needs two, and one spare. Three fits 33 workers under the
 * limit, so the number stops depending on the host.
 *
 * `DATABASE_POOL_MAX` overrides both, for a CI runner whose Postgres is
 * sized differently. A value that is not a positive integer is ignored
 * rather than obeyed — a typo in an env var should not quietly halve
 * the pool.
 */
export function poolMax(env: Record<string, string | undefined>): number {
  const override = Number(env.DATABASE_POOL_MAX);
  if (Number.isInteger(override) && override > 0) return override;
  return env.VITEST ? 3 : 10;
}

globalForDb.pool ??= new Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolMax(process.env),
});

export const db = drizzle(globalForDb.pool, { schema, casing: "snake_case" });
