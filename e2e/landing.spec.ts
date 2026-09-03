import { expect, test } from "@playwright/test";

/**
 * The two landing pages, and the boundary between them.
 *
 * `/` used to address the traveller while its own call to action led to
 * `/employer/sign-up` — a door travellers cannot open, since they became
 * invite-only. The fix turned `/` over to the organisations who actually
 * buy seats and moved the traveller copy, unchanged, to `/travellers`
 * (the client asked for the B2B to be expanded and the B2C kept).
 *
 * Both halves of that need pinning. Nothing stops the B2C voice drifting
 * back into `/` one well-meant copy edit at a time, and nothing stops
 * `/travellers` being quietly dropped as an orphan — it is reachable
 * only from the chrome, so a nav tidy-up could strand a page the client
 * is still reviewing.
 *
 * Signed out throughout: neither page needs an account, so none of this
 * touches the Clerk fixtures the other specs share.
 */

test("the home page sells seats to organisations, not checklists to travellers", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Sponsor the seat. See the progress. Never see the passport.",
      level: 1,
    })
  ).toBeVisible();

  // The commercial detail the expansion was actually for. A buyer who
  // cannot find the exclusions and the terms has the old page back,
  // whatever the headline says.
  await expect(page.getByText("What a seat does not cover")).toBeVisible();
  await expect(page.getByText("Commercial terms")).toBeVisible();
  await expect(page.getByText("Minimum commitment")).toBeVisible();

  // Both halves of what a seat buys are named, so the page cannot
  // collapse back to one undifferentiated feature list.
  await expect(page.getByText("What the traveller gets")).toBeVisible();
  await expect(page.getByText("What your organisation gets")).toBeVisible();
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

test("the traveller page survives, and the chrome still reaches it", async ({
  page,
}) => {
  await page.goto("/");

  // Scoped to the nav: the footer carries its own link to the same page,
  // and the point here is that the top-level chrome names it too.
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "For travellers" })
    .click();

  await expect(page).toHaveURL(/\/travellers$/);

  // The B2C copy the client asked us not to delete, word for word.
  await expect(
    page.getByRole("heading", {
      name: "Know exactly what your visa needs — before you spend a naira on it",
      level: 1,
    })
  ).toBeVisible();
  await expect(page.getByText("No card needed to see your checklist")).toBeVisible();
});
