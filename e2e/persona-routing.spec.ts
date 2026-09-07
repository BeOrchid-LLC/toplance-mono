import { expect, test } from "@playwright/test";

import { resetFixtures, signUp, signUpInvited, testEmail } from "./helpers/auth";
import {
  applicationCountFor,
  seedInvitation,
  promoteToStaff,
} from "./helpers/db";

/**
 * The landing page and the generic auth doors, one persona at a time.
 *
 * The bug this spec pins down: roles live in Postgres, so the proxy and
 * the static landing page used to guess — every signed-in visitor was
 * treated as a traveller. A reviewer on `/` saw "Sign in", clicked it,
 * and landed on the traveller dashboard. The fix routes the generic
 * doors through `/go`, which reads the role and forwards. Each test
 * here walks one persona across that seam.
 *
 * The landing page itself deliberately does not take part. It used to
 * swap its marketing nav for the visitor's own console bar; the header
 * is now the same for everyone, signed in or out, so each persona's
 * test asserts that it is *unchanged* and leans on `/sign-in` — the
 * marketing bar's own door — to do the forwarding. That door is the
 * thing that was broken, and it is still the thing under test.
 */

const TRAVELLER_EMAIL = testEmail("routing.traveller");
const TRAVELLER_ON_EMPLOYER_EMAIL = testEmail("routing.traveller.onemployer");
const STAFF_EMAIL = testEmail("routing.staff");
const STAFF_ON_APP_EMAIL = testEmail("routing.staff.onapp");
const STAFF_ON_EMPLOYER_EMAIL = testEmail("routing.staff.onemployer");
const EMPLOYER_EMAIL = testEmail("routing.employer");
const ORG = "Routing Proof Ltd";
// Every account now begins at a door that asks for an organisation,
// so a reviewer fixture is a director who was promoted — which is
// also the only way a real one comes into being. Each spec gets its
// own, so a leaked row from one cannot collide with another.
const STAFF_ORG = "Routing Reviewer Agency";
const STAFF_ON_APP_ORG = "Routing Reviewer On App Agency";
const STAFF_ON_EMPLOYER_ORG = "Routing Reviewer On Employer Agency";
const TRAVELLER_ORG = "Routing Traveller Sponsor";
const MIDCASE_ORG = "Routing Midcase Sponsor";

test("a signed-out visitor sees the marketing nav, not a console bar", async ({
  page,
}) => {
  await page.goto("/");

  // Scoped to the top nav: the footer keeps its marketing links for
  // everyone, signed in or not, and must not satisfy these.
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});

/**
 * One door, and the two it replaced still answer.
 *
 * `/sign-in` used to name an organisation door and an operations door
 * beneath the form, which asked a visitor to classify themselves before
 * they had typed anything and then handed them the same form. The
 * classification never decided access — roles live in Postgres and `/go`
 * reads them once the session exists — so all it could do was be wrong
 * for anyone who guessed.
 *
 * The redirects are not tidiness. Both paths are printed in the footer,
 * on the landing page and in invitation emails already sent, and a live
 * invitation lasts 30 days.
 *
 * Signed out throughout, so this needs no account.
 */
test("the sign-in door names no others, and the retired ones still answer", async ({
  page,
}) => {
  await page.goto("/sign-in");

  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /Organisation sign-in/ })).toHaveCount(0);
  await expect(
    main.getByRole("link", { name: /Toplance operations sign-in/ })
  ).toHaveCount(0);
  // The form itself is still here, and is now everyone's.
  await expect(main.getByRole("heading", { name: "Sign in" })).toBeVisible();

  const agency = await page.goto("/agency/sign-in");
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(agency?.status()).toBe(200);

  const ops = await page.goto("/ops/sign-in");
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(ops?.status()).toBe(200);

  // A lapsed session is bounced out with `?next=`, and the retired door
  // has to carry it across or the person loses their place.
  await page.goto("/ops/sign-in?next=/ops/cases/123");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fops%2Fcases%2F123$/);
});

test("a traveller sees the unchanged marketing header and the generic door leads home", async ({
  page,
}) => {
  await resetFixtures([TRAVELLER_EMAIL], [TRAVELLER_ORG]);
  const token = await seedInvitation(TRAVELLER_EMAIL, TRAVELLER_ORG);
  await signUpInvited(page, {
    email: TRAVELLER_EMAIL,
    fullName: "Adaeze Nwosu",
    token,
  });

  await page.goto("/");
  // The pitch, not a console bar. Signing in changes nothing here, so
  // this is the same assertion the signed-out test makes. Positives are
  // scoped to the top nav because the footer carries its own copy of
  // the marketing links; "Dashboard" appears in neither.
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  // The old dead end: signed in, on /sign-in. Now it forwards through
  // /go to this persona's own console — which, for a traveller who has
  // not finished intake, walks one step further on to the agent.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/app(\/agent)?$/);
});

test("a reviewer sees the unchanged marketing header and never the traveller surface", async ({
  page,
}) => {
  await resetFixtures([STAFF_EMAIL], [STAFF_ORG]);
  // The employer door, which is `signUp`'s default now that the
  // traveller one needs an invitation. It lands on `/agency` rather
  // than `/app`, so no draft application is opened for an account that
  // is about to become staff — and no invitation has to be minted and
  // thrown away just to get a session.
  await signUp(page, {
    email: STAFF_EMAIL,
    fullName: "Ngozi Adeyemi",
    orgName: STAFF_ORG,
  });
  await promoteToStaff(STAFF_EMAIL);

  await page.goto("/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
  // Neither console's bar leaks onto the marketing page — not this
  // reviewer's own, and certainly not the traveller's.
  await expect(page.getByRole("link", { name: "Case queue" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  // The reported bug, replayed: sign-in used to send staff to /app. It
  // is also how a reviewer now leaves this page, the header having no
  // console link of its own to offer them.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/ops\/corridors$/);
  // `/ops` redirects here: route curation is what the platform console
  // does now, and the case queue it used to open on is deleted.
  await expect(page.getByRole("heading", { name: "Route coverage" })).toBeVisible();
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
  await resetFixtures([STAFF_ON_APP_EMAIL], [STAFF_ON_APP_ORG]);
  await signUp(page, {
    email: STAFF_ON_APP_EMAIL,
    fullName: "Chidi Okonkwo",
    orgName: STAFF_ON_APP_ORG,
  });
  await promoteToStaff(STAFF_ON_APP_EMAIL);
  // Nothing to clear first any more: the employer door never opened a
  // draft, so the assertion below now means "no application has ever
  // existed for this account" rather than "none was added back".

  await page.goto("/app");
  await expect(page).toHaveURL(/\/ops\/corridors$/);

  // The guard has to land before the console provisions anything: the
  // traveller layout opens a draft application on sight, and a reviewer
  // must never come to own one.
  expect(await applicationCountFor(STAFF_ON_APP_EMAIL)).toBe(0);
});

/**
 * The employer console's own version of the guard above. A new employer
 * now arrives already holding `org_member` — `completeProfile` writes it
 * at sign-up — but with no membership row, so `/agency` still cannot
 * decide by role alone. It turns away exactly the two accounts
 * `createOrganisationTx` refuses: no more, or the sign-up below would be
 * walled off, and no fewer, or they get a form that fails at submit.
 */
test("a traveller mid-case who opens the employer console is sent back to their own", async ({
  page,
}) => {
  await resetFixtures([TRAVELLER_ON_EMPLOYER_EMAIL], [MIDCASE_ORG]);
  // Accepting an invitation lands on the agent, which opens the draft
  // application — which is precisely what makes this account ineligible
  // to found an organisation on the same email.
  const token = await seedInvitation(TRAVELLER_ON_EMPLOYER_EMAIL, MIDCASE_ORG);
  await signUpInvited(page, {
    email: TRAVELLER_ON_EMPLOYER_EMAIL,
    fullName: "Amara Eze",
    token,
  });
  // Polled, not read once: the helper returns as soon as the browser
  // reaches the agent, and the layout's write lands a beat later.
  // The precondition is what makes the redirect below mean anything, so
  // it waits for the row rather than racing it.
  await expect
    .poll(() => applicationCountFor(TRAVELLER_ON_EMPLOYER_EMAIL))
    .toBe(1);

  await page.goto("/agency");
  await expect(page).toHaveURL(/\/app(\/agent)?$/);
  // Not the dead-end form it used to be handed.
  await expect(
    page.getByRole("heading", { name: "Name your organisation" })
  ).toHaveCount(0);
});

test("a reviewer who opens the employer console is sent to the case queue", async ({
  page,
}) => {
  await resetFixtures([STAFF_ON_EMPLOYER_EMAIL], [STAFF_ON_EMPLOYER_ORG]);
  await signUp(page, {
    email: STAFF_ON_EMPLOYER_EMAIL,
    fullName: "Ifeoma Balogun",
    orgName: STAFF_ON_EMPLOYER_ORG,
  });
  await promoteToStaff(STAFF_ON_EMPLOYER_EMAIL);

  await page.goto("/agency");
  await expect(page).toHaveURL(/\/ops\/corridors$/);
});

test("an employer sees the unchanged marketing header and the generic door leads to their console", async ({
  page,
}) => {
  await resetFixtures([EMPLOYER_EMAIL], [ORG]);
  // Membership (and the org_member role) begins with the organisation,
  // which the sign-up form now asks for alongside the name and address.
  await signUp(page, {
    email: EMPLOYER_EMAIL,
    fullName: "Folake Adebayo",
    path: "/agency/sign-up",
    orgName: ORG,
  });
  await expect(page).toHaveURL(/\/agency$/);
  await expect(page.getByRole("heading", { name: ORG })).toBeVisible();

  await page.goto("/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "People" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/agency$/);
});
