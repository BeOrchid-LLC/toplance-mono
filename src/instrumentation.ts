import { assertClerkInstanceMatchesHost } from "@/lib/env/verify-clerk-instance";

/**
 * Runs once when a new server instance starts, before it serves any
 * request — the closest thing to a build-time check this Dockerfile
 * allows. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is a build argument
 * inlined into the client bundle and gone from the runner stage's
 * environment by the time this runs, so it cannot be read here; the
 * paired `CLERK_SECRET_KEY` is runtime-only and always present, so it
 * carries the check instead. Node only: the Edge runtime's copy of this
 * function would run the same check against the same two env vars for
 * no benefit.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  assertClerkInstanceMatchesHost({
    secretKey: process.env.CLERK_SECRET_KEY,
    appUrl: process.env.APP_URL,
  });
}
