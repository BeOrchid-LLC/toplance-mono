import { expect, test } from "@playwright/test";

import { resetFixtures, signUp, testEmail } from "./helpers/auth";
import {
  clearSeededCorridor,
  corridorIsLive,
  promoteToStaff,
  seedPendingCorridor,
} from "./helpers/db";

/**
 * Journey three: the approval gate.
 *
 * The claim under test is the one the coverage plan rests on — a drafted
 * corridor reaches no traveller until a super admin says so, and a
 * reviewer is not a super admin. Both halves matter: a gate that refuses
 * everyone is not a gate, it is an outage.
 *
 * The draft is seeded through the database for the same reason the ops
 * spec seeds its case: this journey is about the decision, not about
 * producing something to decide on. The row it writes is the row
 * `scripts/draft-corridor.mts` writes — dark, at version 1, pending.
 */

const EMAIL = testEmail("corridor-owner");
const NAME = "Amara Eze";

test.afterAll(async () => {
  await clearSeededCorridor();
});

test("a reviewer may read a draft but only an owner can publish it", async ({
  page,
}) => {
  await resetFixtures([EMAIL]);
  const draft = await seedPendingCorridor();

  await signUp(page, { email: EMAIL, fullName: NAME });

  // ---- a reviewer: reads everything, decides nothing ----
  await promoteToStaff(EMAIL, "reviewer");

  await page.goto("/ops/corridors");
  await expect(page.getByRole("heading", { name: "Corridor coverage" })).toBeVisible();
  // The seeded corridors have never been verified by anyone, and the
  // console says so rather than borrowing their effective dates.
  await expect(page.getByText("Never checked").first()).toBeVisible();

  await page.goto(`/ops/corridors/${draft.corridorId}`);
  await expect(page.getByRole("heading", { name: /ZQ → ZR/ })).toBeVisible();
  await expect(page.getByText("Awaiting review").first()).toBeVisible();
  // Reading the draft and its source is the point of letting a reviewer
  // in — the requirement and its link are both on the page.
  await expect(page.getByText(draft.docName)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the source" })).toBeVisible();

  await expect(
    page.getByText("Only a super admin can approve a corridor.")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve and publish" })
  ).toHaveCount(0);

  // Still dark, and still dark for the traveller.
  expect(await corridorIsLive(draft.corridorId)).toBe(false);

  // ---- an owner: the same screen, with the decision on it ----
  await promoteToStaff(EMAIL, "owner");
  await page.goto(`/ops/corridors/${draft.corridorId}`);

  const approve = page.getByRole("button", { name: "Approve and publish" });
  await expect(approve).toBeVisible();
  await approve.click();

  await expect(
    page.getByText("Approving publishes this version")
  ).toHaveCount(0, { timeout: 15_000 });

  // The decision reached the database, which is what a traveller
  // resolves against — not merely the screen.
  expect(await corridorIsLive(draft.corridorId)).toBe(true);
  await expect(page.getByText(`Approved by ${NAME}`)).toBeVisible();
});
