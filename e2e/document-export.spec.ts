import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Download, type Page } from "@playwright/test";

import { setupClerkTestingToken } from "@clerk/testing/playwright";

import {
  completeSignUpForm,
  payAgencyPlan,
  resetFixtures,
  signUp,
  testEmail,
} from "./helpers/auth";
import { invitationTokenFor } from "./helpers/db";
import { consoleNav } from "./helpers/console";

/**
 * The export, end to end: a traveller uploads real files through the
 * real form, and both sides of the desk take the same checklist away as
 * one ZIP.
 *
 * Nothing is stubbed. The files go into the MinIO container this suite
 * points `S3_*` at, the archive is built by the route from what is
 * actually in that bucket, and the assertions below read the bytes the
 * browser saved. A test that mocked the store would prove the route
 * calls a function; this proves a person gets their passport back.
 *
 * The archive is stored rather than deflated, which is what lets these
 * assertions look for a document's bytes inside it verbatim — see
 * `zipEntries`.
 */

const DIRECTOR = testEmail("zip-export-director");
const CLIENT = testEmail("zip-export-client");
const ORG = "Zip Export Spec Agency";
const DIRECTOR_NAME = "Adaeze Obi";
const CLIENT_NAME = "Ngozi Eze";
const FIXTURE = join(__dirname, "fixtures/passport.jpg");

/** The twelve answers, as the chips label them in English. */
const ANSWERS = [
  `Yes — ${CLIENT_NAME}`,
  "Nigeria",
  "Nigeria",
  "Lagos",
  "United Kingdom",
  "Work",
  "Within a month",
  "₦2–4 million",
  "Employer housing",
  "Just me",
  "Nothing in particular",
  "No, never",
];

function documentRow(page: Page, name: string) {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .filter({ has: page.locator('input[type="file"]') })
    .last();
}

/**
 * What the browser actually saved, as bytes.
 *
 * Read from the download rather than fetched again with `page.request`:
 * the second call would be a different request and would not prove the
 * link a person clicks produces a file their browser keeps.
 */
async function savedBytes(download: Download): Promise<Buffer> {
  const path = await download.path();
  if (!path) throw new Error("The browser saved no file.");
  return readFileSync(path);
}

function expectAValidZip(archive: Buffer) {
  // A local file header opens it and an end-of-central-directory record
  // closes it. A reader that finds neither has not been handed a ZIP.
  expect(archive.subarray(0, 4)).toEqual(Buffer.from("PK\x03\x04", "binary"));
  expect(archive.includes(Buffer.from("PK\x05\x06", "binary"))).toBe(true);
}

test("both sides of the desk take the same checklist away as one ZIP", async ({
  browser,
  page,
}) => {
  await resetFixtures([DIRECTOR, CLIENT], [ORG]);

  // ---- the agency, and the client it invites ----
  // Both accounts are real and in the same organisation, because that
  // is the only arrangement under which `canReadDocuments` says yes to
  // both of them. Seeding the membership instead would prove the route
  // works for a row in a table rather than for a colleague.
  await signUp(page, {
    email: DIRECTOR,
    fullName: DIRECTOR_NAME,
    path: "/agency/sign-up",
    orgName: ORG,
  });
  await payAgencyPlan(page);

  await consoleNav(page).getByRole("link", { name: "Clients" }).click();
  await page.waitForURL("**/agency/clients");
  await page.getByRole("button", { name: "Invite" }).click();
  const inviteDialog = page.getByRole("dialog");
  await inviteDialog.getByLabel("Email", { exact: true }).fill(CLIENT);
  await inviteDialog.getByLabel("Full name", { exact: true }).fill(CLIENT_NAME);
  await inviteDialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(inviteDialog.getByText(CLIENT).first()).toBeVisible();
  await page.keyboard.press("Escape");

  const clientUrl = new URL(
    `/invite/${await invitationTokenFor(CLIENT)}`,
    page.url()
  ).toString();

  // A browser that has never seen this site, the way a client's is.
  const clientContext = await browser.newContext();
  const client = await clientContext.newPage();
  await setupClerkTestingToken({ page: client });
  await client.goto(clientUrl);
  await client.getByRole("link", { name: "Set up your account" }).click();
  await completeSignUpForm(client, { email: CLIENT, fullName: CLIENT_NAME });
  await client.waitForURL("**/invite/**");
  await client.getByRole("button", { name: "Accept invitation" }).click();

  // A client pays for their own application before intake opens, and
  // the agency's own plan does not cover it — so this gate always
  // stands. Unconditional for that reason: a defensive "pay only if the
  // checkout appeared" reads the URL mid-navigation and skips the click,
  // which leaves the account on the paywall for the rest of the test.
  await client.waitForURL("**/checkout");
  await client.getByRole("button", { name: "Pay and start" }).click();
  await client.waitForURL("**/app/agent");

  // ---- intake, so a checklist exists to export ----
  await client.goto("/app/agent");
  await expect(client.getByText("I will ask a few short questions")).toBeVisible();

  for (const [index, answer] of ANSWERS.entries()) {
    await expect(
      client.getByText(`question ${index + 1} of ${ANSWERS.length}`)
    ).toBeVisible();
    await client.getByRole("button", { name: answer, exact: true }).click();
  }

  await expect(
    client.getByText("Profile complete", { exact: true }).first()
  ).toBeVisible();

  await client.goto("/app/documents");

  /**
   * Nothing uploaded yet, so there is nothing to download and the link
   * is not there to be clicked. This is the assertion that stops the
   * page offering a copy of an empty checklist — the route answers 404
   * in the same state, and the two must agree.
   */
  await expect(
    client.getByRole("link", { name: "Download my documents" })
  ).toHaveCount(0);

  /**
   * Two real files, into the real bucket — the first two rows of the
   * ng→gb skilled worker checklist.
   *
   * The second is chosen for its name: "Passport photographs ×2" is the
   * only document in this corridor whose title carries a character that
   * cannot survive a filename, and the archive has to answer for it.
   */
  const passport = documentRow(client, "International passport (bio page)");
  await passport.locator('input[type="file"]').last().setInputFiles(FIXTURE);
  await expect(client.getByText("Received", { exact: false }).first()).toBeVisible();
  await client.keyboard.press("Escape");

  const photographs = documentRow(client, "Passport photographs ×2");
  await photographs.locator('input[type="file"]').last().setInputFiles(FIXTURE);
  await expect(client.getByText("Received", { exact: false }).first()).toBeVisible();
  await client.keyboard.press("Escape");

  // ---- the traveller takes their own copy ----
  await client.goto("/app/documents");
  const travellerLink = client.getByRole("link", {
    name: "Download my documents",
  });
  await expect(travellerLink).toBeVisible();

  const [travellerDownload] = await Promise.all([
    client.waitForEvent("download"),
    travellerLink.click(),
  ]);

  // Named from `case_ref`, which is what makes the file identifiable
  // once it is sitting in somebody's Downloads folder next to nine
  // others. The `download` attribute is deliberately absent from the
  // link so this name comes from the route's header — see
  // `DownloadDocuments`.
  expect(travellerDownload.suggestedFilename()).toMatch(
    /^TPL-\d+-documents\.zip$/
  );

  const travellerArchive = await savedBytes(travellerDownload);
  expectAValidZip(travellerArchive);

  /**
   * The entry names, in full and exactly.
   *
   * Position first, from the checklist's own order; then the document's
   * name as a filename; then the extension off the stored path. The `×`
   * in "Passport photographs ×2" becomes a separator rather than
   * surviving into a filename or swallowing the 2 — which is the case
   * worth having a real corridor document for.
   */
  expect(
    travellerArchive.includes(
      Buffer.from("01-international-passport-bio-page.jpg")
    )
  ).toBe(true);
  expect(
    travellerArchive.includes(Buffer.from("02-passport-photographs-2.jpg"))
  ).toBe(true);

  // The document itself, byte for byte. Stored rather than deflated, so
  // the fixture appears in the archive unchanged.
  const fixture = readFileSync(FIXTURE);
  expect(travellerArchive.includes(fixture)).toBe(true);

  /**
   * The guard itself, asked with a real session.
   *
   * This traveller is signed in and may download their own case, so a
   * refusal here is `canReadDocuments` saying no to *this* application
   * rather than the proxy saying no to an anonymous caller — which is
   * the boundary that actually matters, and the one the signed-out test
   * below cannot reach.
   *
   * A well-formed id that belongs to nobody: a missing case and a
   * forbidden one answer the same way on purpose, since telling them
   * apart would confirm that someone else's case exists.
   */
  const refused = await client.request.get(
    "/api/documents/00000000-0000-4000-8000-0000000000ff",
    { failOnStatusCode: false }
  );
  expect(refused.status()).toBe(403);
  expect(refused.headers()["content-disposition"]).toBeUndefined();

  await clientContext.close();

  // ---- the agency takes the same pack ----
  // `page` is still the director, signed in since the top of this test.
  await page.goto("/agency/clients");
  await page.getByRole("link", { name: CLIENT_NAME }).first().click();
  await page.waitForURL("**/agency/clients/**");

  const agencyLink = page.getByRole("link", { name: "Download documents" });
  await expect(agencyLink).toBeVisible();

  const [agencyDownload] = await Promise.all([
    page.waitForEvent("download"),
    agencyLink.click(),
  ]);

  const agencyArchive = await savedBytes(agencyDownload);
  expectAValidZip(agencyArchive);

  // The same pack, from the same endpoint, under the same case
  // reference — the whole point of there being one route rather than an
  // agency-side copy of it.
  expect(agencyDownload.suggestedFilename()).toBe(
    travellerDownload.suggestedFilename()
  );
  expect(agencyArchive.includes(fixture)).toBe(true);
});

test("a stranger cannot download somebody else's documents", async ({
  browser,
  baseURL,
}) => {
  /**
   * The proxy only redirects, so the guard on the route is the whole of
   * what stands between a signed-out caller and a passport scan. Asked
   * with no session at all, which is the cheapest way to be sure the
   * refusal is the route's own and not a page's.
   */
  const context = await browser.newContext();
  const response = await context.request.get(
    `${baseURL}/api/documents/00000000-0000-4000-8000-0000000000ff`,
    { failOnStatusCode: false, maxRedirects: 0 }
  );

  /**
   * The proxy answers first and the route never runs: `/api/documents/*`
   * is not a public route, so a request with no session is redirected to
   * the sign-in door before it reaches the guard.
   *
   * Asserted as the redirect rather than as the route's own 403, because
   * the 403 is unreachable from here — and a test that followed the
   * redirect would see the sign-in page's 200 and have to be read very
   * carefully indeed to not look like an open endpoint. The guard behind
   * this is proved with a real session in the test above.
   */
  expect([302, 303, 307, 308]).toContain(response.status());
  expect(response.headers()["location"]).toContain("sign-in");

  // Whatever else happens, no archive comes back.
  expect(response.headers()["content-type"] ?? "").not.toContain("zip");
  expect(response.headers()["content-disposition"]).toBeUndefined();

  await context.close();
});
