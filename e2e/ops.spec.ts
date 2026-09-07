import { expect, test } from "@playwright/test";

import { resetFixtures, signUp, testEmail } from "./helpers/auth";
import { promoteToStaff, seedSubmittedCase } from "./helpers/db";

/**
 * The platform console, after the v1.3 tenancy.
 *
 * This file used to hold journey two: a BeOrchid reviewer taking a
 * submitted case through review to approved. That journey no longer
 * belongs to BeOrchid. An agency reviews its own travellers' documents;
 * BeOrchid provisions agencies, curates routes and reads the audit log.
 *
 * What replaced it is the assertion the deletion was for. `policy.ts`
 * proves staff hold no permission, but the case screens never asked
 * `policy.ts` — they gated on `requireStaffConsole()` and then called
 * `getDocuments()` straight from the page. A unit test could not have
 * caught that, and this is the level at which it shows: the screen is
 * gone from a running server, not merely unreachable in principle.
 *
 * OWED: the review journey itself, rewritten against the agency console
 * once that console has a case screen. Until then no browser test covers
 * a document being verified, and that gap is deliberate and recorded
 * rather than papered over with a test of a screen that does not exist.
 *
 * Staff is granted the only way it can be (`update profiles set role =
 * 'staff'` — there is deliberately no code path), and the second factor
 * is stood down for this server only, via the `E2E_SKIP_STAFF_2FA` seam
 * `requireStaffConsole` reads.
 */

const EMAIL = testEmail("staff");
const NAME = "Ngozi Balogun";
const STAFF_ORG = "Ops Reviewer Agency";
const TRAVELLER = "Chukwuemeka Obi";

test("the platform console curates routes and offers no way into a case", async ({
  page,
}) => {
  await resetFixtures([EMAIL], [STAFF_ORG]);
  const seeded = await seedSubmittedCase(TRAVELLER);

  await signUp(page, { email: EMAIL, fullName: NAME, orgName: STAFF_ORG });

  // The `refuse` branch, worth proving on the way past.
  await page.goto("/ops");
  await expect(
    page.getByRole("heading", { name: "This console is for Toplance staff" })
  ).toBeVisible();

  await promoteToStaff(EMAIL);

  // ---- the console lands on route curation ----
  await page.goto("/ops");
  await page.waitForURL("**/ops/corridors");

  // ---- and the nav offers nothing else ----
  await expect(page.getByRole("link", { name: "Case queue" })).toHaveCount(0);

  // ---- the case screen is gone from the server, not merely unlinked ----
  // Reached by its real id, by an account that is genuinely staff and
  // past the second factor. This is the strongest form of the claim in
  // every agency's client terms.
  const response = await page.goto(`/ops/cases/${seeded.applicationId}`);
  expect(response?.status()).toBe(404);

  // Nothing of the traveller renders on the way to that 404.
  await expect(page.getByText(seeded.caseRef)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: TRAVELLER })).toHaveCount(0);
});
