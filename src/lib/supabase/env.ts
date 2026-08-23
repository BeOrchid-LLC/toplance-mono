/**
 * Supabase credentials, and whether we have them.
 *
 * The public marketing page has no session and must render whether or
 * not Supabase is configured — a missing .env.local should not take the
 * whole site down, it should only disable the parts that need a
 * database. Anything that genuinely needs a client calls
 * `requireSupabaseEnv()` and gets an error that says what to do.
 *
 * Since Clerk took over identity, reads and writes go through the
 * service role: a Clerk session carries no Supabase JWT, so there is no
 * user-scoped client to build. The service role bypasses row-level
 * security entirely, which is why every query must pass a guard from
 * `@/lib/auth/guards`. The key is server-only and must never appear in
 * a NEXT_PUBLIC_ variable — anything with that prefix is compiled into
 * the browser bundle.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const hasServiceRoleEnv = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!hasSupabaseEnv) {
    throw new Error(
      [
        "Supabase is not configured.",
        "",
        "  1. npm run db:start        # boots Postgres and Storage in Docker",
        "  2. copy the API URL and anon key it prints into .env.local",
        "  3. npm run db:reset        # applies migrations and seeds the corridors",
        "",
        "See README.md for the full first-run sequence.",
      ].join("\n")
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export function requireServiceRoleEnv(): { url: string; serviceRoleKey: string } {
  if (!hasServiceRoleEnv) {
    throw new Error(
      [
        "SUPABASE_SERVICE_ROLE_KEY is not set.",
        "",
        "`npm run db:start` prints it as the service_role key. Put it in",
        ".env.local without a NEXT_PUBLIC_ prefix — it must never reach",
        "the browser bundle.",
      ].join("\n")
    );
  }
  return { url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY };
}
