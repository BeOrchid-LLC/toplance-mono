import { expect, test } from "@playwright/test";

import { resetFixtures, signUp, testEmail } from "./helpers/auth";
import { promoteToStaff } from "./helpers/db";

/**
 * The director's dashboard, and the boundary around it.
 *
 * Both halves matter, and the second is the one worth a browser: the
 * dashboard is the first screen in this console that separates a
 * reviewer from a director. `staff_role` has carried that distinction
 * since the corridor approval gate, but `requireStaffConsole` never read
 * it — every ops screen gated on staff-ness alone. A gate asserted only
 * in a unit test is a gate that has never been walked into.
 *
 * The rail is asserted alongside the gate deliberately. A hidden link is
 * the courtesy and the gate is the guard, and the two disagreeing — a
 * row offered to somebody the page then refuses — is the failure that
 * only shows up in a browser.
 */

const EMAIL = testEmail("dashboard-owner");
const NAME = "Ngozi Adeyemi";
const STAFF_ORG = "Dashboard Owner Agency";

test("only a director sees the dashboard, in the rail and on the page", async ({
  page,
}) => {
  await resetFixtures([EMAIL], [STAFF_ORG]);
  await signUp(page, { email: EMAIL, fullName: NAME, orgName: STAFF_ORG });

  // ---- a reviewer: works the console, never sees revenue ----
  await promoteToStaff(EMAIL, "reviewer");

  await page.goto("/ops");
  await page.waitForURL("**/ops/corridors");
  // The rail must not offer a row that would only refuse them.
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  await page.goto("/ops/dashboard");
  await expect(
    page.getByRole("heading", { name: "The dashboard is for Directors" })
  ).toBeVisible();
  // Refused on the role, and told which role — not told they are not
  // staff, which they are.
  await expect(page.getByText("carries revenue and client billing")).toBeVisible();

  // ---- a director: the same URL, with the screen on it ----
  await promoteToStaff(EMAIL, "owner");

  await page.goto("/ops/corridors");
  await expect(
    page.getByRole("link", { name: "Dashboard" }).first()
  ).toBeVisible();

  await page.goto("/ops/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // The four tabs, and a figure behind each one. Scoped to the tile's
  // own `<dt>` — "Collected" is also a series in the chart legend, which
  // is the point of the legend and not a second tile.
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
  await expect(
    page.getByRole("term").filter({ hasText: /^Collected$/ })
  ).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: /^MRR$/ })).toBeVisible();

  await page.getByRole("tab", { name: "Clients" }).click();
  await expect(page.getByText("Every client, busiest first")).toBeVisible();

  await page.getByRole("tab", { name: "Operations" }).click();
  await expect(page.getByText("Where applications stop")).toBeVisible();
  await expect(page.getByText("Approval rate")).toBeVisible();

  await page.getByRole("tab", { name: "Demand" }).click();
  await expect(page.getByText("Top destinations")).toBeVisible();

  // The chart's fills are chosen for dark rather than flipped into it —
  // the theme's own bright semantic steps sit above the lightness band a
  // categorical palette needs, and read as glowing slabs at this size.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByText("Revenue by billing cycle")).toBeVisible();
});
