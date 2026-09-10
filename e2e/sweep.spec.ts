import { expect, test } from "@playwright/test";

import { LOCALES } from "@/lib/i18n/locales";
import {
  emptyInvariants,
  measureInvariants,
  NARROW,
  pathFor,
  report,
} from "./helpers/invariants";

/**
 * The sweep. Plan 5 of the wayfinding redesign, and the only one of the
 * four surface plans whose harness does not have to wait for the
 * surfaces: it asserts invariants rather than appearances, so it cannot
 * go stale when a screen is redesigned under it.
 *
 * The invariants themselves, and why each is measured in a browser
 * rather than asserted in a unit test, are in `helpers/invariants.ts` —
 * shared with `console-sweep.spec.ts`, which runs the same three checks
 * over the routes that need a session.
 *
 * Signed out throughout, like `landing.spec.ts`, so it shares no Clerk
 * fixture with the journey specs and cannot be made flaky by them. That
 * bounds it to the five routes below — every console route redirects to
 * `/sign-in` without a session, which is what the console sweep exists
 * to reach.
 */

/** Public signed-out routes, verified by probe rather than assumed. */
const ROUTES = ["/", "/travelers", "/sign-in", "/sign-up", "/agency/sign-up"];

for (const { code, dir } of LOCALES) {
  for (const theme of ["light", "dark"] as const) {
    test(`${code} · ${theme} · 390px holds its invariants`, async ({ page }) => {
      await page.setViewportSize(NARROW);
      const found = emptyInvariants();

      for (const route of ROUTES) {
        const path = pathFor(code, route);
        await page.goto(path, { waitUntil: "networkidle" });
        await measureInvariants(page, { path, theme, dir, into: found });
      }

      expect
        .soft(found.mirrored, `wrong direction:\n${report(found.mirrored)}`)
        .toEqual([]);
      expect
        .soft(found.overflow, `overflows 390px:\n${report(found.overflow)}`)
        .toEqual([]);
      expect
        .soft(found.contrast, `under the contrast floor:\n${report(found.contrast)}`)
        .toEqual([]);
    });
  }
}
