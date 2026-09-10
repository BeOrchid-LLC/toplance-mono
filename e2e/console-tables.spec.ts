import { expect, test } from "@playwright/test";

import { resetFixtures, signUp, testEmail } from "./helpers/auth";
import {
  clearPagingAgencies,
  promoteToStaff,
  seedAgenciesForPaging,
} from "./helpers/db";
import { consoleNav } from "./helpers/console";

/**
 * "Everywhere there's a table." — 8 September, 00:38:41.
 *
 * Ten tables share one component, so the interesting failures are not in
 * any of them: they are in `DataTable`, and they are the two a screenshot
 * of page one cannot show. A serial column that restarts at 1 on page two
 * looks perfect until somebody pages; a pager rendered after the rows
 * looks fine on a short table and is invisible under a long one, which is
 * the reason it was asked to move.
 *
 * So this seeds past a page boundary and reads the number off the second
 * page. `?size=10` rather than the default 25 — the assertion is about
 * `rowOffset`, not about how many rows fit, and ten keeps the fixture to
 * twelve agencies instead of twenty-six.
 *
 * `/ops/tenants` stands for all ten. It is the one table that carries
 * every feature at once — numbering, a pager, a text search over two
 * columns, and a status filter — so a regression in the shared component
 * surfaces here first.
 */

const EMAIL = testEmail("tables");
const NAME = "Adaeze Okonkwo";
const ORG = "Table Numbering Agency";

/** Two more than one page of ten, so page two is short and unambiguous. */
const SEEDED = 12;

test.beforeEach(async () => {
  await clearPagingAgencies();
});

test.afterEach(async () => {
  await clearPagingAgencies();
});

test("a console table numbers its rows, and page two keeps counting", async ({
  page,
}) => {
  await resetFixtures([EMAIL], [ORG]);
  await seedAgenciesForPaging(SEEDED);

  await signUp(page, { email: EMAIL, fullName: NAME, orgName: ORG });
  await promoteToStaff(EMAIL);

  // Sorted by name so the seeded rows sit together and the order is the
  // same on every run — otherwise "the first row" means whatever the
  // heap handed back.
  await page.goto("/ops/tenants?size=10&sort=name&dir=asc&q=E2E+Numbering");

  const rows = page.getByRole("row");

  // ---- the column exists, and is the first thing in the row ----
  await expect(
    page.getByRole("columnheader", { name: "#", exact: true })
  ).toBeVisible();

  // ---- page one counts from one ----
  const firstCell = rows.nth(1).getByRole("cell").first();
  await expect(firstCell).toHaveText("1");

  // ---- the pager sits above the rows, not under them ----
  // Read as geometry rather than as DOM order: the ask was about what a
  // person can see without scrolling, and a pager that is earlier in the
  // markup but positioned below would satisfy the letter and miss it.
  const pager = page.getByRole("navigation", { name: /pag/i }).first();
  const table = page.getByRole("table").first();
  const pagerBox = await pager.boundingBox();
  const tableBox = await table.boundingBox();
  expect(pagerBox).not.toBeNull();
  expect(tableBox).not.toBeNull();
  expect(pagerBox!.y).toBeLessThan(tableBox!.y);

  // ---- page two starts at eleven ----
  // The whole point. `offset + i + 1`, not `i + 1`.
  await page.goto(
    "/ops/tenants?size=10&sort=name&dir=asc&q=E2E+Numbering&page=2"
  );
  await expect(rows.nth(1).getByRole("cell").first()).toHaveText("11");
});

test("the agencies table is searched by domain and filtered by status", async ({
  page,
}) => {
  await resetFixtures([EMAIL], [ORG]);
  await seedAgenciesForPaging(SEEDED);

  await signUp(page, { email: EMAIL, fullName: NAME, orgName: ORG });
  await promoteToStaff(EMAIL);

  await page.goto("/ops/tenants");

  // ---- the header says Status, not State ----
  // Renamed on 8 September. The URL parameter is still `state`, which is
  // correct — what Peace read was the header.
  await expect(
    page.getByRole("columnheader", { name: "Status" })
  ).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "State" })).toHaveCount(0);

  // ---- the search covers the domain, not only the name ----
  // `tenantMatches` joins both into one haystack; searching a string that
  // appears in no agency *name* is what tells the two apart.
  await page.goto("/ops/tenants?q=numbering-03.e2e.invalid");
  await expect(page.getByText("E2E Numbering 03")).toBeVisible();
  await expect(page.getByText("E2E Numbering 04")).toHaveCount(0);

  // ---- and the status filter narrows to live ----
  // Seeded agencies are never suspended, so a Live filter keeps them and
  // a Suspended one must not.
  await page.goto("/ops/tenants?q=E2E+Numbering&state=live");
  await expect(page.getByText("E2E Numbering 01")).toBeVisible();

  await page.goto("/ops/tenants?q=E2E+Numbering&state=suspended");
  await expect(page.getByText("E2E Numbering 01")).toHaveCount(0);
});

test("the platform rail uses the words the client asked for", async ({
  page,
}) => {
  await resetFixtures([EMAIL], [ORG]);

  // Owner, not a plain reviewer. Two of the rows under test are
  // owner-only — `admin-nav` guards the dashboard and Team on `isOwner`
  // — and a reviewer sent to `/ops/dashboard` gets the refusal screen,
  // which has no rail on it at all to read labels off.
  await signUp(page, { email: EMAIL, fullName: NAME, orgName: ORG });
  await promoteToStaff(EMAIL, "owner");

  await page.goto("/ops/dashboard");
  const nav = consoleNav(page);

  // The four renames, read off the rail rather than off the i18n module —
  // a label can be right in `ops-common.ts` and not reach the screen.
  await expect(nav.getByRole("link", { name: "Demo requests" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Agencies" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Team" })).toBeVisible();

  // And the words they replaced are gone from it.
  await expect(nav.getByRole("link", { name: "Enquiries" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Colleagues" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Clients" })).toHaveCount(0);
});
