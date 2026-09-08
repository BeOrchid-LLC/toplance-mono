import { expect, test } from "@playwright/test";

import { resetFixtures, signUp, testEmail } from "./helpers/auth";
import {
  clearDemoRequest,
  demoRequestAssignee,
  promoteToStaff,
  seedDemoRequest,
  seedSubmittedCase,
} from "./helpers/db";

/**
 * The platform console, after the v1.3 tenancy.
 *
 * This file used to hold journey two: a BeOrchid reviewer taking a
 * submitted case through review to approved. That journey no longer
 * belongs to BeOrchid. An agency reviews its own travellers' documents;
 * BeOrchid provisions agencies, curates routes and reads the audit log.
 *
 * What replaced it is the assertion the deletion was for. `policy.ts`
 * proves staff hold no permission, but the case screens never asked
 * `policy.ts` — they gated on `requireStaffConsole()` and then called
 * `getDocuments()` straight from the page. A unit test could not have
 * caught that, and this is the level at which it shows: the screen is
 * gone from a running server, not merely unreachable in principle.
 *
 * OWED: the review journey itself, rewritten against the agency console
 * once that console has a case screen. Until then no browser test covers
 * a document being verified, and that gap is deliberate and recorded
 * rather than papered over with a test of a screen that does not exist.
 *
 * Staff is granted the only way it can be (`update profiles set role =
 * 'staff'` — there is deliberately no code path), and the second factor
 * is stood down for this server only, via the `E2E_SKIP_STAFF_2FA` seam
 * `requireStaffConsole` reads.
 */

const EMAIL = testEmail("staff");
const NAME = "Ngozi Balogun";
const STAFF_ORG = "Ops Reviewer Agency";
const TRAVELLER = "Chukwuemeka Obi";

/**
 * Its own account, not the one above. The first test walks a case to a
 * 404 and back; sharing a signed-in session between two stories makes
 * either failure explainable by the other.
 */
const ENQUIRY_EMAIL = testEmail("enquiries");
const ENQUIRY_NAME = "Amara Nwosu";
const ENQUIRY_ORG = "Enquiry Desk Agency";
const ENQUIRY_COMPANY = "Kite Travel Partners";

test("the platform console curates routes, offers no way into a case, and is somewhere staff exist", async ({
  page,
}) => {
  await resetFixtures([EMAIL], [STAFF_ORG]);
  const seeded = await seedSubmittedCase(TRAVELLER);

  await signUp(page, { email: EMAIL, fullName: NAME, orgName: STAFF_ORG });

  // The `refuse` branch, worth proving on the way past.
  await page.goto("/ops");
  await expect(
    page.getByRole("heading", { name: "This console is for Toplance staff" })
  ).toBeVisible();

  await promoteToStaff(EMAIL);

  // ---- the console lands on route curation ----
  await page.goto("/ops");
  await page.waitForURL("**/ops/corridors");

  // ---- and the nav offers nothing else ----
  await expect(page.getByRole("link", { name: "Case queue" })).toHaveCount(0);

  // ---- the case screen is gone from the server, not merely unlinked ----
  // Reached by its real id, by an account that is genuinely staff and
  // past the second factor. This is the strongest form of the claim in
  // every agency's client terms.
  const response = await page.goto(`/ops/cases/${seeded.applicationId}`);
  expect(response?.status()).toBe(404);

  // Nothing of the traveller renders on the way to that 404.
  await expect(page.getByText(seeded.caseRef)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: TRAVELLER })).toHaveCount(0);

  // ---- and their own profile, reached the way staff actually reach it ----
  // Through the account menu rather than a typed URL: the page existing
  // and the console offering a way to it are two different claims, and
  // for six pages the second one was false — every `/ops` screen built
  // its account block by hand and left `profileHref` out, so the rail
  // named a member of staff and gave them nothing to click.
  await page.goto("/ops/corridors");

  // Opened from the keyboard rather than with a click. The account
  // control sits at the foot of the rail, which is exactly where
  // `next dev` parks its dev-tools badge: a portal that swallows the
  // pointer in this environment and exists in no other, and which
  // `force` does not get past either, since the click still lands on
  // whatever is topmost. Enter on the focused trigger is both immune to
  // that and a stronger claim about the control.
  await page.getByRole("button", { name: "Account menu" }).first().focus();
  await page.keyboard.press("Enter");

  // The item and where it points are two different claims: this menu is
  // shared by all three consoles and shows no profile item at all unless
  // the surface names its own page, which is what every `/ops` screen
  // failed to do.
  await expect(page.getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
    "href",
    "/ops/profile"
  );
  await page.keyboard.press("Escape");

  await page.goto("/ops/profile");

  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
  // Scoped to the page: the rail's account footer carries the same name
  // and address on every console screen, so an unscoped match finds two.
  await expect(page.getByRole("main").getByText(EMAIL)).toBeVisible();
  await expect(page.getByRole("main").getByText(NAME).first()).toBeVisible();

  // The rank, which is the one fact here they cannot edit — and a
  // promoted account has `staff_role = 'reviewer'`.
  await expect(
    page.getByRole("main").getByText("Toplance operations · reviewer")
  ).toBeVisible();

  // The photo control the rail falls back to initials for until it is
  // used. `toBeAttached` rather than `toBeVisible`: the input itself is
  // `sr-only` and the label around it is the target.
  await expect(page.getByLabel("Add profile photo")).toBeAttached();
});

/**
 * The enquiry queue.
 *
 * It existed before it had a screen — as a table at the foot of
 * `/ops/tenants`, under the agency list and its pagination, which is a
 * good way to own a sales queue and never read it. What this pins is
 * that it is now reachable from the rail, that a status still moves, and
 * that an assignment survives a reload: the column is new, so "it looked
 * right in the browser" is not evidence it was written.
 */
test("the enquiry queue is findable, and an enquiry can be moved and claimed", async ({
  page,
}) => {
  await resetFixtures([ENQUIRY_EMAIL], [ENQUIRY_ORG]);
  const requestId = await seedDemoRequest(ENQUIRY_COMPANY);

  try {
    await signUp(page, {
      email: ENQUIRY_EMAIL,
      fullName: ENQUIRY_NAME,
      orgName: ENQUIRY_ORG,
    });
    await promoteToStaff(ENQUIRY_EMAIL);

    // ---- reachable from the rail, which is the whole point ----
    await page.goto("/ops/corridors");
    const enquiries = page
      .getByRole("navigation", { name: "Console menu" })
      .getByRole("link", { name: "Enquiries" });
    await expect(enquiries).toBeVisible();
    await enquiries.click();
    await page.waitForURL("**/ops/enquiries");

    const row = page.getByRole("row").filter({ hasText: ENQUIRY_COMPANY });
    await expect(row).toBeVisible();

    // ---- the status still moves, from its new address ----
    await row.getByLabel("Status").selectOption("contacted");
    await expect(row.getByLabel("Status")).toHaveValue("contacted");

    // ---- and it can be claimed ----
    // Reloaded before asserting, and the database read after that: the
    // select showing a name proves the browser re-rendered, not that a
    // row was written.
    await expect(row.getByRole("button", { name: "Claim" })).toBeVisible();
    await row.getByRole("button", { name: "Claim" }).click();

    await expect(row.getByLabel("Assigned to")).toHaveValue(/.+/);
    await page.reload();

    const claimed = page.getByRole("row").filter({ hasText: ENQUIRY_COMPANY });
    await expect(claimed.getByLabel("Assigned to")).toHaveValue(/.+/);
    // Claiming assigns it to the reader, so a row that came back with
    // somebody else's id would be a worse failure than none at all.
    expect(await demoRequestAssignee(requestId)).not.toBeNull();

    // Once it is theirs, the shortcut has done its job and goes away.
    await expect(claimed.getByRole("button", { name: "Claim" })).toHaveCount(0);
  } finally {
    await clearDemoRequest(requestId);
  }
});
