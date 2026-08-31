import { expect, test } from "@playwright/test";

import { resetFixtures, signUp, testEmail } from "./helpers/auth";
import {
  promoteToStaff,
  seedSubmittedCase,
  statusOf,
  verifyRemainingDocuments,
} from "./helpers/db";

/**
 * Journey two: the desk. A case arrives submitted, a reviewer takes it
 * through review and approves it, and the traveller is told.
 *
 * Self-contained by design — the case is seeded through the database
 * rather than chained to the traveller spec, so this journey is about
 * the review, not about producing something to review.
 *
 * Two things about the gate. Staff is granted the only way it can be
 * (`update profiles set role = 'staff'` — there is deliberately no code
 * path), and the second factor is stood down for this server only, via
 * the `E2E_SKIP_STAFF_2FA` seam `requireStaffConsole` reads. Of its
 * three outcomes, `refuse` is asserted below, `ok` is the rest of this
 * journey, and `enroll` is left to `staff-gate.test.ts`: a browser
 * cannot walk a real authenticator-app enrollment, and pretending it
 * can would be a worse test than saying so.
 */

const EMAIL = testEmail("staff");
const NAME = "Ngozi Balogun";
const TRAVELLER = "Chukwuemeka Obi";
const PASSPORT = "International passport (bio page)";

test("a reviewer takes a submitted case through review to approved", async ({ page }) => {
  await resetFixtures([EMAIL]);
  const seeded = await seedSubmittedCase(TRAVELLER);

  // The employer door, `signUp`'s default: it lands on `/employer` rather
  // than `/app`, so no draft application is opened for an account that is
  // about to become staff, and no invitation is minted just to be thrown
  // away.
  await signUp(page, { email: EMAIL, fullName: NAME });

  // The `refuse` branch. It no longer has to come before the promotion
  // to provision anything — `getProfile` stopped creating rows when
  // travellers became invite-only, and `completeProfile` wrote this one
  // during the sign-up above. It stays here because the refusal is worth
  // proving on the way past.
  await page.goto("/ops");
  await expect(
    page.getByRole("heading", { name: "This console is for Toplance staff" })
  ).toBeVisible();

  await promoteToStaff(EMAIL);

  // ---- the queue ----
  await page.goto("/ops");
  await expect(page.getByRole("heading", { name: "Case queue" })).toBeVisible();
  await expect(page.getByText(seeded.caseRef)).toBeVisible();

  // By case reference: it is unique, where the applicant's name is only
  // as unique as the seed data happens to be.
  await page.getByRole("link", { name: new RegExp(seeded.caseRef) }).click();
  await page.waitForURL(`**/ops/cases/${seeded.applicationId}`);
  await expect(page.getByRole("heading", { name: TRAVELLER })).toBeVisible();

  // ---- one document, judged ----
  await expect(page.getByText("Awaiting review")).toBeVisible();
  await page.getByRole("button", { name: `Verify ${PASSPORT}` }).click();

  // The row leaves "Awaiting review" for "Already judged", carrying the
  // verdict as a word, not only as a colour.
  await expect(page.getByText("Already judged")).toBeVisible();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();

  // ---- the decision, in two moves ----
  const message = page.getByPlaceholder("Message to the traveller");

  await message.fill("Opening your file now — I will come back within three days.");
  await page.getByRole("button", { name: "Under review", exact: true }).click();
  // The exits change with the status, so the button that moved the case
  // here is gone and only the pill still says it.
  await expect(page.getByText("Under review", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Under review", exact: true })).toHaveCount(0);

  // Approval is gated on every required document being verified, and
  // the verdict button has now been proved once — see
  // `verifyRemainingDocuments`.
  await verifyRemainingDocuments(seeded.applicationId);
  await page.reload();

  await page.getByPlaceholder("Message to the traveller").fill(
    "Approved. Your arrival plan is now in the app."
  );
  // Terminal states take two clicks on the same button, on purpose.
  await page.getByRole("button", { name: "Approved", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval" }).click();

  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await expect(page.getByText("No staff action from this state")).toBeVisible();

  expect(await statusOf(seeded.applicationId)).toBe("approved");
});
