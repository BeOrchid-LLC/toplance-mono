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
 * One pool per process. `new Pool` opens no connection on its own, so
 * building it without a URL is harmless: the failure surfaces on first
 * query, and `hasDatabaseEnv` is what stops us getting there.
 *
 * Next reloads modules in development, so the pool is cached on
 * `globalThis` — otherwise every hot reload leaks one until Postgres
 * refuses new connections.
 */
const globalForDb = globalThis as unknown as { pool?: Pool };

globalForDb.pool ??= new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(globalForDb.pool, { schema, casing: "snake_case" });
