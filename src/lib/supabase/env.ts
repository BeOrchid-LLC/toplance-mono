/**
 * Supabase credentials, and whether we have them.
 *
 * The public marketing page has no session and must render whether or
 * not Supabase is configured — a missing .env.local should not take the
 * whole site down, it should only disable the parts that need a
 * database. Anything that genuinely needs a client calls
 * `requireSupabaseEnv()` and gets an error that says what to do.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!hasSupabaseEnv) {
    throw new Error(
      [
        "Supabase is not configured.",
        "",
        "  1. npm run db:start        # boots Postgres, Auth and Storage in Docker",
        "  2. copy the API URL and anon key it prints into .env.local",
        "  3. npm run db:reset        # applies migrations and seeds the corridors",
        "",
        "See README.md for the full first-run sequence.",
      ].join("\n")
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}
