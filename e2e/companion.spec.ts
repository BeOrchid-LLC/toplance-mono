import { expect, test } from "@playwright/test";

import { resetFixtures, signUpInvited, testEmail } from "./helpers/auth";
import { approveApplicationFor, seedInvitation } from "./helpers/db";

/**
 * Journey four: what approval unlocks.
 *
 * "After you land" does not exist as a nav item before a case is
 * approved — it is not locked, it is absent — so this proves both that
 * the door appears and that what is behind it is built from the
 * traveller's own corridor.
 *
 * The walk to approval is the other two specs' subject, so this one
 * buys the state through the database and spends its time on the screen
 * itself. The tips panel is deliberately its empty state: the e2e
 * server runs with no `OPENAI_API_KEY`, and the checklist below is what
 * has to hold without one.
 */

const EMAIL = testEmail("companion");
const NAME = "Tunde Bakare";
const ORG = "Companion Spec Sponsor";

test("an approved traveller gets the arrival companion", async ({ page }) => {
  await resetFixtures([EMAIL], [ORG]);

  const token = await seedInvitation(EMAIL, ORG);
  await signUpInvited(page, { email: EMAIL, fullName: NAME, token });

  // `/app` opens the draft application on first sight (and redirects to
  // the agent, since intake has not run) — which is the row the approval
  // below moves. The profile already exists: `completeProfile` wrote it
  // during the sign-up, which is now the only thing that ever does.
  await page.goto("/app");
  await approveApplicationFor(EMAIL);

  await page.goto("/app");

  const companion = page.getByRole("link", { name: "After you land" }).first();
  await expect(companion).toBeVisible();
  await companion.click();
  await page.waitForURL("**/app/companion");

  await expect(page.getByRole("heading", { name: "After you land" })).toBeVisible();
  await expect(page.getByText("Arrival checklist")).toBeVisible();
  // The UK · work checklist, not a generic one.
  await expect(page.getByText("Collect your eVisa or BRP")).toBeVisible();
  await expect(page.getByText("Apply for a National Insurance number")).toBeVisible();
  await expect(page.getByText("Skilled Worker visa", { exact: true })).toBeVisible();
  // No model behind this server, so the tips panel says so rather than
  // inventing any.
  await expect(page.getByText("Nothing generated yet.")).toBeVisible();
});
