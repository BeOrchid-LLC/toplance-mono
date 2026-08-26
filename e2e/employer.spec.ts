import { expect, test, type Locator } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

import { completeSignUpForm, resetFixtures, signUp, testEmail } from "./helpers/auth";

/**
 * Journey three: an organisation sponsors somebody.
 *
 * The employer names an org, invites a traveller, hands the link over,
 * and the traveller — in a browser that has never seen this site —
 * accepts it and becomes a row on the roster. The two halves genuinely
 * run in two contexts: an invitation that only works in the tab that
 * created it would not be an invitation.
 *
 * `RESEND_API_KEY` is blank on the e2e server, so `sendEmail` logs and
 * skips. That is the local reality the dialog was built for: the
 * copyable link is the hand-off, the email is the bonus.
 */

const EMPLOYER_EMAIL = testEmail("employer");
const INVITEE_EMAIL = testEmail("invitee");
const ORG = "Kaduna Freight E2E";
const INVITEE_NAME = "Ifeoma Nwosu";

/**
 * The invitation link, out of whatever shape the sent sheet is in — an
 * anchor if it has one, otherwise the link printed on the sheet. Either
 * way it is found by being an `/invite/` URL rather than by sitting in a
 * particular corner of the dialog.
 */
async function readInviteUrl(dialog: Locator): Promise<string> {
  let link: string | undefined;

  await expect
    .poll(
      async () => {
        const anchor = dialog.locator('a[href*="/invite/"]');
        if (await anchor.count()) {
          const href = await anchor.first().getAttribute("href");
          if (href) {
            link = new URL(href, "http://localhost").toString();
            return true;
          }
        }

        link = (await dialog.innerText()).match(/https?:\/\/\S+\/invite\/\S+/)?.[0];
        return Boolean(link);
      },
      { message: "waiting for the sent sheet to hand over an /invite/ link" }
    )
    .toBe(true);

  return link as string;
}

test("an employer invites a traveller, who accepts and appears on the roster", async ({
  page,
  browser,
}) => {
  await resetFixtures([EMPLOYER_EMAIL, INVITEE_EMAIL], [ORG]);

  // ---- the organisation ----
  await signUp(page, {
    email: EMPLOYER_EMAIL,
    fullName: "Bola Adeyemi",
    path: "/employer/sign-up",
  });
  await page.waitForURL("**/employer");

  await expect(page.getByRole("heading", { name: "Name your organisation" })).toBeVisible();
  await page.getByLabel("Organisation name").fill(ORG);
  await page.getByRole("button", { name: "Create organisation" }).click();
  await expect(page.getByRole("heading", { name: ORG })).toBeVisible();

  // ---- the invitation ----
  await page.getByRole("button", { name: "Invite someone" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email", { exact: true }).fill(INVITEE_EMAIL);
  await dialog.getByLabel("Full name", { exact: true }).fill(INVITEE_NAME);
  await dialog.getByLabel("Destination").selectOption({ label: "United Kingdom" });
  await dialog.getByRole("button", { name: "Send invitation" }).click();

  const inviteUrl = await readInviteUrl(dialog);
  expect(inviteUrl).toContain("/invite/");

  // ---- the invitee, in a browser of their own ----
  const inviteeContext = await browser.newContext();
  const invitee = await inviteeContext.newPage();
  await setupClerkTestingToken({ page: invitee });

  await invitee.goto(inviteUrl);
  await expect(
    invitee.getByRole("heading", { name: `${ORG} is sponsoring your visa application` })
  ).toBeVisible();

  await invitee.getByRole("link", { name: "Create an account" }).click();
  await completeSignUpForm(invitee, { email: INVITEE_EMAIL, fullName: INVITEE_NAME });

  // Signing up carried the `next` through, so the invitation is waiting.
  await invitee.waitForURL("**/invite/**");
  await invitee.getByRole("button", { name: "Accept invitation" }).click();
  await invitee.waitForURL("**/app/agent");
  await inviteeContext.close();

  // ---- and on the roster, from the other side of the privacy boundary ----
  await page.reload();
  // One person on the roster, and the invitation that put them there is
  // settled. The seat line rather than the traveller's name, because the
  // roster prints the name from their own profile and this journey has
  // no business asserting what the sign-up form wrote.
  await expect(page.getByText(/1 person/)).toBeVisible();
  await expect(page.getByText(INVITEE_EMAIL).first()).toBeVisible();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await expect(page.getByText("You see progress, never documents")).toBeVisible();
});
