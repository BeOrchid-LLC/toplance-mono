import { clerkSetup } from "@clerk/testing/playwright";

import { loadEnvLocal } from "./helpers/env";

/**
 * One call, before any browser opens: `clerkSetup` exchanges the secret
 * key for a *testing token* and leaves it on `process.env` for the
 * workers to inherit.
 *
 * That token is what makes these specs possible at all. Clerk's bot
 * protection is what the `#clerk-captcha` mount in `auth-form.tsx`
 * exists for; a scripted browser signing up eleven times an hour is
 * exactly the traffic it is meant to stop. `setupClerkTestingToken` (in
 * `helpers/auth.ts`) replays the token on every Frontend API call the
 * page makes, so the challenge is bypassed for this browser only, and
 * only against the development instance.
 *
 * Test mode itself — `+clerk_test` addresses and the fixed `424242`
 * code — is on by default for development instances. If the sign-up
 * step ever fails with "incorrect code" against a fresh instance, check
 * that nobody has turned it off in the dashboard.
 */
export default async function globalSetup(): Promise<void> {
  loadEnvLocal();

  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "The e2e suite needs NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY for a Clerk *development* instance. Put them in .env.local (locally) or in the workflow's secrets (CI)."
    );
  }

  await clerkSetup();
}
