import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/lib/db/schema";

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
 * Hosts where an unencrypted connection is not a finding. The socket
 * never leaves the machine (or the Docker network `db:up` creates), so
 * demanding TLS there would only mean every developer generating a
 * self-signed certificate to protect a loopback.
 */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

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

  // `new URL` keeps the brackets on an IPv6 literal; the set does not.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (LOOPBACK_HOSTS.has(host)) return null;

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

/**
 * Said at module load, before a single row moves — a connection that
 * should have been encrypted and was not cannot be un-sent once it is
 * noticed.
 *
 * A warning and not a throw, deliberately, and the trade is worth
 * naming: refusing to boot would make an unencrypted connection
 * impossible, at the cost of turning a missing query parameter into an
 * outage on deploy. Warning keeps the deploy and relies on somebody
 * reading the log — which is exactly the assumption that let this go
 * unnoticed in the first place. So it is loud, it names the host, and it
 * says what to add.
 *
 * Once per process. The pool is cached on `globalThis` because Next
 * re-executes this module on every hot reload; without the same latch
 * the warning would repeat until it became scenery.
 */
const insecure = insecureConnectionReason(process.env.DATABASE_URL);
if (insecure && !globalForDb.sslWarned) {
  globalForDb.sslWarned = true;
  console.warn(`⚠️  INSECURE DATABASE CONNECTION\n   ${insecure}`);
}

globalForDb.pool ??= new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(globalForDb.pool, { schema, casing: "snake_case" });
