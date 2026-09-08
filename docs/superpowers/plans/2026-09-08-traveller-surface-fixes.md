# Traveller Surface Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the six things the client saw on the traveller's own screens —
the cramped documents explainer, the missing local-currency figure, the
unexplained date icon, the phone field that accepts anything, the question
count, and an AI pre-check that flags the same photograph it just passed.

**Architecture:** Five of the six are small, local changes. The sixth — the
pre-check — is a change to how the model is asked rather than to what happens
with its answer: `temperature: 0` to stop it sampling, and a `confidence`
field so a flag it is not sure about is recorded but not acted on. Every rule
worth arguing with goes in a pure module with a test.

**Tech Stack:** Next.js 16, React 19, `ai` SDK v7 with `@ai-sdk/openai`,
Zod 4, `@radix-ui/react-popover` (already a dependency), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-console-review-feedback-design.md`

## Global Constraints

- Every user-visible string is a `Record<Locale, string>` in `src/lib/i18n/`
  covering all ten locales: `en ha yo ig fr pt sw ar tw zu`.
- `@/lib/domain/*` stays pure: no `db`, no `server-only`, no framework.
- The human reviewer keeps the only path to `verified`. Nothing here changes
  that, and no change may make the AI able to *pass* something a human has
  flagged.
- Copy that addresses a traveller never asks them to weigh our own sourcing —
  see the argument at the top of `src/lib/domain/freshness.ts`.
- Do not migrate the known deviations in `AGENTS.md`.
- Run `npm run typecheck && npm run test && npm run lint` before every commit.

---

### Task 1: The documents explainer takes the full measure

**Files:**
- Modify: `src/app/[locale]/(app)/app/(corridor)/documents/page.tsx:93-115`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new. Layout only.

> "this text here, your document each file… This helper explainer text. I love
> that you've added this. Can we extend it to fill the same width as the table
> underneath? That way it's not taking up so much space."

- [ ] **Step 1: Rearrange the header**

The three explainer paragraphs currently sit in a `max-w-[62ch]` column in a
`justify-between` row with the completion ring, so they wrap to roughly half
the width of the panels below them and run long.

Replace the block at lines 95–114 with a heading row and a full-width
explainer under it:

```tsx
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
          <h1 className="t-h2">{t.heading[locale]}</h1>
          <CompletionRing pct={completion.pct} size={120} />
        </div>

        {/* Full page measure, not a 62ch column beside the ring. Three
            paragraphs in half the width of the panels below them is
            twice the height for the same words, and it pushed the first
            document off the fold — which is what the client saw.

            The 62ch rule in §6 is about a *paragraph* being readable;
            this is one short block above a table it explains, and
            matching the table's width is what makes it read as its
            caption rather than as a column of its own. */}
        <div className="mt-4 flex flex-col gap-2">
          <p className="t-muted">
            {t.intro[locale]} {VERIFIED_MEANS}
          </p>
          {/* Said before they photograph anything, not after a refusal.
              Legibility is the largest single cause of a re-upload and
              the one thing entirely within the traveller's control at
              the moment they take the picture. */}
          <p className="t-muted">{UPLOAD_GUIDANCE}</p>
          {/* Mandatory, not a nicety. Decision 2 made the pre-check
              unconditional — there is no setting under which a
              traveller's file is not read by a machine — so saying so
              is what makes it honest, and it is said where they upload
              rather than buried in terms. */}
          <p className="t-muted">{t.precheckDisclosure[locale]}</p>
        </div>
```

The two long comments are moved, not deleted. They record decisions, and a
layout change is not a reason to drop them.

- [ ] **Step 2: Check it by eye**

Run: `npm run dev`, open `/app/documents` with a resolved corridor.
Expected: heading and ring on one line, the three explainer lines running the
full width of the panels below, and the first document panel visible without
scrolling on a 900px-tall window.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(app)/app/(corridor)/documents/page.tsx"
git commit -m "fix: let the documents explainer run the width of the table it explains"
```

---

### Task 2: Make the local-currency figure actually appear

**Files:**
- Create: `scripts/refresh-fx.mts`
- Modify: `package.json`
- Modify: `src/app/[locale]/(app)/app/(corridor)/requirements/page.tsx`
- Modify: `src/lib/i18n/requirements.ts`

**Interfaces:**
- Consumes: `refreshFxRates` from `@/lib/fx/rates`; `currencyForCountryName`,
  `convertFee`, `getPairRate` — all already wired into the page.
- Produces: `npm run fx:refresh`; `REQUIREMENTS.approxUnavailable`.

> "I had mentioned having the equivalent of this in the local currency showing
> as well."

**This is already built.** `convertFee` + `formatApproximate` render
"≈ ₦2,400,000 at 3 September rates" under the government fee on
`/app/requirements`. It did not appear in the demo because `fx_rates` is
empty: `getPairRate` returns null wherever the daily `/api/cron/fx-rates` job
has never run, and every caller treats null as "show nothing". So this task is
about making it visible, not about building it.

- [ ] **Step 1: Write the one-shot script**

`scripts/refresh-fx.mts`, following the shape of the other `.mts` scripts in
that directory:

```ts
import { refreshFxRates } from "../src/lib/fx/rates.ts";

/**
 * Fill `fx_rates` once, from the command line.
 *
 * The table is filled by a daily scheduled task hitting
 * `/api/cron/fx-rates`, which is deploy-time config — so on a developer's
 * machine, and on a staging environment nobody has wired a scheduler to,
 * it is simply empty. Every caller treats an empty table as "show no
 * converted figure", which is correct and which looks exactly like the
 * feature not existing. It cost a round of client feedback.
 */
const result = await refreshFxRates();

if (!result) {
  console.error(
    process.env.OPEN_EXCHANGE_RATES_APP_ID
      ? "The rates provider did not answer. Nothing was written."
      : "No OPEN_EXCHANGE_RATES_APP_ID is set, so there is nothing to fetch."
  );
  process.exit(1);
}

console.log(`Wrote ${result.updated} rates against ${result.base}.`);
```

- [ ] **Step 2: Add the script**

In `package.json`, beside `db:seed`:

```json
    "fx:refresh": "node --env-file-if-exists=.env.local --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/refresh-fx.mts",
```

- [ ] **Step 3: Run it**

Run: `npm run fx:refresh`
Expected: `Wrote ~170 rates against USD.` — or the explicit refusal above if
`OPEN_EXCHANGE_RATES_APP_ID` is unset, which is itself the answer to why the
figure was missing.

- [ ] **Step 4: Say so when the figure cannot be shown**

A silently absent number is what caused this feedback. In the fee stat on
`requirements/page.tsx`, when `approximateFee` is null *and* the mission's
currency differs from `localCurrency`, render one line instead of nothing:

```tsx
                approx: approximateFee
                  ? `${formatApproximate(approximateFee, locale)} ${t.approxAtRatesDate[locale].replace(
                      "{date}",
                      approximateFee.fetchedAt.toLocaleDateString(locale, {
                        day: "numeric",
                        month: "long",
                      })
                    )}`
                  : /* No conversion to show, but there is one to want:
                       the mission charges in a currency this traveller
                       does not hold. Saying we cannot convert it today
                       is a smaller failure than showing only the
                       mission's figure and letting them assume that is
                       all there is — which reads as a missing feature
                       rather than a missing rate. Absent entirely when
                       the currencies match, because then there is
                       genuinely nothing to approximate. */
                    localCurrency &&
                      ruleSet.governmentFeeCurrency &&
                      localCurrency.toUpperCase() !==
                        ruleSet.governmentFeeCurrency.toUpperCase()
                      ? t.approxUnavailable[locale].replace(
                          "{currency}",
                          localCurrency.toUpperCase()
                        )
                      : null,
```

- [ ] **Step 5: Add the copy**

`src/lib/i18n/requirements.ts` — add `approxUnavailable: L;` to the type and
the entry, all ten locales. English:

```ts
  approxUnavailable: {
    en: "We could not convert this into {currency} today.",
    …
  },
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS.

Open `/app/requirements` for a Nigeria → United Kingdom work corridor.
Expected: "≈ ₦…" and "at … rates" under the £ fee. Then
`psql -c 'delete from fx_rates'` and reload. Expected: the one-line
"We could not convert this into NGN today." rather than silence.

- [ ] **Step 7: Note it for the deployment**

Add one line to `docs/superpowers/specs/2026-09-08-console-review-feedback-design.md`
§5.2 recording that staging needs `/api/cron/fx-rates` on a daily schedule,
and that `npm run fx:refresh` is the manual equivalent. This is not optional
polish — the figure the client asked for does not exist on any environment
without it.

- [ ] **Step 8: Commit**

```bash
git add scripts/refresh-fx.mts package.json "src/app/[locale]/(app)/app/(corridor)/requirements/page.tsx" src/lib/i18n/requirements.ts docs
git commit -m "fix: fill the FX table, and say so when a fee cannot be converted"
```

---

### Task 3: An info icon that explains the date

**Files:**
- Create: `src/components/ui/hint.tsx`
- Modify: `src/app/[locale]/(app)/app/(corridor)/requirements/page.tsx`
- Modify: `src/lib/i18n/requirements.ts`

**Interfaces:**
- Consumes: `@radix-ui/react-popover` (already a dependency), `Info` from
  `lucide-react`.
- Produces: `<Hint label={string} />` — an info icon that reveals `label` on
  hover and on focus.

> "what is that icon? Is that an info icon? Because it looks like a clock…
> it should be an I and then on hover it should display a helpful text that
> tells them what that block of text is about."

- [ ] **Step 1: Build the hint**

`src/components/ui/hint.tsx`:

```tsx
"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";

/**
 * A small info mark that explains the thing beside it.
 *
 * A popover rather than `title=""`: the native tooltip does not open on
 * keyboard focus, does not appear on touch at all, and cannot be styled
 * — three ways of not being read by the people most likely to need it.
 *
 * It opens on hover *and* on focus, and the same sentence is also the
 * trigger's accessible name, so a screen reader gets it without having
 * to open anything. The trigger is a real button for the same reason.
 *
 * Only for a fact that is genuinely secondary. Anything a traveller
 * needs in order to act belongs on the screen — a product that hides
 * its explanations behind icons is a product that has decided nobody
 * reads them.
 */
export function Hint({ label }: { label: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-grid size-5 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Info className="size-4" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          collisionPadding={12}
          // Hover on the panel itself would be a trap on a control
          // whose open state is driven by the trigger's hover.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-w-[34ch] rounded-md border border-border bg-surface px-3 py-2 text-[13px] leading-relaxed text-ink-2 shadow-[var(--shadow-lg)]"
        >
          {label}
          <Popover.Arrow className="fill-[var(--surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

- [ ] **Step 2: Write the copy**

`src/lib/i18n/requirements.ts`, `inEffectSinceHint`, all ten locales.
English:

> "The date the mission itself published these rules. Toplance re-checks them
> against the mission's own pages, so if they change, this list changes."

**Note the correction to the client's wording.** They asked for "this is when
last requirements were verified via the platform". That date is *ours*, and
`src/lib/domain/freshness.ts` argues at length that it is staff-only:

> A traveller who is told the checklist they are holding might be out of date
> has been handed our job back: they cannot check it against a mission, and
> the sentence only costs them confidence in a list that is very probably
> right.

So the hint explains what the date on screen actually is — the mission's
effective-from date — and says that we re-check, without inviting the reader
to weigh how recently. Flag this wording to the client at review; it answers
the question they asked without making a claim the date does not support.

- [ ] **Step 3: Use it**

In the provenance footer, replace the bare span:

```tsx
            <span className="t-muted inline-flex items-center gap-1.5">
              {t.inEffectSince[locale].replace("{date}", effective)}
              <Hint label={t.inEffectSinceHint[locale]} />
            </span>
```

Leave the long comment above it in place — it explains why our own
verification date is *not* here, which is exactly the question the hint's
wording turns on.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

Open `/app/requirements`. Expected: an `i` after the date; hovering and
tabbing to it both reveal the sentence; the icon is not a clock.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/hint.tsx "src/app/[locale]/(app)/app/(corridor)/requirements/page.tsx" src/lib/i18n/requirements.ts
git commit -m "feat: explain the rule set's date behind an info mark"
```

---

### Task 4: A phone field that validates

**Files:**
- Modify: `src/lib/domain/countries.ts`
- Modify: `src/lib/domain/countries.test.ts`
- Modify: `src/components/auth/phone-field.tsx`
- Modify: `src/lib/i18n/phone-field.ts`

**Interfaces:**
- Produces:
  ```ts
  export function expectedDigits(mask: string): number;
  export function phoneProblem(iso: string, digits: string): "empty" | "short" | "long" | null;
  ```

> "I should probably put better validator here right now. Doesn't work so
> well."

- [ ] **Step 1: Write the failing test**

Append to `src/lib/domain/countries.test.ts`:

```ts
import { expectedDigits, phoneProblem } from "@/lib/domain/countries";

describe("expectedDigits", () => {
  it("counts the digit slots in a mask and nothing else", () => {
    // The mask is already the national number's length — it was written
    // to format the field, and it happens to be the only statement of
    // that length anywhere in the codebase.
    expect(expectedDigits("... ... ....")).toBe(10);
    expect(expectedDigits("(...) ...-....")).toBe(10);
    expect(expectedDigits(". .. .. .. ..")).toBe(9);
  });

  it("is 0 for a mask with no slots, so it can never reject anything", () => {
    // A country we have not written a mask for must not become a
    // country nobody can sign up from.
    expect(expectedDigits("")).toBe(0);
  });
});

describe("phoneProblem", () => {
  it("passes a correct Nigerian number", () => {
    expect(phoneProblem("ng", "8031234567")).toBeNull();
  });

  it("names an empty field as empty, not as too short", () => {
    // Different sentences: one is "you have not filled this in", the
    // other is "what you filled in is wrong". Telling somebody their
    // blank field is three digits short is telling them off for
    // nothing.
    expect(phoneProblem("ng", "")).toBe("empty");
    expect(phoneProblem("ng", "   ")).toBe("empty");
  });

  it("catches both directions", () => {
    expect(phoneProblem("ng", "80312345")).toBe("short");
    expect(phoneProblem("ng", "803123456789")).toBe("long");
  });

  it("ignores anything that is not a digit", () => {
    expect(phoneProblem("ng", "803 123 4567")).toBeNull();
  });

  it("accepts any length for a country with no mask", () => {
    expect(phoneProblem("zz", "1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/domain/countries.test.ts`
Expected: FAIL — neither export exists.

- [ ] **Step 3: Write the functions**

Append to `src/lib/domain/countries.ts`:

```ts
/**
 * How many digits a national number has in this country, read off the
 * formatting mask.
 *
 * The mask already encodes it — it was written to space the digits as
 * they are typed — so there is no second table of lengths to keep in
 * step with the first. A country with no mask returns 0, which
 * `phoneProblem` treats as "no opinion": a mask nobody has written must
 * not become a country nobody can sign up from.
 */
export function expectedDigits(mask: string): number {
  let n = 0;
  for (const char of mask) if (char === ".") n++;
  return n;
}

/**
 * What is wrong with this number, or null if nothing is.
 *
 * Four outcomes rather than a boolean, because the field has to say
 * something different in each case and a boolean forces one sentence to
 * cover all of them. Empty is separated from short deliberately: a
 * person who has not typed anything yet has not made a mistake.
 *
 * Length only. Nothing here claims the number is *live* — that needs a
 * message sent to it, which is Clerk's job at verification and not a
 * form's. What it stops is the case the client saw: a field that takes
 * three digits and an E.164 string built from them.
 */
export function phoneProblem(
  iso: string,
  digits: string
): "empty" | "short" | "long" | null {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return "empty";

  const expected = expectedDigits(countryBy(iso).mask);
  if (expected === 0) return null;

  if (clean.length < expected) return "short";
  if (clean.length > expected) return "long";
  return null;
}
```

`countryBy` already falls back to a default for an unknown ISO code — check
what that default's mask is before relying on the "no mask" branch. If it
falls back to Nigeria, add a maskless entry or make `countryBy` return
`undefined` for an unknown code and handle it here; a fallback that silently
applies Nigeria's length to an unknown country would be worse than no
validation.

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/domain/countries.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into the field**

In `src/components/auth/phone-field.tsx`:

- `const [touched, setTouched] = React.useState(false);`
- `const problem = touched ? phoneProblem(iso, digits) : null;`
- `onBlur={() => setTouched(true)}` on the digits input.
- Colour the control's border `border-danger` when `problem` is set, and set
  `aria-invalid` and `aria-describedby` on the input.
- Render the message under the field:

```tsx
        {problem && (
          <p id={`${name}-error`} role="alert" className="t-muted text-danger-ink">
            {t(PHONE_FIELD[problem === "empty" ? "required" : problem === "short" ? "tooShort" : "tooLong"])
              .replace("{n}", String(expectedDigits(country.mask)))
              .replace("{country}", country.name)}
          </p>
        )}
```

- The hidden `name` input keeps carrying the raw digits. Do not block form
  submission from inside this component: the field does not own the form, and
  a control that silently refuses to submit is worse than one that explains.
  The server actions that consume `phone` should call `phoneProblem` too —
  add that check to whichever action reads it, refusing with the same
  sentence, so a client-side guard is a courtesy and not the enforcement.

- [ ] **Step 6: Add the copy**

`src/lib/i18n/phone-field.ts` gains `required`, `tooShort`, `tooLong`, all ten
locales. English:

- `required`: "Enter your phone number."
- `tooShort`: "A {country} number has {n} digits after the country code."
- `tooLong`: "That is more than the {n} digits a {country} number has."

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS.

Open the invitation acceptance form, type three digits, tab away.
Expected: a red rule and "A Nigeria number has 10 digits after the country
code."

- [ ] **Step 8: Commit**

```bash
git add src/lib/domain/countries.ts src/lib/domain/countries.test.ts src/components/auth/phone-field.tsx src/lib/i18n/phone-field.ts
git commit -m "feat: validate a phone number's length against its country's mask"
```

---

### Task 5: Lock down the question-count copy

**Files:**
- Modify: `src/lib/i18n/intake-ui.ts` (test only, if the assertion passes)
- Create: `src/lib/i18n/intake-ui.test.ts`

> "we already had 10 before, but now we've added the additional visa refusal
> confirmation questions… I just wanted to confirm that we're not writing
> 'answer 10 short questions'."

**Already satisfied.** No string in `src/lib/i18n` names a fixed question
count. The two that mention a number — `srAllAnswered` ("All {n} questions
answered") and `srQuestionOf` ("Question {current} of {total}") — are
screen-reader labels interpolating the real total, and `HERO.lede` and
`SITE_TRAVELERS` already say "a few short questions". So this task is a
regression test, not a fix.

- [ ] **Step 1: Write the test**

`src/lib/i18n/intake-ui.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { INTAKE_UI } from "@/lib/i18n/intake-ui";
import { LOCALES } from "@/lib/i18n/locales";

/**
 * The intake grew from ten questions to more than ten when the visa
 * refusal follow-ups were added, and any copy that had baked the number
 * in would have started lying that day. Nothing does — the two strings
 * that mention a count interpolate the real one — and this is what
 * keeps it that way.
 */
describe("the intake copy", () => {
  const interpolated = new Set(["srAllAnswered", "srQuestionOf"]);

  it("never states a question count as a literal", () => {
    for (const [key, value] of Object.entries(INTAKE_UI)) {
      if (interpolated.has(key)) continue;
      if (typeof value !== "object" || value === null) continue;

      for (const locale of LOCALES) {
        const text = (value as Record<string, string>)[locale.code];
        if (typeof text !== "string") continue;
        expect(
          /\b\d+\s*(questions?|tambayoyi|ìbéèrè|ajụjụ|questions|perguntas|maswali|أسئلة|nsɛmmisa|imibuzo)\b/i.test(
            text
          ),
          `${key}.${locale.code} states a fixed question count: "${text}"`
        ).toBe(false);
      }
    }
  });

  it("still interpolates rather than hard-coding in the two that count", () => {
    for (const locale of LOCALES) {
      expect(INTAKE_UI.srQuestionOf[locale.code]).toContain("{total}");
      expect(INTAKE_UI.srAllAnswered[locale.code]).toContain("{n}");
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/lib/i18n/intake-ui.test.ts`
Expected: PASS on both. If the first fails, the string it names is the bug the
client was asking about — reword it to the generic phrasing in all ten
locales and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/intake-ui.test.ts
git commit -m "test: keep a fixed question count out of the intake copy"
```

---

### Task 6: A pre-check that gives the same answer twice

**Files:**
- Modify: `src/lib/ai/precheck.ts`
- Modify: `src/lib/ai/precheck.test.ts`

**Interfaces:**
- Produces: `precheckSchema` gains `confidence: z.enum(["high", "low"])`; the
  stored `raw` payload gains it too. `precheckDocument`'s signature and return
  are unchanged.

> "sometimes it's rejecting, sometimes it's passing. I don't understand it
> myself very well as well." — "so it just accepted the exact same thing it
> rejected just now. Why is that?"

The ×2-in-the-name bug was fixed on 7 September (`96aa8bc`). What the client
saw after it is the residual non-determinism.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/ai/precheck.test.ts`:

```ts
import { buildPrecheckPrompt, precheckSchema, resolveVerdict } from "@/lib/ai/precheck";

describe("resolveVerdict", () => {
  it("acts on a flag the model is sure about", () => {
    expect(resolveVerdict({ verdict: "flag", confidence: "high" })).toBe("flag");
  });

  it("does not act on a flag the model is unsure about", () => {
    // The prompt has said "when unsure, PASS" since the start, and the
    // model still flagged a correct passport photograph on one attempt
    // and passed it on the next. Prose asking for restraint is not a
    // constraint; making it name its own certainty, and refusing to act
    // on a low one, is.
    expect(resolveVerdict({ verdict: "flag", confidence: "low" })).toBe("pass");
  });

  it("never turns a pass into a flag, however confident", () => {
    // The AI's only power is to flag. It must not gain a second one
    // through a field added to make it flag less.
    expect(resolveVerdict({ verdict: "pass", confidence: "high" })).toBe("pass");
    expect(resolveVerdict({ verdict: "pass", confidence: "low" })).toBe("pass");
  });
});

describe("buildPrecheckPrompt", () => {
  it("asks the model to commit to a confidence", () => {
    const prompt = buildPrecheckPrompt({
      expectedName: "Passport biodata page",
      fileName: "img.jpg",
    });
    expect(prompt).toContain("confidence");
    expect(prompt).toMatch(/only.*high/i);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/ai/precheck.test.ts`
Expected: FAIL — `resolveVerdict` is not exported.

- [ ] **Step 3: Add the field, the resolver and the temperature**

In `src/lib/ai/precheck.ts`:

```ts
const precheckSchema = z.object({
  verdict: z.enum(["pass", "flag"]),
  /**
   * How sure the model is that the flag is right.
   *
   * The prompt has told it "when unsure, PASS" since this feature
   * existed, and it still flagged a correct passport photograph on one
   * attempt and passed the same file on the next — which is what the
   * client saw on 7 September. An instruction in prose is a hope; a
   * field it has to fill is a commitment, and `resolveVerdict` is what
   * makes the commitment matter.
   *
   * Ignored on a pass, and stored either way, so a support
   * conversation can tell "the model was sure" from "the model
   * guessed".
   */
  confidence: z.enum(["high", "low"]),
  reasonCode: z.enum([…]),
  reason: z.string(),
  notes: z.array(z.string()),
});

/**
 * What the product actually does with the model's answer.
 *
 * A flag it is unsure about becomes a pass: the document goes to a
 * human either way, and the difference is whether a traveller is told
 * to re-photograph something that was fine. One of those errors costs
 * a reviewer a glance; the other costs a traveller an afternoon and
 * their confidence in the checklist.
 *
 * A pass is never turned into a flag. The AI's one power in this
 * product is to flag, and a field added to make it flag less must not
 * hand it a second one.
 */
export function resolveVerdict(output: {
  verdict: "pass" | "flag";
  confidence: "high" | "low";
}): "pass" | "flag" {
  return output.verdict === "flag" && output.confidence === "high" ? "flag" : "pass";
}
```

In `buildPrecheckPrompt`, add a paragraph before the `reasonCode` one:

```
Set \`confidence\` to \`high\` only when you would stand behind this verdict if the same file were shown to you again — the document is plainly the wrong kind, plainly expired, or plainly unreadable. Anything borderline is \`low\`. A low-confidence flag is recorded for the reviewer and is not shown to the traveler, so there is no cost to admitting doubt and a real one to overstating certainty.
```

In `generateText`, add `temperature: 0`:

```ts
    const result = await generateText({
      model: openai(PRECHECK_MODEL),
      // Unset until now, so the model sampled and a borderline document
      // landed either side of the line at random — the whole of "it
      // just accepted the exact same thing it rejected". The judgement
      // here should be a function of the file, not of the draw.
      temperature: 0,
      messages: [ … ],
      output: Output.object({ schema: precheckSchema }),
    });
```

And use the resolver:

```ts
    const { verdict, confidence, reasonCode, reason, notes } = result.output;
    const resolved = resolveVerdict({ verdict, confidence });

    const applied = await applyPrecheckTx({
      applicationId,
      docKey,
      storagePath,
      verdict: resolved,
      reason,
      reasonCode,
      // The model's own answer, not the resolved one — a reviewer
      // looking at a document a low-confidence flag let through should
      // be able to see that it nearly did not.
      raw: { verdict, confidence, reasonCode, reason, notes },
    });

    const flagApplied = resolved === "flag" && applied.applied;
```

and track the resolved verdict, so the analytics count what happened rather
than what was suggested:

```ts
    await track(
      "toplance.document_prechecked",
      { applicationId, docKey, verdict: resolved, confidence },
      actorId
    );
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/ai/precheck.test.ts`
Expected: PASS, including the existing tests about the ×2 rule — those must
not regress.

- [ ] **Step 5: Check the behaviour by hand**

Run: `npm run dev`. Upload the same correct passport photograph five times to
the same checklist row.
Expected: the same verdict every time. That repeatability, not the verdict
itself, is what the client asked for.

Note in the review that `PRECHECK_MODEL` may still be non-deterministic at
`temperature: 0` — no provider guarantees bit-identical sampling — so the
confidence gate in Step 3 is the load-bearing half and the temperature is the
cheap half.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/precheck.ts src/lib/ai/precheck.test.ts
git commit -m "fix: stop the pre-check flagging a document it would otherwise pass"
```

---

## Self-review

**Spec coverage.** §5.1 → Task 1. §5.2 → Task 2. §5.3 → Task 3.
§5.4 → Task 4. §5.5 → Task 5. §5.6 → Task 6.

**Two tasks that found no bug.** Tasks 2 and 5 both start by establishing that
the feature the client asked for already exists, and change what was actually
wrong — an empty `fx_rates` table with no visible failure mode, and no
regression test. Say so at review rather than reporting them as new features.

**One wording departure.** Task 3 does not use the client's own sentence for
the tooltip, because that sentence describes our verification date and the
date on screen is the mission's. Flag it for confirmation.

**Type consistency.** `expectedDigits(mask)` and
`phoneProblem(iso, digits)` keep their argument order between the test, the
module and the component. `resolveVerdict` takes the whole output object in
both the test and the call site.

**Independence.** Nothing here depends on either of the other two plans, and
nothing in them depends on this. Run it in any order.
