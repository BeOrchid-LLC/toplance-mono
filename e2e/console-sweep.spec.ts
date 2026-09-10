import { expect, test } from "@playwright/test";

import {
  payAgencyPlan,
  resetFixtures,
  signUp,
  signUpInvited,
  testEmail,
} from "./helpers/auth";
import {
  activateOrganisation,
  approveApplicationFor,
  promoteToStaff,
  seedInvitation,
} from "./helpers/db";
import {
  emptyInvariants,
  measureInvariants,
  NARROW,
  pathFor,
  report,
} from "./helpers/invariants";

/**
 * The sweep, behind the auth wall.
 *
 * `sweep.spec.ts` covers the five routes a signed-out visitor can reach
 * and says why it stops there: extending it means holding a session, and
 * an invariant sweep that can fail because somebody else's fixture
 * drifted is a sweep nobody re-runs. That objection is about *sharing* a
 * fixture, so this file does not share one — it signs up its own two
 * accounts, named for this spec, and resets them first.
 *
 * It exists because the agency and ops consoles are the least-tested
 * surfaces in the product and the most-used. They are 17 static routes
 * where a reviewer spends the day; between them they had no browser
 * coverage of overflow, direction or painted contrast at all, and the
 * wayfinding repaint reached them through the token layer without either
 * console being opened. A repaint nobody measured on a phone, in Arabic,
 * is a repaint that has not been checked where it is most likely to be
 * wrong: dense tables at 390px, in a language that runs the other way.
 *
 * Two locales rather than ten, deliberately. `en` and `ar` are the pair
 * that can fail differently — `ar` is the only RTL locale, and it is
 * where a hardcoded `left-` in a shared console component shows. The
 * other eight differ from `en` in string length, and the public sweep
 * already runs all ten over the shared chrome these pages are built
 * from. Ten × 17 × 2 themes would be an hour of wall clock to re-prove
 * what the cheap half already proves.
 *
 * Detail routes (`/agency/clients/[id]`, `/ops/kyb/[id]`, …) are not
 * here. They need a seeded row each, and a sweep whose setup is longer
 * than its assertions is the thing this file is trying not to be. They
 * are named in the handoff as the remaining gap rather than left
 * unmentioned.
 */

const AGENCY_EMAIL = testEmail("sweep-director");
const AGENCY_NAME = "Folasade Adeyemi";
const AGENCY_ORG = "Sweep Travel Partners";

const OPS_EMAIL = testEmail("sweep-ops");
const OPS_NAME = "Ibrahim Danjuma";
const OPS_ORG = "Sweep Ops Agency";

const APP_EMAIL = testEmail("sweep-traveller");
const APP_NAME = "Aisha Bello";
const APP_ORG = "Sweep Sponsor Agency";

/** Static agency console routes. A director sees all of these. */
const AGENCY_ROUTES = [
  "/agency",
  "/agency/clients",
  "/agency/clients/invitations",
  "/agency/rule-sets",
  "/agency/verification",
  "/agency/profile",
  "/agency/team",
  "/agency/support",
  "/agency/billing",
];

/** Static platform console routes. Director-only ones included. */
const OPS_ROUTES = [
  "/ops/dashboard",
  "/ops/tenants",
  "/ops/kyb",
  "/ops/corridors",
  "/ops/enquiries",
  "/ops/support",
  "/ops/staff",
  "/ops/profile",
];

/**
 * The traveller's own screens. Every one of these bounces to
 * `/app/agent` until intake is finished, and `/app/companion` bounces to
 * `/app` until a decision has been made — so a sweep of a brand-new
 * account measures the intake screen seven times and reports it green.
 */
const APP_ROUTES = [
  "/app",
  "/app/requirements",
  "/app/documents",
  "/app/companion",
  "/app/messages",
  "/app/agent",
  "/app/profile",
];

const LOCALES = [
  { code: "en", dir: "ltr" },
  { code: "ar", dir: "rtl" },
] as const;

/**
 * Each of these two tests measures 32–36 pages behind one sign-up, and
 * the suite-wide 180s is sized for a journey of a dozen clicks. Raising
 * it here rather than there keeps every other spec's budget honest.
 *
 * The sign-up is why the routes are not one test each, which would have
 * been the tidier shape: a session costs 20–30 seconds to establish and
 * cannot be shared across Playwright tests without a storage-state
 * fixture, so 36 tests would spend twenty minutes signing in.
 */
test.describe.configure({ timeout: 900_000 });

/**
 * Walk the routes and measure. Fails loudly if a route bounced to
 * `/sign-in` — a signed-out measurement is a measurement of the sign-in
 * page, which the public sweep already covers, and reporting it as a
 * pass for `/ops/tenants` would be the worst outcome available.
 */
async function sweepRoutes(
  page: import("@playwright/test").Page,
  routes: readonly string[]
) {
  const found = emptyInvariants();
  const bounced: string[] = [];

  for (const { code, dir } of LOCALES) {
    for (const theme of ["light", "dark"] as const) {
      for (const route of routes) {
        const path = pathFor(code, route);
        /**
         * `domcontentloaded`, not `networkidle`.
         *
         * The public sweep can wait for the network to go quiet because a
         * signed-out page eventually does. A console page does not:
         * Clerk keeps a session refresh in flight, so `networkidle`
         * waits out the whole test budget on the first route and reports
         * a timeout that looks like a slow page rather than a wait that
         * can never finish. `measureInvariants` does its own settling —
         * fonts ready, transitions killed, then a beat — which is what
         * the measurement actually depends on.
         */
        await page.goto(path, { waitUntil: "domcontentloaded" });

        /**
         * Let the gates finish before measuring.
         *
         * These routes redirect: unpaid to billing, unactivated to
         * verification, a reviewer off an owner-only screen. With
         * `domcontentloaded` the first document is handed over before
         * that redirect has run, so `page.evaluate` inside
         * `measureInvariants` ran against a context that then went away —
         * "Execution context was destroyed, most likely because of a
         * navigation", which reads as a flaky browser and is really the
         * measurement starting too early.
         *
         * Settle on the URL rather than on the network: `networkidle`
         * never arrives behind Clerk's session refresh, and what matters
         * here is only that no further navigation is pending.
         */
        for (let i = 0; i < 10; i++) {
          const before = page.url();
          await page.waitForTimeout(250);
          if (page.url() === before) break;
        }
        await page.waitForLoadState("load");

        const landed = new URL(page.url()).pathname;
        if (/\/sign-in|\/sign-up/.test(landed)) {
          bounced.push(`${path} → ${landed}`);
          continue;
        }

        await measureInvariants(page, {
          path: `${path} [${theme}]`,
          theme,
          dir,
          into: found,
        });
      }
    }
  }

  return { found, bounced };
}

function assertInvariants(
  found: ReturnType<typeof emptyInvariants>,
  bounced: string[]
) {
  expect(bounced, `lost the session — these were measured signed out:\n${bounced.join("\n")}`).toEqual([]);
  expect.soft(found.mirrored, `wrong direction:\n${report(found.mirrored)}`).toEqual([]);
  expect.soft(found.overflow, `overflows 390px:\n${report(found.overflow)}`).toEqual([]);
  expect.soft(found.contrast, `under the contrast floor:\n${report(found.contrast)}`).toEqual([]);
}

test("the agency console holds its invariants at 390px, both themes, LTR and RTL", async ({
  page,
}) => {
  await resetFixtures([AGENCY_EMAIL], [AGENCY_ORG]);
  await signUp(page, {
    email: AGENCY_EMAIL,
    fullName: AGENCY_NAME,
    orgName: AGENCY_ORG,
  });
  // Two gates, in this order, or every route below measures a holding
  // screen instead of the screen it names. A fresh agency is
  // pending-verification and is walked off every console route including
  // billing; once it is let in, the paywall is what stands in the way.
  await activateOrganisation(AGENCY_ORG);
  await page.goto("/agency/billing");
  await payAgencyPlan(page);

  await page.setViewportSize(NARROW);
  const { found, bounced } = await sweepRoutes(page, AGENCY_ROUTES);
  assertInvariants(found, bounced);
});

test("the platform console holds its invariants at 390px, both themes, LTR and RTL", async ({
  page,
}) => {
  await resetFixtures([OPS_EMAIL], [OPS_ORG]);
  await signUp(page, { email: OPS_EMAIL, fullName: OPS_NAME, orgName: OPS_ORG });
  // `owner`, not the default `reviewer`: the dashboard, tenants, KYB and
  // staff screens are director-only, and a reviewer session would measure
  // four copies of the refusal screen and report them green.
  await promoteToStaff(OPS_EMAIL, "owner");

  await page.setViewportSize(NARROW);
  const { found, bounced } = await sweepRoutes(page, OPS_ROUTES);
  assertInvariants(found, bounced);
});

test("the traveller's screens hold their invariants at 390px, both themes, LTR and RTL", async ({
  page,
}) => {
  await resetFixtures([APP_EMAIL], [APP_ORG]);

  // The only way a traveller exists: an agency invited them.
  const token = await seedInvitation(APP_EMAIL, APP_ORG);
  await signUpInvited(page, { email: APP_EMAIL, fullName: APP_NAME, token });

  // Bought rather than walked. Intake is a conversation with a model and
  // a decision is a reviewer's working day; `traveller.spec.ts` and
  // `client-spec-traveller.spec.ts` prove both through the UI, and
  // repeating them here would buy nothing but an hour. What this sweep
  // needs is the state on the far side — an approved application with a
  // finished checklist — because that is the only state in which all
  // seven screens render themselves rather than a redirect.
  await approveApplicationFor(APP_EMAIL);

  await page.setViewportSize(NARROW);
  const { found, bounced } = await sweepRoutes(page, APP_ROUTES);
  assertInvariants(found, bounced);
});
