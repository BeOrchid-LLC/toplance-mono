import { expect, test } from "@playwright/test";

import { completeSignUpForm, resetFixtures, signUp, testEmail } from "./helpers/auth";
import { invitationTokenFor, promoteToStaff } from "./helpers/db";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

/**
 * BeOrchid inviting its own people.
 *
 * The journey this replaces was `update profiles set role = 'staff'` in
 * a psql window — which is still how the *first* owner is made, and how
 * this spec makes theirs, because there is deliberately no code path to
 * the first one.
 *
 * Two claims worth a browser: that a reviewer is turned away from the
 * screen by URL and not merely by a hidden tab, and that an accepted
 * invitation lands the new colleague at the second-factor wall rather
 * than inside the console. The second is the one a unit test cannot
 * make — `decideStaffGate` is pure and already covered, but nothing
 * except a running server proves the console is actually behind it.
 */

const OWNER = testEmail("ops-owner");
const REVIEWER = testEmail("ops-reviewer");
const COLLEAGUE = testEmail("ops-colleague");
const OWNER_ORG = "Platform Owner Agency";
const REVIEWER_ORG = "Platform Reviewer Agency";

test("an owner invites a BeOrchid colleague, and a reviewer cannot", async ({
  page,
  browser,
}) => {
  await resetFixtures([OWNER, REVIEWER, COLLEAGUE], [OWNER_ORG, REVIEWER_ORG]);

  await signUp(page, { email: OWNER, fullName: "Adaeze Umeh", orgName: OWNER_ORG });
  await promoteToStaff(OWNER, "owner");

  // ---- the colleagues screen is the owner's ----
  await page.goto("/ops/staff");
  await expect(page.getByRole("heading", { name: "Colleagues" })).toBeVisible();
  await expect(page.getByText("Nobody has been invited yet.")).toBeVisible();

  // ---- inviting one ----
  await page.getByRole("button", { name: "Invite a colleague" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email address").fill(COLLEAGUE);
  await dialog.getByLabel("Full name").fill("Kwame Mensah");
  await dialog.getByRole("button", { name: "Send invitation" }).click();

  // ---- and it appears on the roster, as a reviewer ----
  await expect(page.getByText(COLLEAGUE)).toBeVisible();
  await expect(page.getByRole("button", { name: "Revoke" })).toBeVisible();

  // ---- a reviewer is offered the tab, and refused the screen ----
  const reviewerContext = await browser.newContext();
  const reviewerPage = await reviewerContext.newPage();
  await signUp(reviewerPage, {
    email: REVIEWER,
    fullName: "Sipho Dlamini",
    orgName: REVIEWER_ORG,
  });
  await promoteToStaff(REVIEWER, "reviewer");

  await reviewerPage.goto("/ops/corridors");
  await expect(reviewerPage.getByRole("link", { name: "Colleagues" })).toHaveCount(0);

  // The hidden link is the courtesy; this is the guard.
  await reviewerPage.goto("/ops/staff");
  await reviewerPage.waitForURL("**/ops/corridors");
  await reviewerContext.close();

  // ---- the invited colleague signs up and meets the second factor ----
  const token = await invitationTokenFor(COLLEAGUE);
  const colleagueContext = await browser.newContext();
  const colleaguePage = await colleagueContext.newPage();

  await setupClerkTestingToken({ page: colleaguePage });
  await colleaguePage.goto(`/sign-up?token=${encodeURIComponent(token)}`);
  await completeSignUpForm(colleaguePage, {
    email: COLLEAGUE,
    fullName: "Kwame Mensah",
  });

  await colleaguePage.waitForURL(`**/invite/${token}`);
  await expect(
    colleaguePage.getByRole("heading", {
      name: "BeOrchid has invited you to the platform console",
    })
  ).toBeVisible();

  await colleaguePage.getByRole("button", { name: "Accept invitation" }).click();

  /*
   * Wait for the accept to land before asking the server anything else.
   * The action redirects to the traveller's intake, which the `(app)`
   * layout bounces off the role `acceptInvitationTx` just wrote — so the
   * colleague arrives in the platform console on their own. Navigating
   * before that settles renders `/ops` for an account that is still a
   * traveller, and the refusal it prints does not re-render.
   */
  await colleaguePage.waitForURL("**/ops/**");

  /**
   * Accepting made them staff, which is the claim: `/ops` refuses any
   * account that is not, and this one now reaches route curation.
   *
   * The enrollment wall is *not* asserted here, and cannot be — this
   * server runs with `E2E_SKIP_STAFF_2FA=1`, because the suite cannot
   * walk a real authenticator-app enrollment. `decideStaffGate` covers
   * that branch as a pure function; what only a browser can show is that
   * the console is behind the gate at all.
   */
  await colleaguePage.goto("/ops/corridors");
  await expect(
    colleaguePage.getByRole("heading", { name: "This console is for Toplance staff" })
  ).toHaveCount(0);
  await expect(colleaguePage.getByRole("link", { name: "Routes" })).toBeVisible();

  // A reviewer, because that is the rank the invitation carried — not
  // the owner who sent it.
  await expect(colleaguePage.getByRole("link", { name: "Colleagues" })).toHaveCount(0);

  await colleagueContext.close();
});
