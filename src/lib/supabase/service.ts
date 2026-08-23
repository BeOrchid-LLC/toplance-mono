import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { requireServiceRoleEnv } from "@/lib/supabase/env";

/**
 * The only database client left in the app.
 *
 * It bypasses row-level security, so it must never be reached without
 * an authorization decision from `@/lib/auth/guards`. Callers live in
 * `src/lib/data/`; server actions and pages go through those.
 *
 * Phase 2 replaces this with a Drizzle connection. The guards above it
 * do not change.
 */
export function createServiceClient() {
  const { url, serviceRoleKey } = requireServiceRoleEnv();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
