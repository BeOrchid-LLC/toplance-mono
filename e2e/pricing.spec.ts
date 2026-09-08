import { expect, test } from "@playwright/test";

import { completeSignUpForm, resetFixtures, signUp, testEmail } from "./helpers/auth";
import { seedInvitation } from "./helpers/db";
import { consoleNav } from "./helpers/console";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

/**
 * The two paywalls, from the outside.
 *
 * Every other spec walks past these — `signUpInvited` pays the client's
 * fee and `payAgencyPlan` buys the plan, both in one click, so the specs
 * that are about something else stay about it. This file is the one that
 * looks at the screens.
 *
 * What is worth proving here is not that a button works. It is that the
 * gates are gates: a console that is shut stays shut when you type its
 * URL, and it opens the moment the payment lands. Both amounts come from
 * the rate card, so nothing here asserts a figure — a test that pinned
 * $300 would fail the day somebody edited the row it is meant to be
 * editable from.
 */

const DIRECTOR = testEmail("pricing-director");
const CLIENT = testEmail("pricing-client");
const LEAVER = testEmail("pricing-leaver");
const ORG = "Pricing Test Agency";
const CLIENT_ORG = "Pricing Client Agency";
const LEAVER_ORG = "Pricing Leaver Agency";

test("an agency cannot open its console until the plan is paid for", async ({ page }) => {
  await resetFixtures([DIRECTOR], [ORG]);

  await signUp(page, {
    email: DIRECTOR,
    fullName: "Tunde Bakare",
    path: "/agency/sign-up",
    orgName: ORG,
  });

  // ---- held at the bill, not at the console ----
  await page.waitForURL("**/agency/billing");
  await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();

  // Said on the screen that takes the money. Somebody demonstrating this
  // should never have to wonder whether a card was really charged.
  await expect(page.getByText("This is a test payment")).toBeVisible();

  // ---- and typing another console URL does not get around it ----
  await page.goto("/agency/clients");
  await page.waitForURL("**/agency/billing");

  await page.goto("/agency");
  await page.waitForURL("**/agency/billing");

  // ---- paying opens it ----
  await page.getByRole("button", { name: "Pay and open the console" }).click();
  await page.waitForURL("**/agency");
  await expect(page.getByRole("heading", { name: ORG })).toBeVisible();

  // ---- and the bill now reads as a receipt rather than a till ----
  await consoleNav(page).getByRole("link", { name: "Billing" }).click();
  await page.waitForURL("**/agency/billing");
  await expect(page.getByText("Your plan runs until")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pay and open the console" })
  ).toHaveCount(0);
});

/**
 * The way back out, and back in.
 *
 * Nothing renews here, so the only thing an agency can end is the month
 * it is standing in — and ending it has to leave the product somewhere a
 * director can act. That is the claim: the console shuts, the paywall
 * catches them, and the paywall *opens*. #77 was the version where it
 * did not, and the browser gave up with ERR_TOO_MANY_REDIRECTS.
 */
test("an agency can end its plan, and is not stranded when it does", async ({
  page,
}) => {
  await resetFixtures([LEAVER], [LEAVER_ORG]);

  await signUp(page, {
    email: LEAVER,
    fullName: "Amaka Obi",
    path: "/agency/sign-up",
    orgName: LEAVER_ORG,
  });

  await page.waitForURL("**/agency/billing");
  await page.getByRole("button", { name: "Pay and open the console" }).click();
  await page.waitForURL("**/agency");

  await consoleNav(page).getByRole("link", { name: "Billing" }).click();
  await page.waitForURL("**/agency/billing");

  // ---- it asks first, and taking the way out changes nothing ----
  await page.getByRole("button", { name: "End the plan" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("End the agency plan?");
  // The dialog says what the screen behind it does not: that it lands
  // now, and on colleagues rather than only on whoever clicked.
  await expect(dialog).toContainText("every colleague");

  await dialog.getByRole("button", { name: "Keep the plan" }).click();
  await expect(page.getByText("Your plan runs until")).toBeVisible();

  // ---- confirming it closes the console ----
  await page.getByRole("button", { name: "End the plan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "End the plan" }).click();

  await expect(page.getByText("You ended your plan on")).toBeVisible();

  // ---- and the console is shut, not merely relabelled ----
  await page.goto("/agency/clients");
  await page.waitForURL("**/agency/billing");

  // The half #77 got wrong. The guard sends them here; this page opens.
  await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();
  await expect(page.getByText("You ended your plan on")).toBeVisible();

  // ---- buying again reopens it, and nothing gates the way back in ----
  await page.getByRole("button", { name: "Pay and open the console" }).click();
  await page.waitForURL("**/agency");
  await expect(page.getByRole("heading", { name: LEAVER_ORG })).toBeVisible();
});

test("a client pays for their own application before intake opens", async ({ page }) => {
  await resetFixtures([CLIENT], [CLIENT_ORG]);
  const token = await seedInvitation(CLIENT, CLIENT_ORG);

  await setupClerkTestingToken({ page });
  await page.goto(`/sign-up?token=${encodeURIComponent(token)}`);
  await completeSignUpForm(page, { email: CLIENT, fullName: "Ifeoma Nwosu" });

  await page.waitForURL(`**/invite/${token}`);
  await page.getByRole("button", { name: "Accept invitation" }).click();

  // ---- accepted, and standing at the fee rather than in the intake ----
  await page.waitForURL("**/checkout");
  await expect(page.getByRole("heading", { name: "Your application fee" })).toBeVisible();
  await expect(page.getByText("This is a test payment")).toBeVisible();

  // ---- the console is shut behind it, by URL as well as by link ----
  await page.goto("/app/agent");
  await page.waitForURL("**/checkout");

  await page.goto("/app/documents");
  await page.waitForURL("**/checkout");

  // ---- paying opens the intake ----
  await page.getByRole("button", { name: "Pay and start" }).click();
  await page.waitForURL("**/app/agent");

  // ---- and the fee is not asked for twice ----
  await page.goto("/checkout");
  await page.waitForURL("**/app/**");
});
