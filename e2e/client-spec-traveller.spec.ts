import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { resetFixtures, signUpInvited, testEmail } from "./helpers/auth";
import { approveApplicationFor, seedInvitation } from "./helpers/db";

/**
 * The client's brief, item by item.
 *
 * `docs/client-brief.md` is a numbered list of sixteen promises. The
 * other specs in this directory prove that a journey works; this one
 * proves that the journey is the one that was bought. Every test below
 * is named for the numbered item it answers, so a failure reads as
 * "item 7 is not met" rather than as a broken selector — which is the
 * whole reason it is a separate file from `traveller.spec.ts` instead
 * of more assertions inside it.
 *
 * Scope is the traveller's side of the brief: items 1–9, and what the
 * traveller sees of 12–16. Items 10 and 11 are the admin dashboard and
 * belong with `ops.spec.ts`.
 *
 * Three outcomes, and the difference between them matters:
 *
 * - **passes** — the product does what the item says.
 * - **`test.skip`** — the product does it, but this server cannot show
 *   it. `playwright.config.ts` starts with `OPENAI_API_KEY: ""` and
 *   `RESEND_API_KEY: ""`, so no model runs and no mail leaves. A skip
 *   here always names which key would light it up.
 * - **`test.fixme`** — the product does not do it. These are the real
 *   gaps against the brief, parked as named entries in the report so
 *   they are counted rather than forgotten. When one is built, its
 *   `fixme` comes off and the body below it already says what to
 *   assert.
 *
 * Serial, on one page, because the brief is a journey: there is no
 * checklist to inspect until intake has run, and nothing to verify
 * until a file has been uploaded. An early failure skipping the rest
 * is honest — the rest would be asserting against a traveller who
 * never got that far.
 *
 * Needs the same world the other specs need: `npm run db:up`,
 * `db:migrate`, `db:seed`, `db:bucket`, and a `.env.local` with the
 * Clerk dev keys.
 */

test.describe.configure({ mode: "serial" });

const EMAIL = testEmail("clientspec");
const ORG = "Client Spec Sponsor";
const NAME = "Chidinma Eze";
const FIXTURE = join(__dirname, "fixtures/passport.jpg");

/**
 * The ten questions as the traveller meets them: what the agent asks,
 * which chip is tapped, and what that chip actually stores.
 *
 * `stored` is not decoration. The chips carry a `value` and a `label`
 * separately (`c("No", "No, never", …)` in `src/lib/domain/intake.ts`),
 * the scripted path submits the value, and the profile renders the
 * value — so a test that clicks "No, never" and then looks for it on
 * the profile is looking for a string that was never written.
 */
const INTAKE = [
  {
    topic: "nationality",
    prompt: "First — which country's passport do you hold?",
    rail: "Nationality",
    chip: "Nigeria",
    stored: "Nigeria",
  },
  {
    topic: "current location",
    prompt: "And where are you living right now?",
    rail: "Living in",
    chip: "Lagos",
    stored: "Lagos",
  },
  {
    topic: "destination country",
    prompt: "Where are you hoping to travel?",
    rail: "Destination",
    chip: "United Kingdom",
    stored: "United Kingdom",
  },
  {
    topic: "travel purpose",
    prompt: "What is taking you there",
    rail: "Purpose",
    chip: "Work",
    stored: "Work",
  },
  {
    topic: "estimated travel dates",
    prompt: "Roughly when do you plan to travel?",
    rail: "Travel dates",
    chip: "Within a month",
    stored: "Within a month",
  },
  {
    topic: "budget range",
    prompt: "What budget are you working with",
    rail: "Budget",
    chip: "₦2–4 million",
    stored: "₦2–4 million",
  },
  {
    topic: "accommodation preference",
    prompt: "Where will you stay when you arrive?",
    rail: "Accommodation",
    chip: "Employer housing",
    stored: "Employer housing",
  },
  {
    topic: "travel companions",
    prompt: "Who is coming with you?",
    rail: "Travel party",
    chip: "Just me",
    stored: "Just me",
  },
  {
    topic: "dietary or accessibility needs",
    prompt: "Anything we should plan around",
    rail: "Food & support",
    chip: "Nothing in particular",
    stored: "Nothing in particular",
  },
  {
    topic: "prior visa history",
    prompt: "have you been refused a visa for anywhere before?",
    rail: "Visa history",
    chip: "No, never",
    stored: "No",
  },
] as const;

/** The ten `is_required` rows of the seeded ng→gb work rule set. */
const REQUIRED_DOCUMENTS = [
  "International passport (bio page)",
  "Passport photographs ×2",
  "Certificate of Sponsorship",
  "Completed application form",
  "Bank statements — 3 months",
  "Tuberculosis test certificate",
  "English language evidence",
  "Degree certificate and transcript",
  "Employment letter",
  "Birth certificate",
] as const;

/**
 * One checklist row, found by the document it is about — the same
 * locator `traveller.spec.ts` uses, and for the same reason: a row is
 * the innermost element carrying both the document's name and the
 * (visually hidden) file inputs, whatever the layout around it does.
 */
function documentRow(page: Page, name: string) {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .filter({ has: page.locator('input[type="file"]') })
    .last();
}

let page: Page;

test.beforeAll(async ({ browser }) => {
  await resetFixtures([EMAIL], [ORG]);
  page = await browser.newPage();
  const token = await seedInvitation(EMAIL, ORG);
  await signUpInvited(page, { email: EMAIL, fullName: NAME, token });
});

test.afterAll(async () => {
  await page.close();
});

/* ------------------------------------------------------------------ *
 * Phase 1 — the AI travel intake agent (items 1–3)
 * ------------------------------------------------------------------ */

test.describe("phase 1 · the intake agent", () => {
  /*
   * Item order is journey order, not brief order, and it has to be:
   * `AgentLayout` renders no composer once intake is done
   * (`!done && current`), so the microphone and the answer box only
   * exist while questions are still outstanding. The two tests that
   * assert on them therefore run before the walk that finishes it.
   */

  /**
   * Item 1 wants voice as well as text. The realtime agent is built
   * (`use-voice-intake.ts`, `/api/intake/realtime`, WebRTC straight from
   * the browser to OpenAI), but it only exists where a key does — and
   * this server has none, deliberately, so that no test bills a model.
   *
   * What is provable without a key is that the control is on the screen
   * and says why it is off, rather than being absent or lying about it.
   */
  test("item 1 — a voice control sits on the intake screen", async () => {
    await page.goto("/app/agent");

    const mic = page.getByRole("button", { name: "Answer by voice" });
    await expect(mic).toBeVisible();
    await expect(mic).toHaveAttribute(
      "title",
      "Speaking needs the agent, which is not running here. Type your answers instead."
    );
  });

  test.skip("item 1 — a spoken answer is recorded by the agent", async () => {
    // Needs OPENAI_API_KEY on the e2e server, which `playwright.config.ts`
    // blanks on purpose. Turning it on makes `LiveIntake` render, mints an
    // ephemeral client secret and opens a real WebRTC session — a billed
    // model call and a microphone this browser does not have.
  });

  /**
   * Item 2 is about manner, and manner is hard to assert. What can be
   * asserted is the shape the manner needs: one turn at a time, spoken
   * by a named party, read as speech by a screen reader, and answered in
   * a single box rather than a page of labelled inputs.
   *
   * The docked record surface moved where those live. The agent's turn
   * is now the dock's own live region — the one thing always on screen,
   * which is what makes it announce at all — and the full conversation
   * became a transcript the traveller opens. This asserts both halves,
   * because "reads as a conversation" needs the current turn to be
   * spoken *and* the history to remain reachable.
   */
  test("item 2 — the intake reads as a conversation, not as a form", async () => {
    await page.goto("/app/agent");

    // The turn being taken, in the live region that announces it.
    //
    // `aria-live` is asserted as a literal attribute rather than left to
    // the implicit `polite` that `role="status"` already carries. The
    // dock swaps its text in place as each turn lands, so whether a
    // screen reader speaks the new turn unprompted is the whole of item
    // 2's "reads as a conversation" — and a refactor that kept the role
    // while dropping the announcement would be invisible to a test that
    // only checked the role.
    const agent = page.getByRole("status", { name: "The agent", exact: true });
    await expect(agent).toBeVisible();
    await expect(agent).toHaveAttribute("aria-live", "polite");
    await expect(agent).toContainText(`Nice to meet you, ${NAME.split(" ")[0]}`);

    // One box to answer in, whatever the question — not ten fields.
    // `exact`, because the default is a substring match and the composer
    // sits beside a "Send your answer" button (and, once a question has
    // been answered, "Edit your answer to: …") — all of which contain
    // this label and would count as extra fields.
    await expect(page.getByLabel("Your answer", { exact: true })).toHaveCount(1);

    // The conversation behind the turn is one tap away, and it is the
    // log a screen reader reads back.
    //
    // The toggle states which it is. Its label already changes with the
    // panel ("Transcript" / "Close"), but the label is `sr-only` below
    // `sm`, so on a phone `aria-expanded` is the only thing saying
    // whether the conversation is open.
    // Located twice on purpose: it is one button, but its accessible
    // name changes with its state, so a single locator cannot hold it
    // across the click.
    const transcript = page.getByRole("button", { name: "Transcript" });
    await expect(transcript).toHaveAttribute("aria-expanded", "false");
    await transcript.click();
    await expect(
      page.getByRole("button", { name: "Close", exact: true })
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("log", { name: "Conversation with the Toplance agent" })
    ).toBeVisible();

    // Left as found. These tests share one page in a serial describe,
    // and the transcript is an overlay — leaving it open would hand the
    // next journey a covered record.
    // `exact` again: the panel's own dismiss button is labelled "Close
    // the conversation and go back to your record", which contains this.
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("log", { name: "Conversation with the Toplance agent" })
    ).toBeHidden();
  });

  /**
   * Item 1 lists eleven topics. Ten of them are questions the agent
   * asks; the eleventh — full name — is taken at sign-up instead, and
   * item 3's test is where that lands on the profile. The two `fixme`s
   * below hold the difference open rather than letting this test quietly
   * redefine the brief as ten.
   *
   * Asserting the prompt before each tap is what makes this item 2's
   * evidence as well: the transcript only ever holds one unanswered
   * question, and the counter says which one.
   */
  test("item 1 — asks about every travel topic the brief lists, one at a time", async () => {
    await page.goto("/app/agent");
    await expect(page.getByText("I will ask a few short questions")).toBeVisible();

    const rail = page.locator("#intake-record");

    for (const [index, question] of INTAKE.entries()) {
      await expect(
        page.getByText(`question ${index + 1} of ${INTAKE.length}`),
        `the agent should be on question ${index + 1} (${question.topic})`
      ).toBeVisible();

      // The topic itself, in the agent's own words.
      await expect(
        page.getByText(question.prompt).first(),
        `question ${index + 1} should ask about ${question.topic}`
      ).toBeVisible();

      // Item 2, structurally: one question outstanding, never a form.
      await expect(rail.getByText("Asking now")).toHaveCount(1);
      await expect(rail.getByText("Asking now")).toBeVisible();

      await page.getByRole("button", { name: question.chip, exact: true }).click();
    }

    await expect(page.getByText("Profile complete", { exact: true }).first()).toBeVisible();

    // Every topic now reads back as a record, not as chat scrollback.
    for (const question of INTAKE) {
      await expect(rail.getByText(question.rail, { exact: true })).toBeVisible();
      await expect(rail.getByText(question.stored, { exact: true }).first()).toBeVisible();
    }
  });

  /**
   * The brief opens its list with full name. The agent never asks for
   * it — `auth-form.tsx` collects it at sign-up and `completeProfile`
   * writes it — so the datum exists (item 3's test finds it on the
   * profile) but not by the route item 1 describes. Whether that
   * matters is the client's call, which is exactly why it is a named
   * entry here rather than a silent pass.
   */
  test.fixme("item 1 — the agent asks the traveller their full name", async () => {
    await page.goto("/app/agent");
    await expect(page.getByText("what should I call you", { exact: false })).toBeVisible();
  });

  /**
   * The brief asks for "current country". The `residence` question asks
   * for a city, and its chips are five Nigerian ones (Lagos, Abuja,
   * Port Harcourt, Kano, Ibadan) — which is a sharper question for the
   * corridors actually served, and a narrower one than was bought. The
   * nationality answer is doing the country's job today.
   */
  test.fixme("item 1 — the agent asks which country the traveller is in now", async () => {
    await page.goto("/app/agent");
    await expect(page.getByRole("button", { name: "Nigeria", exact: true })).toBeVisible();
  });

  /**
   * Item 3: the answers are not transcript, they are a record. This is
   * the one that proves the compile step — every chip tapped above,
   * rendered as a field of the traveller's profile, including the full
   * name the agent never asked for.
   */
  test("item 3 — the answers compile into a structured travel profile", async () => {
    await page.goto("/app/profile");

    await expect(page.getByRole("heading", { name: NAME })).toBeVisible();

    const fields: [string, string][] = [
      ["Nationality", "Nigeria"],
      ["Currently in", "Lagos"],
      ["Destination", "United Kingdom"],
      ["Purpose", "Work"],
      ["Target dates", "Within a month"],
      ["Budget", "₦2–4 million"],
      ["Travel party", "Just me"],
    ];

    for (const [label, value] of fields) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
    }

    // The two long-form answers, and the email the account was made with.
    await expect(page.getByText("Nothing in particular").first()).toBeVisible();
    await expect(page.getByText(EMAIL).first()).toBeVisible();
  });
});

/* ------------------------------------------------------------------ *
 * Phase 2 — the user travel profile (items 4–5)
 *
 * Item 5 needs an upload to have happened, so its test lives in phase 3
 * below, after the file that moves the score.
 * ------------------------------------------------------------------ */

test.describe("phase 2 · the travel profile", () => {
  /**
   * Item 4 names six records the profile must carry. Each is a panel,
   * and `PanelHeader` renders its label as an `h2`, so the brief's list
   * maps one-to-one onto headings. Empty is fine here — "itinerary
   * records" before approval is an empty state, and the brief asks for
   * the record, not for content in it.
   */
  test("item 4 — the profile carries all six records the brief names", async () => {
    await page.goto("/app/profile");

    for (const panel of [
      "Personal and travel details",
      "Travel history",
      "Documents",
      "Notes from your case team",
      "Status history",
      "Arrival plan",
    ]) {
      await expect(
        page.getByRole("heading", { name: panel, exact: true }),
        `the profile should carry a "${panel}" record`
      ).toBeVisible();
    }

    // "Current application status", in the case band under the name.
    // Scoped, not page-wide: the same status reads twice on this page —
    // once here as the file's current state, once in "Status history" as
    // the latest entry — and the brief's item 4 is about this one.
    const caseBand = page
      .locator("div")
      .filter({ has: page.getByText("Case number") })
      .filter({ has: page.getByRole("link", { name: "Edit trip answers" }) })
      .last();

    await expect(caseBand.getByText(/^TPL-/)).toBeVisible();
    await expect(caseBand.getByText("In progress")).toBeVisible();
  });

  /**
   * "Permanent, updatable" is two claims. The update is provable by
   * making one; the permanence, by reloading and finding it still
   * there rather than trusting the optimistic render.
   */
  test("item 4 — the profile is updatable and the change persists", async () => {
    await page.goto("/app/profile");

    await page.getByRole("button", { name: "Add a past trip" }).click();
    await page.getByLabel("Country you travelled to").fill("Ghana");
    await page.getByLabel("What the trip was for").fill("Family visit");
    await page.getByRole("button", { name: "Save trip" }).click();

    await expect(page.getByText("Trip added to your history")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Ghana", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Family visit").first()).toBeVisible();
  });
});

/* ------------------------------------------------------------------ *
 * Phase 3 — the visa requirements engine (items 6–9)
 * ------------------------------------------------------------------ */

test.describe("phase 3 · requirements, checklist and verification", () => {
  /**
   * Item 6: nationality plus destination in, the mission's own rule set
   * out. Nigeria + United Kingdom + work resolves the seeded Skilled
   * Worker corridor, and the screen shows the four figures the brief
   * asks for by name — visa type, fee, processing time, documents.
   *
   * The fee is asserted by its digits rather than by its formatting:
   * `Intl.NumberFormat("en-NG", { currency: "GBP" })` is the renderer,
   * and pinning its exact output would make this test about ICU rather
   * than about the brief.
   */
  test("item 6 — the requirements resolve from nationality and destination", async () => {
    await page.goto("/app/requirements");

    await expect(page.getByRole("heading", { name: "Skilled Worker Visa" })).toBeVisible();

    await expect(page.getByText("Documents required")).toBeVisible();
    await expect(page.getByText("Typical decision time")).toBeVisible();
    await expect(page.getByText("3–8 weeks")).toBeVisible();
    await expect(page.getByText("Government fee")).toBeVisible();
    await expect(page.getByText(/719/)).toBeVisible();

    // Whose rule set it is, and from when — the brief's "current".
    await expect(page.getByRole("link", { name: "UK Visas and Immigration" })).toBeVisible();
    await expect(page.getByText(/Rule set v\d+/)).toBeVisible();
  });

  /**
   * Item 6 also asks for the embassy's contact details, and there is
   * nowhere for them to live: `corridors` has no phone, address or
   * office column, and `CorridorRuleSet` has no such field. The screen
   * offers the mission's published source instead, which answers "where
   * did this come from" but not "who do I call".
   *
   * The nearest thing in the product is the `emergency_and_embassy`
   * section of a generated itinerary — which arrives after approval,
   * not while the traveller is deciding.
   */
  test.fixme("item 6 — the embassy's contact details are shown", async () => {
    await page.goto("/app/requirements");
    await expect(page.getByText("Embassy")).toBeVisible();
  });

  /**
   * Item 7 is two claims in one sentence: the checklist is personal to
   * this traveller, and every line of it can be uploaded to. The first
   * is the corridor's own ten required documents rather than a generic
   * list; the second is a file input on each of them.
   */
  test("item 7 — every checklist item has an upload slot", async () => {
    await page.goto("/app/documents");

    for (const name of REQUIRED_DOCUMENTS) {
      const row = documentRow(page, name);
      await expect(row, `"${name}" should be on the checklist`).toBeVisible();
      await expect(
        row.locator('input[type="file"]'),
        `"${name}" should have somewhere to upload to`
      ).not.toHaveCount(0);
    }

    // "Somewhere to upload to" means a camera on a phone, not only a
    // file picker. Asserted here because this is the last point in the
    // journey where a document is still outstanding — after the upload
    // and the approval below, every row offers "Replace" instead.
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await expect(
        documentRow(page, "International passport (bio page)").getByRole(
          "button",
          { name: "Take a photo" }
        )
      ).toBeVisible();
    } finally {
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    // Personal to the corridor: a UK requirement, and not a UAE one.
    await expect(page.getByRole("heading", { name: "Certificate of Sponsorship" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Medical fitness certificate" })
    ).toHaveCount(0);
  });

  /**
   * Item 8 asks for an automatic check on upload. The check exists
   * (`precheckDocument`, scheduled in `after()` so it never slows the
   * upload) but needs a model, and this server has no key — so what is
   * proved here is the half that holds without one, and it is the half
   * that matters most: an uploaded file lands in `checking`, never in
   * `verified`.
   *
   * That is by design, not by omission. `applyPrecheckTx` can move a
   * document to `flagged` and nothing else; only `reviewDocumentTx`,
   * behind a person in the ops console, can verify one. A conformance
   * test that expected the machine to verify would be asking for
   * something the product deliberately refuses to do.
   */
  test("item 8 — an upload is checked, and a machine never calls it verified", async () => {
    await page.goto("/app/documents");

    const passport = documentRow(page, "International passport (bio page)");
    await expect(passport.getByText("Not started")).toBeVisible();

    await passport.locator('input[type="file"]').last().setInputFiles(FIXTURE);

    await expect(passport.getByText("Checking")).toBeVisible();
    await expect(passport.getByText("Verified")).toHaveCount(0);
  });

  test.skip("item 8 — the check reads the file for type, legibility and category", async () => {
    // Needs OPENAI_API_KEY. With one, `precheckSupports` admits the jpeg
    // fixture, `precheckDocument` returns pass|flag with a reason, and a
    // flag lands on the row as "Needs re-upload" plus the traveller-visible
    // reason beside it. The verdict is a model call, so it is never made
    // by this suite.
  });

  /**
   * Item 5 and the first half of item 9, together: the score is on the
   * dashboard, and the upload above moved it. One of ten required
   * documents is in, so the ring reads 10%.
   *
   * The ring's label says "collected", which is what the number is:
   * uploaded and awaiting or past review. The `fixme` below is the
   * remaining half — the brief asks for a stricter count.
   */
  test("item 5 — the completion score is on the dashboard and rises with an upload", async () => {
    await page.goto("/app");

    await expect(page.getByRole("img", { name: /% of required documents collected/ })).toBeVisible();
    await expect(
      page.getByRole("img", { name: "10% of required documents collected" })
    ).toBeVisible();
    await expect(page.getByText("10%")).toBeVisible();
  });

  /**
   * Item 9 says "every verified upload increases the completion score".
   * `completionOf` counts `checking` alongside `verified`, so the score
   * rises the moment a file arrives and reaches 100% before anyone has
   * looked at a single document — which is why the test above expects
   * 10% from an upload nobody has judged.
   *
   * It is a defensible product decision — the ring measures what the
   * traveller still has to do, and submission is separately gated on
   * `verified === total` — but it is not what the sentence says.
   *
   * Half of this gap is closed: the label used to say "verified" while
   * drawing the looser number, and now says "collected". What remains
   * is a product decision, not a defect: does the client want the ring
   * to hold at 0% through the whole collecting phase?
   */
  test.fixme("item 9 — the score counts only documents a person has verified", async () => {
    await page.goto("/app");
    await expect(
      page.getByRole("img", { name: "0% of required documents verified" })
    ).toBeVisible();
  });

  /**
   * Items 9 and 11: an automatic notification when a traveller reaches
   * 100%. Staff are notified — but by `submitApplication`, which is a
   * button the traveller presses, and only once every required document
   * has been human-verified. Nothing watches the score.
   *
   * So the two thresholds the brief treats as one are three apart in
   * the product: 100% uploaded (nothing fires), 100% verified (nothing
   * fires, a Submit button appears), submitted (staff are notified).
   * A traveller who uploads everything and never presses Submit is
   * invisible to the review team.
   */
  test.fixme("item 9 — reaching 100% notifies the admin without being asked", async () => {
    // With the gap closed, uploading the last required document should
    // write a staff notification on its own — no Submit press, and
    // before any human verdict.
  });
});

/* ------------------------------------------------------------------ *
 * Phase 5 & 6 — after approval (items 12–16)
 *
 * Approval is bought from the database rather than walked through the
 * ops console: `ops.spec.ts` is where a reviewer's verdict is the
 * subject, and repeating it here would buy minutes, not confidence.
 * ------------------------------------------------------------------ */

test.describe("phases 5 & 6 · after approval", () => {
  test.beforeAll(async () => {
    await approveApplicationFor(EMAIL);
  });

  /**
   * Item 12: approval generates the itinerary. `generateAndStoreItinerary`
   * runs inside the status change and returns false without a key —
   * writing nothing, so the panel keeps its empty state rather than
   * showing an invented plan. That refusal is the assertable part here;
   * the ten sections are the skipped test below.
   */
  test("item 12 — approval opens the arrival plan, and it never invents one", async () => {
    await page.goto("/app/profile");

    await expect(page.getByRole("heading", { name: "Arrival plan" })).toBeVisible();
    await expect(
      page.getByText("Once your application is approved, your first weeks land here")
    ).toBeVisible();
  });

  test.skip("item 12 — the itinerary covers all ten sections the brief lists", async () => {
    // Needs OPENAI_API_KEY. `itinerarySchema` is the brief's list, one
    // key each — flights_guidance, airport_transfer, accommodation,
    // first_seven_days (exactly seven entries), local_transport,
    // emergency_and_embassy, healthcare_and_insurance, money_and_currency,
    // cultural_notes, packing_list — and `buildItineraryPrompt` is unit
    // tested in `src/lib/ai/itinerary.test.ts` without spending a call.
  });

  test.skip("item 13 — the itinerary arrives by email and in-app notification", async () => {
    // Needs both keys. RESEND_API_KEY is blank, so `sendEmail` logs and
    // returns; OPENAI_API_KEY is blank, so no itinerary is generated and
    // the `itinerary_ready` notification never fires either. The bell
    // text and the subject line are asserted in the notification unit
    // tests instead.
  });

  /**
   * Item 13's third channel. The realtime SDK is wired to intake and
   * nowhere else: there is no voice control on the profile, nothing
   * reads a plan aloud, and no telephony dependency in `package.json`
   * to push one out. The itinerary email is a link to the profile, not
   * the plan itself, so there is nothing to listen to anywhere.
   */
  test.fixme("item 13 — the agent reads the itinerary aloud", async () => {
    await page.goto("/app/profile");
    await expect(page.getByRole("button", { name: /listen|read aloud/i })).toBeVisible();
  });

  /**
   * Item 14, the part that is built: approval opens a companion screen
   * carrying this traveller's corridor, not a generic one. The tips
   * panel is its empty state for the usual reason.
   */
  test("item 14 — an approved traveller gets an ongoing companion", async () => {
    await page.goto("/app");

    const companion = page.getByRole("link", { name: "After you land" }).first();
    await expect(companion).toBeVisible();
    await companion.click();
    await page.waitForURL("**/app/companion");

    await expect(page.getByRole("heading", { name: "After you land" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Arrival checklist" })).toBeVisible();
    // The UK · work checklist, resolved from the corridor.
    await expect(page.getByText("Collect your eVisa or BRP")).toBeVisible();
    await expect(page.getByText("Apply for a National Insurance number")).toBeVisible();
    // Document renewal, as guidance rather than as a reminder.
    await expect(page.getByText("Skilled Worker Visa", { exact: true })).toBeVisible();
  });

  /**
   * Item 14 lists five kinds of update. Two arrive: community
   * suggestions (inside the local tips) and renewal guidance. Three do
   * not exist anywhere in the codebase — no jobs, housing, events or
   * networking feed; no weather or safety alerts; no future travel
   * suggestions built from the profile.
   *
   * The renewal half is worth reading carefully before it is called
   * done: `renewalGuidance` never states an expiry date, because no
   * expiry date is stored. It is guidance on when to look, not a
   * reminder that arrives when it is time — which is what the brief
   * asks for.
   */
  test.fixme("item 14 — the companion carries opportunities, alerts and travel suggestions", async () => {
    await page.goto("/app/companion");
    await expect(page.getByRole("heading", { name: "Opportunities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Weather and safety" })).toBeVisible();
  });

  /**
   * Item 14's first channel. Updates go out as an in-app notification
   * and one email, and that is the whole of it: `notify()` has two
   * arms, `package.json` has no telephony dependency, and no SMS or
   * outbound voice exists to carry a voice message.
   *
   * Worth flagging alongside this: the sign-up form's phone field tells
   * the traveller the number is "used for the voice agent and travel
   * alerts". It is used for neither.
   */
  test.fixme("item 14 — updates can reach the traveller as a voice message", async () => {
    // Needs a channel that does not exist yet — Twilio, per the brief's
    // own technical note.
  });

  /**
   * Item 15: the profile keeps itself current from what the traveller
   * says. The "What the agent has learned" panel is that promise made
   * visible — every line derived from a real answer, with what it is
   * used for, and nothing invented when there is nothing to show.
   */
  test("item 15 — the profile updates itself from the conversation", async () => {
    await page.goto("/app/profile");

    await expect(
      page.getByRole("heading", { name: "What the agent has learned" })
    ).toBeVisible();
    await expect(page.getByText("Updated automatically after every interaction.")).toBeVisible();

    // Derived from the chips tapped in phase 1, not restated from them.
    await expect(page.getByText("Travelling — just me")).toBeVisible();
    await expect(page.getByText("Sets who is on the document checklist")).toBeVisible();
    await expect(page.getByText("Employer housing").first()).toBeVisible();
    await expect(page.getByText("Visa history — no")).toBeVisible();
  });

  /**
   * Item 16 asks for a scheduler each traveller can set their frequency
   * on. What exists is a switch: weekly, or off. That is a real
   * preference, honoured by the digest route's eligibility query, and
   * it is where a frequency setting would go — so this test proves the
   * control and its persistence, and the `fixme` below holds the
   * difference between two options and a frequency.
   */
  test("item 16 — the traveller controls whether updates arrive", async () => {
    await page.goto("/app/profile");

    await expect(page.getByText("Post-arrival digest")).toBeVisible();
    await expect(page.getByText("Weekly", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Edit post-arrival digest" }).click();
    const digest = page.getByLabel("How often, after you land");
    await expect(digest).toBeVisible();

    await digest.selectOption("off");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Wait for the write to land before reloading. `useSave` closes the
    // editor once the action resolves, so the row reading "Off" is the
    // signal that there is something to reload *into* — reloading
    // straight after the click raced the server action and reliably
    // re-read the old value.
    await expect(page.getByText("Off", { exact: true })).toBeVisible();

    // Then the actual claim: it survives a round trip, rather than being
    // an optimistic render.
    await page.reload();
    await expect(page.getByText("Off", { exact: true })).toBeVisible();
  });

  /**
   * The scheduler. Four frequencies now, and the cadence is enforced in
   * `travellersDueForDigest` rather than by whatever interval the
   * deployment polls on — so a monthly traveller gets one a month even
   * if the scheduler runs nightly.
   *
   * What is still deploy-time config, and cannot be asserted here: the
   * scheduled task that calls `/api/cron/companion` at all. This repo
   * ships as a container (see `Dockerfile`), so that is a Coolify
   * scheduled task, documented in the README rather than committed as a
   * `vercel.json` this deployment would never read.
   */
  test("item 16 — the traveller chooses how often updates arrive", async () => {
    await page.goto("/app/profile");
    await page.getByRole("button", { name: "Edit post-arrival digest" }).click();
    const digest = page.getByLabel("How often, after you land");

    // Not `toBeVisible` on the options: inside a collapsed native
    // select they resolve but report hidden. Choosing one and reading
    // the row back is the stronger claim anyway — it proves the value
    // survives the action, which a DOM check never would.
    await expect(digest.locator("option")).toHaveCount(4);

    await digest.selectOption("monthly");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Monthly", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText("Monthly", { exact: true })).toBeVisible();
  });
});

/* ------------------------------------------------------------------ *
 * Technical requirements
 * ------------------------------------------------------------------ */

test.describe("technical requirements", () => {
  /**
   * "Accessible via web browser and mobile browser (fully responsive)."
   * The whole suite runs at Desktop Chrome's 1280×720; this runs the
   * screens a traveller actually lives in at a phone's, where the
   * record narrows under a pinned dock and the checklist rows restack.
   *
   * A viewport change on the shared page rather than a second context,
   * so the session comes with it. It is put back at the end because
   * every test after this one would inherit it otherwise.
   */
  test("the traveller's screens work at a phone viewport", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto("/app");
      await expect(page.getByRole("img", { name: /% of required documents collected/ })).toBeVisible();

      await page.goto("/app/documents");
      await expect(page.getByRole("heading", { name: "Your documents" })).toBeVisible();
      const passport = documentRow(page, "International passport (bio page)");
      await expect(passport).toBeVisible();

      // Actionable at this width, not merely present. Deliberately not
      // the camera: this runs after approval, when every document is
      // verified, and a supplied document offers "Replace" rather than
      // another way to supply it. The phone-only camera is asserted in
      // item 7 — the last point in the journey with an outstanding row.
      await expect(
        passport.getByRole("button", {
          name: "Replace International passport (bio page)",
        })
      ).toBeVisible();

      // The record itself, not a drawer toggle: the docked record
      // surface replaced the phone drawer, so at this width the ten
      // fields are on screen rather than behind a "Your profile" button.
      await page.goto("/app/agent");
      await expect(page.locator("#intake-record")).toBeVisible();
      await expect(page.getByText("Traveller record")).toBeVisible();
    } finally {
      await page.setViewportSize({ width: 1280, height: 720 });
    }
  });

  test.skip("all user data is encrypted at rest and in transit", async () => {
    // Not a browser assertion. In transit is the deployment's TLS; at
    // rest is Postgres and R2 configuration. Both belong in the
    // infrastructure checks, not here — recorded so the brief's line is
    // not mistaken for covered.
  });

  test.skip("the admin panel is protected by 2FA", async () => {
    // Items 10–11 are `ops.spec.ts`'s scope, and the e2e server sets
    // E2E_SKIP_STAFF_2FA=1 because a suite cannot walk an authenticator
    // enrollment. `requireStaffConsole` is unit tested instead.
  });
});
