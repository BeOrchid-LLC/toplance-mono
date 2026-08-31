import { test } from "@playwright/test";

import { resetFixtures, signUpInvited, testEmail } from "./helpers/auth";
import { seedInvitation } from "./helpers/db";

/** THROWAWAY — visual check of the agent page. Delete after use. */
const EMAIL = testEmail("scratch.agentshot");
const ORG = "Scratch Shot Sponsor";

test("record document: fresh / answered / reopened / transcript / dark / mobile", async ({
  page,
}) => {
  await resetFixtures([EMAIL], [ORG]);
  await page.setViewportSize({ width: 1440, height: 900 });
  const token = await seedInvitation(EMAIL, ORG);
  await signUpInvited(page, { email: EMAIL, fullName: "Amara Okonkwo", token });

  await page.goto("/app/agent");
  await page.getByText("which country's passport").waitFor();
  await page.screenshot({ path: "test-results/shot-fresh-light.png" });

  for (const answer of ["Nigeria", "Lagos", "United Kingdom", "Work"]) {
    await page.getByRole("button", { name: answer, exact: true }).click();
  }
  await page.getByText("Roughly when do you plan").waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/shot-answered-light.png" });

  // The correction path — the field says "Asking again" and keeps the
  // old value struck through while the dock re-asks.
  await page.getByRole("button", { name: /Edit your answer to: Destination/ }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: "test-results/shot-reopened-light.png" });

  await page.getByRole("button", { name: "United Kingdom", exact: true }).click();
  await page.getByRole("button", { name: /Transcript/ }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/shot-transcript-light.png" });
  await page.getByRole("button", { name: /Close the conversation/ }).click();

  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  await page.getByText("What is taking you there").waitFor();
  await page.screenshot({ path: "test-results/shot-answered-dark.png" });

  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByText("What is taking you there").waitFor();
  await page.screenshot({ path: "test-results/shot-mobile-light.png" });

  // ---- the completion bar, at both widths and both themes ----
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  for (const answer of [
    "Work",
    "Within a month",
    "₦2–4 million",
    "Employer housing",
    "Just me",
    "Nothing in particular",
    "No, never",
  ]) {
    await page.getByRole("button", { name: answer, exact: true }).click();
  }
  await page.getByText("Profile complete", { exact: true }).waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/shot-done-light.png" });

  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  await page.getByText("Profile complete", { exact: true }).waitFor();
  await page.screenshot({ path: "test-results/shot-done-dark.png" });

  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByText("Profile complete", { exact: true }).waitFor();
  await page.screenshot({ path: "test-results/shot-done-mobile.png" });
});
