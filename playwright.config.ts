import { defineConfig, devices } from "@playwright/test";

import { loadEnvLocal } from "./e2e/helpers/env";

/**
 * End-to-end proof of the four journeys the PRD is actually about, run
 * against a real dev server, the real Clerk dev instance, the local
 * Postgres and the local object store. Nothing here is mocked — the
 * point of this suite is that the seams between those four hold.
 *
 * `.env.local` is read here rather than left to `next dev`, because the
 * specs themselves need `DATABASE_URL` and `CLERK_SECRET_KEY` in their
 * own process, not only in the server's.
 */
loadEnvLocal();

/**
 * A port of its own, not 3000.
 *
 * `.env.local` carries a real OpenAI key and real R2 credentials, so a
 * dev server started from it bills a model on every intake turn and
 * writes fixture uploads into the staging bucket. The server below is
 * started with both of those replaced (see `webServer.env`), and giving
 * it a separate port is what guarantees the suite can never quietly
 * attach to a developer's own `npm run dev` on 3000 instead — which
 * would put both back.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  // Outside `src`, so Vitest's `src/**/*.test.ts` never picks these up.
  testDir: "./e2e",
  // Each journey signs a new account into the same Clerk dev instance
  // and walks it through one linear story. Running two at once buys a
  // little wall-clock time and costs the ability to read a failure.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // A cold `next dev` compiles each route on first request, so the first
  // navigation of a journey is seconds rather than milliseconds.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    /**
     * `next dev` loads `.env.local` itself, but `@next/env` never
     * overwrites a variable that is already set — including one set to
     * the empty string — so these win over the file.
     *
     * - `OPENAI_API_KEY: ""` puts the intake on its scripted path
     *   (`aiEnabled()` is `!!process.env.OPENAI_API_KEY`) and turns off
     *   the document pre-check, the itinerary and the companion tips.
     *   No test may ever reach the real API.
     * - `RESEND_API_KEY: ""` makes `sendEmail` log and skip, so the
     *   invitation and every `notify()` stay inside the database.
     * - `E2E_SKIP_STAFF_2FA` is the seam Task 13 left in
     *   `requireStaffConsole`: e2e cannot walk a real authenticator-app
     *   enrollment, and this widens nothing else the gate checks.
     * - The `S3_*` block points uploads at the local MinIO container
     *   rather than the R2 staging bucket `.env.local` is aimed at.
     * - `APP_URL` is what `appUrl()` builds invitation links from, so
     *   the link the employer copies opens on this server.
     */
    env: {
      // Its own build directory as well as its own port: Next 16 locks
      // `<distDir>/lock`, so sharing `.next` with a developer's own
      // `npm run dev` would make one of the two refuse to start. Two
      // suites running side by side (a second checkout, a colleague's
      // branch) need `E2E_PORT` and `E2E_DIST_DIR` moved together.
      NEXT_DIST_DIR: process.env.E2E_DIST_DIR ?? ".next-e2e",
      OPENAI_API_KEY: "",
      RESEND_API_KEY: "",
      E2E_SKIP_STAFF_2FA: "1",
      APP_URL: baseURL,
      S3_ENDPOINT: "http://127.0.0.1:54330",
      S3_REGION: "us-east-1",
      S3_BUCKET: "documents",
      S3_ACCESS_KEY_ID: "toplance",
      S3_SECRET_ACCESS_KEY: "toplance123",
    },
  },
});
