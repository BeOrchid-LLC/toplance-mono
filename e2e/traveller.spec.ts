import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

import { resetFixtures, signUpInvited, testEmail } from "./helpers/auth";
import { seedInvitation } from "./helpers/db";

/**
 * Journey one: a Nigerian traveller arrives with nothing, and leaves
 * with a corridor, a checklist and a document in the system.
 *
 * The intake runs on its scripted path — the e2e server starts with no
 * `OPENAI_API_KEY`, so `aiEnabled()` is false and `ScriptedIntake`
 * renders. That is deliberate twice over: nothing here bills a model,
 * and the chips are the deterministic route through the same
 * `recordIntakeAnswer` the model-driven agent writes through.
 */

const EMAIL = testEmail("traveller");
const ORG = "Traveller Spec Sponsor";
const NAME = "Amara Okonkwo";
const FIXTURE = join(__dirname, "fixtures/passport.jpg");
const TYPO_EMAIL = testEmail("traveller.typo");
const TYPO_ORG = "Traveller Typo Sponsor";

/** The ten answers, as the chips label them in English. */
const ANSWERS = [
  "Nigeria",
  "Lagos",
  "United Kingdom",
  "Work",
  "Within a month",
  "₦2–4 million",
  "Employer housing",
  "Just me",
  "Nothing in particular",
  "No, never",
];

/**
 * One checklist row, found by the document it is about. A row is the
 * innermost element carrying both the document's name and the (visually
 * hidden) file inputs, which is true of `DocumentRow` whatever the
 * surrounding layout does.
 */
function documentRow(page: Page, name: string) {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .filter({ has: page.locator('input[type="file"]') })
    .last();
}

test("a traveller signs up, finishes intake and uploads a document", async ({ page }) => {
  await resetFixtures([EMAIL], [ORG]);

  // The only way in: an organisation invited this person. `signUpInvited`
  // carries the sign-up and the accept, and lands on the agent — where a
  // brand-new traveller belongs either way.
  const token = await seedInvitation(EMAIL, ORG);
  await signUpInvited(page, { email: EMAIL, fullName: NAME, token });

  // Nothing is meaningful before the intake, so this is where a
  // brand-new account belongs — and the dashboard would redirect here
  // anyway.
  await page.goto("/app/agent");
  await expect(page.getByText("I will ask a few short questions")).toBeVisible();

  for (const [index, answer] of ANSWERS.entries()) {
    await expect(page.getByText(`question ${index + 1} of ${ANSWERS.length}`)).toBeVisible();
    await page.getByRole("button", { name: answer, exact: true }).click();
  }

  await expect(page.getByText("Profile complete", { exact: true }).first()).toBeVisible();

  // ---- the checklist the answers resolved ----
  await page.getByRole("link", { name: /See my requirements/ }).click();
  await page.waitForURL("**/app/requirements");

  await expect(page.getByRole("heading", { name: "Skilled Worker Visa" })).toBeVisible();
  // Ten required documents in the seeded ng→gb work rule set, and three
  // more that only apply to some applicants.
  await expect(page.getByText("Documents required")).toBeVisible();
  await expect(page.getByText("Certificate of Sponsorship")).toBeVisible();
  await expect(page.getByText("Tuberculosis test certificate")).toBeVisible();
  await expect(page.getByText("3 more only if they apply to you")).toBeVisible();

  await page.getByRole("link", { name: /Start uploading/ }).click();
  await page.waitForURL("**/app/documents");

  // ---- one file, into the real bucket ----
  const passport = documentRow(page, "International passport (bio page)");
  await expect(passport.getByText("Not started")).toBeVisible();

  // The pickers are `sr-only`, opened by the row's own buttons; the
  // second is the file picker (the first is the phone camera).
  await passport.locator('input[type="file"]').last().setInputFiles(FIXTURE);

  await expect(passport.getByText("Checking")).toBeVisible();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
});


/**
 * The browser half of the invitation check, which no unit test can
 * reach.
 *
 * `completeProfile` has always refused an address the invitation does
 * not name, and by the time it spoke the refusal was academic: Clerk had
 * made the account, the emailed code had been used, and `auth-form`
 * pushes the visitor off this form to the invitation. Under invite-only
 * that made one mistyped character the difference between a traveller
 * with access and a traveller with none — there is no second door for
 * them to try.
 *
 * The assertion that matters is the negative one. An error message
 * appearing proves the check ran; the code screen *not* appearing is the
 * whole of the fix, because that screen is the point of no return.
 */
test("a mistyped address is corrected on the form, not after the code is spent", async ({
  page,
}) => {
  await resetFixtures([TYPO_EMAIL], [TYPO_ORG]);

  const token = await seedInvitation(TYPO_EMAIL, TYPO_ORG);
  await setupClerkTestingToken({ page });
  await page.goto(`/sign-up?token=${encodeURIComponent(token)}`);

  const emailField = page.getByLabel("Email", { exact: true });
  const codeScreen = page.getByRole("heading", { name: "Enter the code we emailed you" });

  await page.getByLabel("Full name", { exact: true }).fill(NAME);
  // The invited address, one character out — the ordinary typo, not an
  // attempt to use somebody else's invitation.
  await emailField.fill(TYPO_EMAIL.replace("@", "x@"));
  await page.getByRole("button", { name: "Continue" }).click();

  // Scoped to the form. Next mounts its own `role="alert"` route
  // announcer on every page, so an unscoped alert role matches two
  // elements and fails strict mode whatever the form is saying.
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "That invitation was sent to a different email address."
  );
  await expect(codeScreen).toBeHidden();

  // And the form is still standing, with the field still editable —
  // which is the part that was lost before.
  await emailField.fill(TYPO_EMAIL);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(codeScreen).toBeVisible();
});
