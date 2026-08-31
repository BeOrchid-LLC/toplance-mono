import { expect, type Page } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

import { deleteClerkUsers } from "./clerk";
import { resetAccounts } from "./db";

/**
 * Clerk's test addresses: any address whose local part ends in
 * `+clerk_test` skips real delivery and accepts one fixed code. The
 * suite therefore signs in through the product's own form — the same
 * `auth-form.tsx` a traveller uses — rather than through a back door
 * that would prove nothing about it.
 */
export const OTP_CODE = "424242";

export function testEmail(slug: string): string {
  return `toplance.e2e.${slug}+clerk_test@example.com`;
}

/**
 * Everything a previous run of these addresses left behind, on both
 * sides: the Clerk account (or the next sign-up is refused as a
 * duplicate) and the Postgres rows that hang off it.
 */
export async function resetFixtures(
  emails: string[],
  organisationNames: string[] = []
): Promise<void> {
  await deleteClerkUsers(emails);
  await resetAccounts(emails, organisationNames);
}

/**
 * Sign up through the real form: name, email, the six-digit code, and
 * whatever `completeProfile` writes on the way through.
 *
 * `path` decides which door. Since travellers became invite-only
 * (2026-08-31) the only two that open are `/employer/sign-up` and
 * `/sign-up?token=…`, so specs that just need *an account* — the staff
 * ones, which promote it afterwards — go through the employer door.
 * That door asks for no phone number and lands on `/employer`, which
 * unlike `/app` opens no draft application for an account that is about
 * to become staff.
 *
 * For a traveller, use `signUpInvited` rather than composing the token
 * URL by hand: signing up is only half of it, and the half that leaves
 * the account attached to an organisation is the accept.
 */
export async function signUp(
  page: Page,
  {
    email,
    fullName,
    path = "/employer/sign-up",
  }: { email: string; fullName: string; path?: string }
): Promise<void> {
  // Replays the testing token on every Frontend API call this browser
  // makes, which is what gets a scripted sign-up past bot protection.
  await setupClerkTestingToken({ page });

  await page.goto(path);
  await completeSignUpForm(page, { email, fullName });
}

/**
 * The form itself, for the one journey that arrives at it by clicking
 * rather than by URL — an invitee following the link an employer sent
 * them. `setupClerkTestingToken` must already have run for that page.
 */
export async function completeSignUpForm(
  page: Page,
  { email, fullName }: { email: string; fullName: string }
): Promise<void> {
  await page.getByLabel("Full name", { exact: true }).fill(fullName);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(
    page.getByRole("heading", { name: "Enter the code we emailed you" })
  ).toBeVisible();

  await page.getByRole("textbox", { name: "Six-digit code" }).fill(OTP_CODE);
  await page.getByRole("button", { name: "Verify and continue" }).click();

  // Leaving the auth surface means the session is live. It does *not*
  // mean the profile row exists yet: `completeProfile` runs after
  // `finalize()`, and Clerk's session activation refreshes the router
  // underneath it, so the write and the navigation race. Nothing here
  // waits on the row — `promoteToStaff` does, where a spec needs it.
  await page.waitForURL((url) => !url.pathname.includes("sign-up"));
}

/**
 * The whole traveller entry, which is now two acts rather than one: the
 * invitation's token opens `/sign-up`, and the accept on `/invite/<token>`
 * is what attaches the organisation and lands them on the agent.
 *
 * Specs used to reach the same place with `?next=/app/agent`. That query
 * parameter is gone from this door — the destination is derived from the
 * token — so waiting for the agent here keeps every caller's next line
 * true without each of them knowing why.
 */
export async function signUpInvited(
  page: Page,
  { email, fullName, token }: { email: string; fullName: string; token: string }
): Promise<void> {
  await setupClerkTestingToken({ page });

  await page.goto(`/sign-up?token=${encodeURIComponent(token)}`);
  await completeSignUpForm(page, { email, fullName });

  await page.waitForURL(`**/invite/${token}`);
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await page.waitForURL("**/app/agent");
}
