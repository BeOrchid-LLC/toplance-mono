import { expect, test } from "@playwright/test";

import { resetFixtures, signUp, testEmail } from "./helpers/auth";
import {
  applicationCountFor,
  clearApplicationsFor,
  promoteToStaff,
} from "./helpers/db";

/**
 * The landing page and the generic auth doors, one persona at a time.
 *
 * The bug this spec pins down: roles live in Postgres, so the proxy and
 * the static landing page used to guess — every signed-in visitor was
 * treated as a traveller. A reviewer on `/` saw "Sign in", clicked it,
 * and landed on the traveller dashboard. The fix routes the generic
 * doors through `/go`, which reads the role and forwards, and the
 * landing page swaps its marketing nav for the visitor's own console
 * bar. Each test here walks one persona across that seam.
 */

const TRAVELLER_EMAIL = testEmail("routing.traveller");
const TRAVELLER_ON_EMPLOYER_EMAIL = testEmail("routing.traveller.onemployer");
const STAFF_EMAIL = testEmail("routing.staff");
const STAFF_ON_APP_EMAIL = testEmail("routing.staff.onapp");
const STAFF_ON_EMPLOYER_EMAIL = testEmail("routing.staff.onemployer");
const EMPLOYER_EMAIL = testEmail("routing.employer");
const ORG = "Routing Proof Ltd";

test("a signed-out visitor sees the marketing nav, not a console bar", async ({
  page,
}) => {
  await page.goto("/");

  // Scoped to the top nav: the footer keeps its marketing links for
  // everyone, signed in or not, and must not satisfy these.
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});

test("a traveller sees their own nav on the landing page and the generic door leads home", async ({
  page,
}) => {
  await resetFixtures([TRAVELLER_EMAIL]);
  await signUp(page, { email: TRAVELLER_EMAIL, fullName: "Adaeze Nwosu" });

  await page.goto("/");
  // The console bar, not the pitch: journey nav present, and the top
  // nav free of marketing links (the footer keeps its own set).
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "How it works" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Sign in" })).toHaveCount(0);

  // The old dead end: signed in, on /sign-in. Now it forwards through
  // /go to this persona's own console — which, for a traveller who has
  // not finished intake, walks one step further on to the agent.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/app(\/agent)?$/);
});

test("a reviewer sees the ops bar on the landing page and never the traveller surface", async ({
  page,
}) => {
  await resetFixtures([STAFF_EMAIL]);
  // `?next=/` keeps the new account off `/app`, which would create a
  // draft application for someone who is about to become staff.
  await signUp(page, {
    email: STAFF_EMAIL,
    fullName: "Ngozi Adeyemi",
    path: "/sign-up?next=/",
  });
  await promoteToStaff(STAFF_EMAIL);

  await page.goto("/");
  const queueLink = page.getByRole("link", { name: "Case queue" });
  await expect(queueLink).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Sign in" })
  ).toHaveCount(0);

  await queueLink.click();
  await expect(page).toHaveURL(/\/ops$/);
  await expect(page.getByRole("heading", { name: "Case queue" })).toBeVisible();

  // The reported bug, replayed: sign-in used to send staff to /app.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/ops$/);
});

/**
 * The dispatcher only covers people who arrive through a door. Anyone
 * who arrives at `/app` directly — a stale bookmark, a shared link, the
 * landing page's own logo before the persona resolves — used to be
 * handed the traveller shell on the strength of holding any profile at
 * all, because the layout checked that one existed and nothing more.
 */
test("a reviewer who opens the traveller console is sent to their own", async ({
  page,
}) => {
  await resetFixtures([STAFF_ON_APP_EMAIL]);
  await signUp(page, {
    email: STAFF_ON_APP_EMAIL,
    fullName: "Chidi Okonkwo",
    path: "/sign-up?next=/",
  });
  await promoteToStaff(STAFF_ON_APP_EMAIL);
  // Sign-up leaves a draft behind while the account is still a
  // traveller. Clearing it is what lets the assertion below mean
  // "nothing was written" rather than "nothing changed".
  await clearApplicationsFor(STAFF_ON_APP_EMAIL);

  await page.goto("/app");
  await expect(page).toHaveURL(/\/ops$/);

  // The guard has to land before the console provisions anything: the
  // traveller layout opens a draft application on sight, and a reviewer
  // must never come to own one.
  expect(await applicationCountFor(STAFF_ON_APP_EMAIL)).toBe(0);
});

/**
 * The employer console's own version of the guard above, and the reason
 * it cannot simply demand `org_member`: a legitimate new employer is
 * still a `traveler` when they arrive, because the role flips inside
 * `createOrganisationTx`. So `/employer` turns away exactly the two
 * accounts that transaction refuses — no more, or the sign-up below
 * would be walled off, and no fewer, or they get a form that fails at
 * submit.
 */
test("a traveller mid-case who opens the employer console is sent back to their own", async ({
  page,
}) => {
  await resetFixtures([TRAVELLER_ON_EMPLOYER_EMAIL]);
  // The default door lands on /app, which opens the draft application —
  // which is precisely what makes this account ineligible to found an
  // organisation on the same email.
  await signUp(page, {
    email: TRAVELLER_ON_EMPLOYER_EMAIL,
    fullName: "Amara Eze",
  });
  // Polled, not read once: `signUp` returns as soon as the browser
  // leaves the auth surface, and the layout's write lands a beat later.
  // The precondition is what makes the redirect below mean anything, so
  // it waits for the row rather than racing it.
  await expect
    .poll(() => applicationCountFor(TRAVELLER_ON_EMPLOYER_EMAIL))
    .toBe(1);

  await page.goto("/employer");
  await expect(page).toHaveURL(/\/app(\/agent)?$/);
  // Not the dead-end form it used to be handed.
  await expect(
    page.getByRole("heading", { name: "Name your organisation" })
  ).toHaveCount(0);
});

test("a reviewer who opens the employer console is sent to the case queue", async ({
  page,
}) => {
  await resetFixtures([STAFF_ON_EMPLOYER_EMAIL]);
  await signUp(page, {
    email: STAFF_ON_EMPLOYER_EMAIL,
    fullName: "Ifeoma Balogun",
    path: "/sign-up?next=/",
  });
  await promoteToStaff(STAFF_ON_EMPLOYER_EMAIL);
  await clearApplicationsFor(STAFF_ON_EMPLOYER_EMAIL);

  await page.goto("/employer");
  await expect(page).toHaveURL(/\/ops$/);
});

test("an employer sees the organisation bar on the landing page and the generic door leads to their console", async ({
  page,
}) => {
  await resetFixtures([EMPLOYER_EMAIL], [ORG]);
  await signUp(page, {
    email: EMPLOYER_EMAIL,
    fullName: "Folake Adebayo",
    path: "/employer/sign-up",
  });
  await expect(page).toHaveURL(/\/employer$/);

  // Membership (and the org_member role) begins with the organisation.
  await page.getByLabel("Organisation name").fill(ORG);
  await page.getByRole("button", { name: "Create organisation" }).click();
  await expect(page.getByRole("heading", { name: ORG })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "People" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Sign in" })
  ).toHaveCount(0);

  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/employer$/);
});
