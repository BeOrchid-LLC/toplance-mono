import { defineConfig } from "drizzle-kit";

/**
 * Next loads `.env.local`; drizzle-kit is a separate binary and does
 * not, so every `db:migrate` needed DATABASE_URL exported by hand — and
 * failed with an empty-url error that does not say so. Loading it here
 * fixes generate, migrate and studio at once.
 *
 * A missing file is not an error: `db:generate` needs no connection, and
 * the commands that do fail with drizzle-kit's own message.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fall through to whatever the environment provides.
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  casing: "snake_case",
});
