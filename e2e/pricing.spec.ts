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
const ORG = "Pricing Test Agency";
const CLIENT_ORG = "Pricing Client Agency";

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
