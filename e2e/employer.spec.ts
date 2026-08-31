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
/** Somebody the invitation was not sent to, who opens the link anyway. */
const FORWARDED_EMAIL = testEmail("invitee.forwarded");
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
  await resetFixtures([EMPLOYER_EMAIL, INVITEE_EMAIL, FORWARDED_EMAIL], [ORG]);

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

  // ---- resending it, which is the only way back to a sent link ----
  // The dialog's copy of the URL is the last time anyone sees it: the
  // roster deliberately never selects the token. So an employer whose
  // invitation email did not arrive has exactly one remedy, and this is
  // it — the same invitation, sent again, rather than a second live one.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Resend" }).click();
  await expect(page.getByText(`Invitation sent again to ${INVITEE_EMAIL}`)).toBeVisible();

  // Still one invitation, still pending — a resend must not mint a row.
  await expect(page.getByRole("button", { name: "Resend" })).toHaveCount(1);

  // ---- somebody else, who was forwarded the link ----
  // The invited address is binding. A link is a bearer credential, so
  // holding one proves it was received and nothing about who is holding
  // it.
  //
  // The refusal now arrives on the form, before Clerk has been told
  // anything. It used to arrive after an account existed and the emailed
  // code had been spent — correct, and far too late to act on, which
  // under invite-only cost a traveller who merely mistyped the only
  // route they have into the product.
  const forwardedContext = await browser.newContext();
  const forwarded = await forwardedContext.newPage();
  await setupClerkTestingToken({ page: forwarded });

  await forwarded.goto(inviteUrl);
  await forwarded.getByRole("link", { name: "Set up your account" }).click();

  await forwarded.getByLabel("Full name", { exact: true }).fill("Chidi Balogun");
  await forwarded.getByLabel("Email", { exact: true }).fill(FORWARDED_EMAIL);
  await forwarded.getByRole("button", { name: "Continue" }).click();

  // Scoped to the form: Next mounts its own `role="alert"` route
  // announcer on every page, so an unscoped alert role matches two.
  await expect(forwarded.getByRole("main").getByRole("alert")).toHaveText(
    "That invitation was sent to a different email address."
  );
  // The negative is the whole of it: no code screen means no account was
  // made and no code was spent. The invited address is still never named
  // back at whoever is holding the link.
  await expect(
    forwarded.getByRole("heading", { name: "Enter the code we emailed you" })
  ).toBeHidden();
  await expect(forwarded.locator("main")).not.toContainText(INVITEE_EMAIL);
  await forwardedContext.close();

  // ---- the invitee, in a browser of their own ----
  const inviteeContext = await browser.newContext();
  const invitee = await inviteeContext.newPage();
  await setupClerkTestingToken({ page: invitee });

  await invitee.goto(inviteUrl);
  await expect(
    invitee.getByRole("heading", { name: `${ORG} is sponsoring your visa application` })
  ).toBeVisible();

  await invitee.getByRole("link", { name: "Set up your account" }).click();
  await completeSignUpForm(invitee, { email: INVITEE_EMAIL, fullName: INVITEE_NAME });

  // The sign-up door derived its destination from the token it was
  // opened with, so the invitation is waiting.
  await invitee.waitForURL("**/invite/**");
  await invitee.getByRole("button", { name: "Accept invitation" }).click();
  await invitee.waitForURL("**/app/agent");

  // ---- the screen a traveller who already has an account still meets ----
  // Sign-up refuses a wrong address outright now, so the way to arrive
  // signed in as somebody an invitation does not name is to already have
  // an account — the colleague case this page was built for, and the one
  // route to it that survives. A second invitation, to a different
  // address, opened by the traveller who just accepted the first.
  await page.reload();
  await page.getByRole("button", { name: "Invite someone" }).click();
  const second = page.getByRole("dialog");
  await second.getByLabel("Email", { exact: true }).fill(FORWARDED_EMAIL);
  await second.getByLabel("Full name", { exact: true }).fill("Chidi Balogun");
  await second.getByRole("button", { name: "Send invitation" }).click();
  const secondUrl = await readInviteUrl(second);
  await page.keyboard.press("Escape");

  await invitee.goto(secondUrl);
  await expect(
    invitee.getByRole("heading", { name: "This invitation is for a different account" })
  ).toBeVisible();
  // Told which account they are on. The invited address is never named
  // back at them — this page needs no session, so it would be printing a
  // third party's email to whoever holds the link.
  await expect(invitee.locator("main")).toContainText(INVITEE_EMAIL);
  await expect(invitee.locator("main")).not.toContainText(FORWARDED_EMAIL);
  // No button whose only outcome is an error toast, and none of the
  // anonymous doors that lead back here.
  await expect(invitee.getByRole("button", { name: "Accept invitation" })).toHaveCount(0);
  await expect(invitee.getByRole("link", { name: "Set up your account" })).toHaveCount(0);

  // The way out is the one that changes something, and it lands back on
  // the invitation rather than on the marketing page.
  await invitee.getByRole("button", { name: "Sign out and use another address" }).click();
  await invitee.waitForURL("**/invite/**");
  await expect(invitee.getByRole("link", { name: "Set up your account" })).toBeVisible();
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
