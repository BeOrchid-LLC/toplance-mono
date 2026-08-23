import { readFileSync } from "node:fs";

/**
 * Next loads `.env.local` for us; Vitest does not. The guard tests talk
 * to the real local Postgres, so they need `DATABASE_URL` from the same
 * place the app reads it — and nothing else, which is why this only
 * fills in variables that are not already set.
 *
 * A missing file is not an error. The tests that need a database skip
 * themselves when `DATABASE_URL` is absent, so a checkout with no
 * `.env.local` still runs the pure policy tests.
 */
try {
  const text = readFileSync(new URL(".env.local", import.meta.url), "utf8");

  for (const line of text.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // No .env.local. Database-backed tests will skip.
}
