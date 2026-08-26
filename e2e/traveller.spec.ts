import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { resetFixtures, signUp, testEmail } from "./helpers/auth";

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
const NAME = "Amara Okonkwo";
const FIXTURE = join(__dirname, "fixtures/passport.jpg");

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
  await resetFixtures([EMAIL]);

  // `next` is carried through the form and honoured by the proxy, so
  // the journey does not depend on where a bare sign-up happens to land
  // — which is a route another branch is currently moving.
  await signUp(page, { email: EMAIL, fullName: NAME, path: "/sign-up?next=/app/agent" });

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
