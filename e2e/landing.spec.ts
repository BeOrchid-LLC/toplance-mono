import { expect, test } from "@playwright/test";

/**
 * The two landing pages, and the boundary between them.
 *
 * `/` used to address the traveller while its own call to action led to
 * `/employer/sign-up` — a door travellers cannot open, since they became
 * invite-only. The fix turned `/` over to the organisations who actually
 * buy, and moved the traveller copy, unchanged, to `/travelers` (the
 * client asked for the B2B to be expanded and the B2C kept).
 *
 * That buyer has since been named more precisely: the page sold "seats"
 * to employers relocating staff, and now sells case management to travel
 * agencies running visas for their travelers. The vocabulary moved with
 * it — a seat became a case, an organisation became an agency, and the
 * client's copy doc of 2026-09-05 renamed that agency's client a
 * "traveler" — so the assertions below are pinned to the agency wording
 * rather than the employer wording they were written in.
 *
 * Both halves of that need pinning. Nothing stops the B2C voice drifting
 * back into `/` one well-meant copy edit at a time, and nothing stops
 * `/travelers` being quietly dropped as an orphan — it is reachable
 * only from the chrome, so a nav tidy-up could strand a page the client
 * is still reviewing.
 *
 * Signed out throughout: neither page needs an account, so none of this
 * touches the Clerk fixtures the other specs share.
 */

test("the home page sells case management to agencies, not checklists to travellers", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Handle more travelers, with far less chasing.",
      level: 1,
    })
  ).toBeVisible();

  // The commercial detail the expansion was actually for. A buyer who
  // cannot find the exclusions and the terms has the old page back,
  // whatever the headline says.
  await expect(page.getByText("What a case does not cover")).toBeVisible();
  await expect(page.getByText("Commercial terms")).toBeVisible();
  await expect(page.getByText("Minimum commitment")).toBeVisible();

  // Both halves of what a case buys are named, so the page cannot
  // collapse back to one undifferentiated feature list. The agency and
  // the traveler it acts for want different things from the same case,
  // and the page has to say both.
  await expect(page.getByText("Your traveler gets")).toBeVisible();
  await expect(page.getByText("Your agency gets")).toBeVisible();
});

/**
 * The regression that started all of this, asserted as an absence.
 *
 * These are the promises a page makes to someone who cannot act on
 * them: a free checklist, and no card needed to get it. Both were on
 * `/` while `/` sent every reader to an employer sign-up.
 */
test("the home page makes no promise a traveller could act on", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("See your checklist")).toHaveCount(0);
  await expect(page.getByText("No card needed")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /before you spend a naira/i })
  ).toHaveCount(0);
});

/**
 * The page was `/travellers` until the 01/09 review moved the interface
 * to the US spelling. It is linked from the nav and the footer, so the
 * old path is somebody's bookmark: it redirects rather than 404s, and
 * this pins that it keeps doing so.
 */
test("the pre-rename traveller URL still lands on the page", async ({ page }) => {
  const response = await page.goto("/travellers");

  await expect(page).toHaveURL(/\/travelers$/);
  expect(response?.status()).toBe(200);
});

test("the traveller page survives, and the chrome still reaches it", async ({
  page,
}) => {
  await page.goto("/");

  // Scoped to the nav: the footer carries its own link to the same page,
  // and the point here is that the top-level chrome names it too.
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "For travelers" })
    .click();

  await expect(page).toHaveURL(/\/travelers$/);

  // The B2C copy the client asked us not to delete, word for word.
  await expect(
    page.getByRole("heading", {
      name: "Know exactly what your visa needs — before you spend a naira on it",
      level: 1,
    })
  ).toBeVisible();
  await expect(page.getByText("No card needed to see your checklist")).toBeVisible();
});

/**
 * The regression this file did not catch, and the reason it now does.
 *
 * `SiteNav` rendered its links inside a `hidden lg:flex` container with
 * no fallback of any kind — no trigger, no sheet, nothing. Below 1024px
 * both landing pages had zero navigation: every section was unreachable
 * from the chrome on exactly the mid-range Android `CorridorBar`'s own
 * comments say this page is mostly read on.
 *
 * Asserted at a phone width, because at desktop widths the bug is
 * invisible — which is how it shipped.
 */
test.describe("the small-screen menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("carries the navigation the bar has no room for", async ({ page }) => {
    await page.goto("/");

    // The links are genuinely absent from the bar itself at this width —
    // if they were merely visually hidden this test would pass while the
    // bar stayed unusable.
    await expect(page.getByRole("navigation").getByRole("link", { name: "Pricing" })).toHaveCount(0);

    await page.getByRole("button", { name: "Open menu" }).click();

    const menu = page.getByRole("dialog");
    for (const label of ["How it works", "Where you can go", "Pricing", "For travelers", "Sign in"]) {
      await expect(menu.getByRole("link", { name: label })).toBeVisible();
    }

    // A way out that is not the Escape key. Hiding this in favour of
    // "tap the trigger again" does not work: Radix makes the body
    // inert while the sheet is open, so the trigger cannot be clicked.
    await expect(menu.getByRole("button", { name: "Close" })).toBeVisible();

    await menu.getByRole("link", { name: "Pricing" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/#pricing$/);
  });
});
