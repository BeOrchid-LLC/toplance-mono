import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

import { payAgencyPlan, resetFixtures, signUp, testEmail } from "./helpers/auth";
import { activateOrganisation, invitationTokenFor } from "./helpers/db";
import { consoleNav } from "./helpers/console";

/**
 * The desk asks one traveller for a document the corridor never listed,
 * and the traveller uploads it.
 *
 * Proves the gap closed on 10 September. Before it, a reviewer could
 * send a case back saying "Additional documents needed" and write a
 * sentence about what they wanted, but had nowhere to put the document:
 * every `documents` row came out of `adoptRuleSet`, from corridor
 * requirements. The traveller read "Everything is verified. Nothing else
 * is waiting on you" beside a status card asking for documents, with no
 * upload button for the thing being asked for.
 *
 * Both sides in one story, in two browser contexts, because the claim is
 * about the seam between them: a row written by the agency has to arrive
 * on the traveller's screen as an ordinary checklist item, and their
 * upload has to arrive back as an ordinary review.
 *
 * Screenshots land in `PROOFS` as they go. They are evidence for a human
 * reading the run, not assertions — every claim below is also asserted.
 */

test.describe.configure({ mode: "serial" });

/**
 * Beside Playwright's own output, which `.gitignore` already covers.
 * Relative to this file rather than to `process.cwd()`, so the run does
 * not depend on which directory the suite was started from.
 */
const PROOFS = join(__dirname, "..", "test-results", "requested-documents");

const AGENCY_EMAIL = testEmail("reqdocs.agency");
const TRAVELLER_EMAIL = testEmail("reqdocs.traveller");
const ORG = "Requested Docs Agency";
const AGENT_NAME = "Bola Adeyemi";
const NAME = "Chidinma Eze";
const FIXTURE = join(__dirname, "fixtures/passport.jpg");

/** What the reviewer asks for — free text, no catalogue behind it. */
const ASKED_FOR = "Bank statements, last 6 months";
const GUIDANCE = "Every page, showing your name and the balance.";

/**
 * The twelve intake chips, lifted from `client-spec-traveller.spec.ts`.
 * Walked in full because there is no checklist until intake is done, and
 * no document to ask alongside until there is a checklist.
 */
const INTAKE = [
  `Yes — ${NAME}`,
  "Nigeria",
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
] as const;

/**
 * One checklist row, found by the document it is about — the same
 * locator the other document specs use: a row is the innermost element
 * carrying both the heading and the (visually hidden) file inputs.
 */
function documentRow(page: Page, name: string) {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .filter({ has: page.locator('input[type="file"]') })
    .last();
}

let agency: Page;
let traveller: Page;

test("an agency asks for a document, and the traveller uploads it", async ({
  browser,
}) => {
  test.setTimeout(600_000);

  await resetFixtures([AGENCY_EMAIL, TRAVELLER_EMAIL], [ORG]);

  /* ---- the agency ---- */

  agency = await browser.newPage();
  await signUp(agency, {
    email: AGENCY_EMAIL,
    fullName: AGENT_NAME,
    path: "/agency/sign-up",
    orgName: ORG,
  });
  /*
   * Two gates, in this order. A fresh agency is pending-verification and
   * is walked off every console route including billing, so activating
   * first is what makes the paywall the thing standing in the way.
   */
  await activateOrganisation(ORG);
  await agency.goto("/agency/billing");
  await payAgencyPlan(agency);
  await expect(agency.getByRole("heading", { name: ORG })).toBeVisible();

  /* ---- the traveller, invited ---- */

  await consoleNav(agency).getByRole("link", { name: "Clients" }).click();
  await agency.waitForURL("**/agency/clients");

  await agency.getByRole("button", { name: "Invite", exact: true }).click();
  const invite = agency.getByRole("dialog");
  await invite.getByLabel("Email", { exact: true }).fill(TRAVELLER_EMAIL);
  await invite.getByLabel("Full name", { exact: true }).fill(NAME);
  await invite.getByRole("button", { name: "Send invitation" }).click();
  await expect(invite.getByText(TRAVELLER_EMAIL).first()).toBeVisible();
  await agency.keyboard.press("Escape");

  const inviteUrl = new URL(
    `/invite/${await invitationTokenFor(TRAVELLER_EMAIL)}`,
    agency.url()
  ).toString();

  const travellerContext = await browser.newContext();
  traveller = await travellerContext.newPage();
  await setupClerkTestingToken({ page: traveller });

  await traveller.goto(inviteUrl);
  await traveller.getByRole("link", { name: "Set up your account" }).click();

  await traveller.getByLabel("Full name", { exact: true }).fill(NAME);
  await traveller.getByRole("button", { name: "Continue" }).click();
  await traveller.getByRole("textbox", { name: "Six-digit code" }).fill("424242");
  await traveller.getByRole("button", { name: "Verify and continue" }).click();

  await traveller.waitForURL("**/invite/**");
  await traveller.getByRole("button", { name: "Accept invitation" }).click();
  await traveller.waitForURL("**/checkout");
  await traveller.getByRole("button", { name: "Pay and start" }).click();
  await traveller.waitForURL("**/app/agent");

  /* ---- intake, so a checklist exists to ask alongside ---- */

  for (const chip of INTAKE) {
    await traveller.getByRole("button", { name: chip, exact: true }).click();
  }
  await expect(
    traveller.getByText("Profile complete", { exact: true }).first()
  ).toBeVisible();

  await traveller.goto("/app/documents");
  const beforeRows = await traveller.locator('input[type="file"]').count();

  /* ================================================================ *
   * 1 — the reviewer asks for something the corridor never listed
   * ================================================================ */

  await consoleNav(agency).getByRole("link", { name: "Clients" }).click();
  await agency.waitForURL("**/agency/clients");
  await agency.getByRole("link", { name: NAME }).first().click();
  await agency.waitForURL("**/agency/clients/**");

  const askButton = agency.getByRole("button", { name: "Ask for a document" });
  await expect(askButton).toBeVisible();
  await askButton.click();

  const ask = agency.getByRole("dialog");
  await expect(ask.getByRole("heading", { name: "Ask for a document" })).toBeVisible();
  // Says the two things a reviewer has to know before typing.
  await expect(ask).toContainText("this traveller's checklist only");
  await ask.getByLabel("What do you need?").fill(ASKED_FOR);
  await ask.getByLabel("Anything they should know").fill(GUIDANCE);

  // The dialog fades in, and a page screenshot does not wait for that
  // the way an element screenshot would — caught mid-transition the
  // proof is a half-transparent form nobody can read.
  await agency.waitForTimeout(600);
  await agency.screenshot({ path: `${PROOFS}/1-agency-asks.png`, fullPage: false });

  await ask.getByRole("button", { name: "Ask for it" }).click();
  await expect(agency.getByText("Added to their checklist")).toBeVisible();

  /* The row, on the desk's own screen, marked as not the corridor's. */
  await agency.reload();
  const deskRow = agency
    .locator("div")
    .filter({ has: agency.getByRole("heading", { name: ASKED_FOR, exact: true }) })
    .last();
  await expect(deskRow).toContainText("Asked for");
  await expect(
    agency.getByRole("button", { name: `Withdraw ${ASKED_FOR}` })
  ).toBeVisible();

  await agency.screenshot({ path: `${PROOFS}/2-agency-row.png`, fullPage: true });

  /* ================================================================ *
   * 2 — it arrives on the traveller's checklist, with somewhere to put it
   * ================================================================ */

  await traveller.goto("/app/documents");

  const row = documentRow(traveller, ASKED_FOR);
  await expect(row).toBeVisible();
  // Why it appeared: a person asked, rather than the list changing.
  await expect(row).toContainText("Your agency asked for this one");
  // The reviewer's own sentence, carried through to the traveller.
  await expect(row).toContainText(GUIDANCE);
  /*
   * One more row than before the ask. Counted in file inputs, of which
   * every row carries two — the camera and the file picker — so one new
   * row is two more inputs, not one.
   */
  expect(await traveller.locator('input[type="file"]').count()).toBe(beforeRows + 2);

  await row.scrollIntoViewIfNeeded();
  await traveller.screenshot({ path: `${PROOFS}/3-traveller-sees.png`, fullPage: true });

  /* ================================================================ *
   * 3 — the traveller uploads it, and it goes for review like any other
   * ================================================================ */

  await row.locator('input[type="file"]').last().setInputFiles(FIXTURE);

  // The upload's own modal, which every upload on this screen raises.
  const outcome = traveller.getByRole("dialog");
  await expect(outcome).toBeVisible();
  await outcome.getByRole("button", { name: /Close|Done|Keep going/ }).first().click();

  await traveller.goto("/app/documents");
  const uploaded = documentRow(traveller, ASKED_FOR);
  await expect(uploaded).not.toContainText("Not started");

  await traveller.screenshot({ path: `${PROOFS}/4-traveller-uploaded.png`, fullPage: true });

  /* ---- and the desk can no longer withdraw what was filled ---- */

  await agency.reload();
  await expect(
    agency.getByRole("button", { name: `Withdraw ${ASKED_FOR}` })
  ).toHaveCount(0);

  await agency.screenshot({ path: `${PROOFS}/5-agency-received.png`, fullPage: true });
});

test.afterAll(async () => {
  await agency?.close();
  await traveller?.close();
});
