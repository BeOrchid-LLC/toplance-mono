import { expect, test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

import { completeSignUpForm, resetFixtures, signUp, testEmail } from "./helpers/auth";
import { invitationTokenFor, localeAndCountryFor } from "./helpers/db";

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
 * skips, and since the sent sheet's "Copy link" button was removed
 * (2026-09-07) no screen hands the link over either. So the link is read
 * from the invitation row — see `invitationTokenFor` — and everything
 * after that is the invitee's real journey through a real token.
 */

const EMPLOYER_EMAIL = testEmail("employer");
const INVITEE_EMAIL = testEmail("invitee");
/** Somebody the invitation was not sent to, who opens the link anyway. */
const FORWARDED_EMAIL = testEmail("invitee.forwarded");
const ORG = "Kaduna Freight E2E";

/** The second journey's own fixtures — a director, a colleague, a client. */
const DESK_DIRECTOR = testEmail("desk.director");
const DESK_COLLEAGUE = testEmail("desk.colleague");
const DESK_CLIENT = testEmail("desk.client");
const DESK_ORG = "Jos Travel Desk E2E";
const INVITEE_NAME = "Ifeoma Nwosu";

test("an employer invites a traveller, who accepts and appears on the roster", async ({
  page,
  browser,
}) => {
  await resetFixtures([EMPLOYER_EMAIL, INVITEE_EMAIL, FORWARDED_EMAIL], [ORG]);

  // ---- the organisation ----
  // Named on the sign-up form itself, so the console this lands on
  // already has one. There used to be a second screen here — an account
  // that belonged to no organisation until the director filled in one
  // more form, which is the state they could close the tab in.
  await signUp(page, {
    email: EMPLOYER_EMAIL,
    fullName: "Bola Adeyemi",
    path: "/agency/sign-up",
    orgName: ORG,
    locale: "Hausa",
  });
  await page.waitForURL("**/agency");

  await expect(page.getByRole("heading", { name: ORG })).toBeVisible();

  /*
   * The language they chose before typing anything, read back off the
   * row rather than off the screen.
   *
   * `completeProfile` is a POST from the sign-up page, and Clerk
   * activating the session navigates that page out from under it — so
   * the write is cancelled, routinely rather than rarely. It carried the
   * phone, the country and the language, and `locale` defaults to `'en'`
   * in the schema, so losing it produced no blank to notice: the
   * traveller who picked Hausa was simply recorded as English.
   *
   * A non-default on purpose. Asserting `'en'` here would pass just as
   * well with the bug back in place.
   */
  expect(await localeAndCountryFor(EMPLOYER_EMAIL)).toMatchObject({
    locale: "ha",
  });

  // ---- the invitation ----
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email", { exact: true }).fill(INVITEE_EMAIL);
  await dialog.getByLabel("Full name", { exact: true }).fill(INVITEE_NAME);
  await dialog.getByRole("button", { name: "Send invitation" }).click();

  // The sheet states who it went to and how long it lives, and stops
  // there: the link is a 30-day bearer token and no screen prints it.
  await expect(dialog.getByText(INVITEE_EMAIL).first()).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Copy link" })).toHaveCount(0);
  await expect(dialog).not.toContainText("/invite/");

  // Composed against the origin this browser is already on, because
  // `APP_URL` belongs to the server rather than to this process.
  const inviteUrl = new URL(
    `/invite/${await invitationTokenFor(INVITEE_EMAIL)}`,
    page.url()
  ).toString();

  // ---- resending it, which is the only way back to a sent link ----
  // Nothing in the console ever shows the link: the sheet does not print
  // it and the roster deliberately never selects the token. So an
  // employer whose invitation email did not arrive has exactly one
  // remedy, and this is it — the same invitation, sent again, rather
  // than a second live one.
  await page.keyboard.press("Escape");

  // The roster and its invitations have their own page now — the
  // console's Clients tab. Everything below is a fact about a row, so
  // this is where the rest of this journey is watched from. Scoped to
  // the bar because the dashboard also links to this page from a card,
  // and Playwright matches an accessible name by substring.
  await page.getByRole("banner").getByRole("link", { name: "Clients" }).click();
  await page.waitForURL("**/agency/clients");

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
  // The same "Invite" as on the dashboard: every trigger in the console
  // is spelled alike. What differs is the dialog it opens — this is the
  // clients roster, so it is headed "Invite a client" and never asks
  // which kind of invitation it is. The page has already answered.
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  const second = page.getByRole("dialog");
  await second.getByLabel("Email", { exact: true }).fill(FORWARDED_EMAIL);
  await second.getByLabel("Full name", { exact: true }).fill("Chidi Balogun");
  await second.getByRole("button", { name: "Send invitation" }).click();
  const secondUrl = new URL(
    `/invite/${await invitationTokenFor(FORWARDED_EMAIL)}`,
    page.url()
  ).toString();
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
  // One client on the roster, and the invitation that put them there is
  // settled. The case reference rather than the traveller's name,
  // because the roster prints the name from their own profile and this
  // journey has no business asserting what the sign-up form wrote.
  //
  // Not the "1 client" badge: the count and the word are separate
  // elements with a CSS gap between them, so the accessible text has no
  // space in it and a `/1 client/` regex silently never matches.
  await expect(page.getByRole("heading", { name: "Your clients" })).toBeVisible();
  await expect(page.getByText(INVITEE_EMAIL).first()).toBeVisible();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();

  // ---- the case screen, which is what the roster is a way into ----
  const caseLink = page.getByRole("link", { name: /TPL-/ });
  await expect(caseLink).toBeVisible();
  await caseLink.click();
  await page.waitForURL("**/agency/clients/**");

  // The traveller has not finished intake, so there is no checklist to
  // judge yet — but the decision panel and the handler control are the
  // screen, and both are reachable on a real case for the first time
  // since #51 deleted the platform's.
  await expect(page.getByRole("heading", { name: INVITEE_NAME })).toBeVisible();
  await expect(page.getByText("Decision")).toBeVisible();
  await expect(page.getByRole("button", { name: "Take this case" })).toBeVisible();

  // Nobody holds it yet, so the whole agency can see it. Taking it is
  // what narrows that to this reviewer — `handlesCase` reads the column
  // this button writes.
  await page.getByRole("button", { name: "Take this case" }).click();
  await expect(page.getByRole("button", { name: "Hand back" })).toBeVisible();

  // The privacy promise is the console's front page, and stays there:
  // one laminate, on the screen you land on, none on the rosters or the
  // case it opens.
  await page.getByRole("banner").getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL("**/agency");
  await expect(page.getByText("The documents stop at your agency")).toBeVisible();
});


/**
 * Journey four: a colleague joins the agency and works a case.
 *
 * The reviewer's half of the v1.3 tenancy. A director invites somebody
 * to review, that person accepts and lands in the console — not the
 * traveller's product, though the accept redirect passes through it —
 * and their dashboard is their own desk rather than a summary of an
 * agency they do not run.
 *
 * The assertion that matters is the last pair: taking a case moves it
 * from the pool into "Assigned to you", which is the same column
 * `handlesCase` reads to decide who may open the documents. The screen
 * and the permission are the same fact.
 */
test("a colleague joins the agency, takes a case and sees it on their desk", async ({
  page,
  browser,
}) => {
  await resetFixtures([DESK_DIRECTOR, DESK_COLLEAGUE, DESK_CLIENT], [DESK_ORG]);

  // ---- the agency ----
  await signUp(page, {
    email: DESK_DIRECTOR,
    fullName: "Amina Sule",
    path: "/agency/sign-up",
    orgName: DESK_ORG,
  });
  await page.waitForURL("**/agency");

  // ---- a client, so the desk has something on it ----
  await page.getByRole("banner").getByRole("link", { name: "Clients" }).click();
  await page.waitForURL("**/agency/clients");
  await page.getByRole("button", { name: "Invite" }).click();
  const clientDialog = page.getByRole("dialog");
  // The button is spelled the same on every screen; the heading is what
  // names the kind, because the page has already supplied the noun.
  await expect(
    clientDialog.getByRole("heading", { name: "Invite a client" })
  ).toBeVisible();
  await clientDialog.getByLabel("Email", { exact: true }).fill(DESK_CLIENT);
  await clientDialog.getByLabel("Full name", { exact: true }).fill("Musa Danjuma");
  await clientDialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(clientDialog.getByText(DESK_CLIENT).first()).toBeVisible();
  await page.keyboard.press("Escape");
  const clientUrl = new URL(
    `/invite/${await invitationTokenFor(DESK_CLIENT)}`,
    page.url()
  ).toString();

  const clientContext = await browser.newContext();
  const client = await clientContext.newPage();
  await setupClerkTestingToken({ page: client });
  await client.goto(clientUrl);
  await client.getByRole("link", { name: "Set up your account" }).click();
  await completeSignUpForm(client, { email: DESK_CLIENT, fullName: "Musa Danjuma" });
  await client.waitForURL("**/invite/**");
  await client.getByRole("button", { name: "Accept invitation" }).click();
  await client.waitForURL("**/app/agent");
  await clientContext.close();

  // ---- the colleague ----
  // Only a director sees this button: `inviteTraveller` refuses a staff
  // invitation from anyone else, so the team page shows a reviewer no
  // control whose one outcome is a refusal.
  await page.getByRole("banner").getByRole("link", { name: "Team" }).click();
  await page.waitForURL("**/agency/team");
  await page.getByRole("button", { name: "Invite" }).click();
  const teamDialog = page.getByRole("dialog");
  await expect(
    teamDialog.getByRole("heading", { name: "Invite a team member" })
  ).toBeVisible();
  // The page has already answered "who are you inviting?", so the dialog
  // does not ask again.
  await expect(teamDialog.getByText("A colleague")).toHaveCount(0);
  await teamDialog.getByLabel("Email", { exact: true }).fill(DESK_COLLEAGUE);
  await teamDialog.getByLabel("Full name", { exact: true }).fill("Grace Okon");
  await teamDialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(teamDialog.getByText(DESK_COLLEAGUE).first()).toBeVisible();
  await page.keyboard.press("Escape");
  const colleagueUrl = new URL(
    `/invite/${await invitationTokenFor(DESK_COLLEAGUE)}`,
    page.url()
  ).toString();

  const colleagueContext = await browser.newContext();
  const colleague = await colleagueContext.newPage();
  await setupClerkTestingToken({ page: colleague });
  await colleague.goto(colleagueUrl);
  await colleague.getByRole("link", { name: "Set up your account" }).click();
  await completeSignUpForm(colleague, {
    email: DESK_COLLEAGUE,
    fullName: "Grace Okon",
  });
  await colleague.waitForURL("**/invite/**");
  await colleague.getByRole("button", { name: "Accept invitation" }).click();

  // Accepting redirects to the traveller's intake, which the `(app)`
  // layout bounces off the moment it reads the role `acceptInvitationTx`
  // just wrote. The colleague ends up in the console, never in the
  // traveller product.
  await colleague.waitForURL("**/agency");

  // ---- their desk ----
  await expect(
    colleague.getByRole("heading", { name: "Assigned to you" })
  ).toBeVisible();
  await expect(
    colleague.getByRole("heading", { name: "Open to your team" })
  ).toBeVisible();
  // Nothing of theirs yet, and the pool is where the work is.
  await expect(colleague.getByText(/Nothing is yours yet/)).toBeVisible();

  // The traveller pages are not theirs and never were — the layout sends
  // any non-traveller back to their own console.
  await colleague.goto("/app/documents");
  await colleague.waitForURL("**/agency");

  // The team roster is the director's screen, and a hidden tab is not a
  // guard — the path turns them away too.
  await expect(
    colleague.getByRole("banner").getByRole("link", { name: "Team" })
  ).toHaveCount(0);
  await colleague.goto("/agency/team");
  await colleague.waitForURL("**/agency");

  // Their clients page is their own book of work, and it is empty.
  await colleague.getByRole("banner").getByRole("link", { name: "Clients" }).click();
  await colleague.waitForURL("**/agency/clients");
  await expect(
    colleague.getByText(/You have not been assigned a client yet/)
  ).toBeVisible();

  // ---- taking a case, which is also taking the permission ----
  await colleague.getByRole("banner").getByRole("link", { name: "Dashboard" }).click();
  await colleague.waitForURL("**/agency");

  // The pool row is not a link: a reviewer may take an unheld case but
  // not read it, so the row carries the one action that is theirs.
  await expect(colleague.getByRole("link", { name: /TPL-/ })).toHaveCount(0);
  await colleague.getByRole("button", { name: "Take this case" }).click();

  // Once it is theirs it moves onto the desk, the pool empties, and the
  // case opens — the same column decided all three.
  await expect(colleague.getByText(/Nothing is yours yet/)).toHaveCount(0);
  await expect(colleague.getByText(/Nobody is waiting/)).toBeVisible();

  const mine = colleague.getByRole("link", { name: /TPL-/ });
  await expect(mine).toBeVisible();
  await mine.click();
  await colleague.waitForURL("**/agency/clients/**");
  await expect(
    colleague.getByRole("button", { name: "Hand back" })
  ).toBeVisible();

  await colleague.getByRole("banner").getByRole("link", { name: "Dashboard" }).click();
  await colleague.waitForURL("**/agency");

  // ---- and their own profile ----
  await colleague.goto("/agency/profile");
  await expect(colleague.getByRole("heading", { name: "Your profile" })).toBeVisible();
  await expect(colleague.getByText(DESK_COLLEAGUE)).toBeVisible();
  await expect(colleague.getByText("Grace Okon")).toBeVisible();

  await colleagueContext.close();
});
