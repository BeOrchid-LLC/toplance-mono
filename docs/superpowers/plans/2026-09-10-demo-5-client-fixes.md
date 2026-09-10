# Demo 5 Client Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the UI and copy changes Peace asked for in the Toplance Demo 5 call, by end of day 2026-09-10.

**Architecture:** Almost all of this is edits to existing surfaces. Six of the asks are copy renames that live entirely in `src/lib/i18n/*.ts`; the rest are scoped component changes on the ops console, the agency console and the traveller corridor. One task (top requested destinations) reads an analytics event that is already being written but never surfaced.

**Tech Stack:** Next.js (App Router, this repo's fork — see `AGENTS.md`), React server components, Tailwind with design tokens in `src/app/globals.css`, Drizzle ORM, vitest.

**Source:** Circleback meeting notes + transcript, "Toplance Demo 5", 2026-09-10, Peace and Muhammadali Toshpulatov.
`https://circleback.ai/meetings/SEG01BwoioSSnLuOEB8Tf`

**Baseline:** every line number in this plan was read against **`3c75331`** — `main` as of 2026-09-10, which includes PR #128. Re-check any line reference if `main` has moved. #128 landed *after* the call and already resolves part of what Peace raised: see Task 9 and Task 10.

---

## Global Constraints

- **Every UI string is a `Record<Locale, string>` across ten locales** — `en, ha, yo, ig, fr, pt, sw, ar, tw, zu` (`src/lib/i18n/locales.ts`). The records are exhaustive by type, so a missing locale is a compile error. All ten are supplied in this plan. Per repo convention, non-English values are translated in-house and the file keeps its `NEEDS NATIVE REVIEW before launch` caveat.
- **No new Markdown renderers, no `dangerouslySetInnerHTML`** for model output (`AGENTS.md`).
- **Destructive controls confirm before they commit** (`AGENTS.md`). Nothing in this plan adds a destructive control, so no new `ConfirmDialog` call sites.
- **Design freeze, set by Peace at 20:03 in the call:** *"let's just make them local and minor. Let's not go do any overwhelming revisions to the UI."* Every task here is scoped to the smallest surface that satisfies the ask. Do not refactor adjacent code.
- **Gate for every task:** `npm run typecheck && npm run test && npm run lint`. Commit only when all three pass.
- **Known local test noise:** some DB-gated tests hit a real database locally that CI skips — `curated.test.ts` fails locally and only locally. Take a baseline with `npm run test` *before* the first edit so you can tell a pre-existing failure from one you caused. Do not chase it.
- **Branching:** do not commit on `main`. Cut a branch first (`git switch -c demo-5-client-fixes`).

---

## Decisions taken before planning

| Question | Decision |
|---|---|
| Yellow button vs. the `--way` design token | **Scope to that one button.** Change the traveller dashboard CTA only; the token, the site corridor bar and every other `--way` use keep their yellow. |
| `anyStatus` rename scope | **All five i18n files**, not just the agencies table, so the product does not say two different things. |
| Non-English locales | **Translate all ten now**, matching how `HERO` and `OPS_COMMON` were done. |

---

## Things Peace raised that the auto-notes dropped

These have no action item in Circleback but are in the transcript. Tasks 13 and 14 cover the first; the second needs a decision, not code.

1. **Agency stats are wrong** (24:15). Ali: *"somehow it's showing the stats wrong here… we didn't change the stats to live yet."* BeOrchid Travel showed zero applications. Task 13.
2. **Passport photo AI verification rejects valid images** (43:07–44:25). Peace floated fintech-style live capture; Ali pushed back because documents go to embassies and should be professionally taken. Landed on "improve it" with manual verification as the fallback. **No agreed scope — do not start this without asking Peace what "improved" means.** Flagged in Task 17.

---

## File Structure

| File | Change | Task |
|---|---|---|
| `src/lib/i18n/agency-verification.ts` | `body` rewritten | 1 |
| `src/lib/i18n/ops-tenants.ts` | `provisionButton`, `anyStatus` | 2, 4 |
| `src/lib/i18n/ops-support.ts` | `claim`, `stateClaimed`, `tableHead.assignee` | 3 |
| `src/lib/i18n/ops-staff.ts`, `agency.ts`, `ops-kyb.ts`, `ops-enquiries.ts` | `anyStatus` | 4 |
| `src/app/[locale]/ops/tenants/page.tsx` | default sort | 5 |
| `src/components/agency/team-roster.tsx` | email column | 6 |
| `src/components/shared/admin-sidebar.tsx` | collapsed mark | 7 |
| `src/app/[locale]/(app)/app/(corridor)/documents/page.tsx` | status-driven section colour | 8 |
| `src/app/[locale]/(app)/app/(corridor)/page.tsx` | CTA variant, plate layout | 9, 11 |
| `src/components/app/route-diagram.tsx` | density + sticky | 10 |
| `src/lib/i18n/dashboard.ts`, `(corridor)/page.tsx` | approved celebration | 12 |
| `src/lib/data/dashboard.ts`, `src/app/[locale]/ops/dashboard/page.tsx` | requested-destinations metric | 13 |
| `src/components/ops/tenants-table.tsx` + data layer | stats correctness | 14 |

---

# Phase A — Copy

Pure string edits. No behaviour changes, no risk. Do these first: they are six of the client's seventeen items and they are what Peace will look for.

### Task 1: Agency verification screen copy

**Files:**
- Modify: `src/lib/i18n/agency-verification.ts:52-63` (the `body` record)

**Why:** Peace at 8:33. The current copy says *"Our team is reviewing the documents you sent"*, which implies a manual review already under way. The real flow emails the agency asking for documents. Peace dictated the replacement almost verbatim.

**Note before you start:** the current English also promises *"with a link to start your subscription."* Peace's dictated copy drops that. This plan follows Peace. If losing the subscription-link sentence matters, raise it — do not silently re-add it.

- [ ] **Step 1: Replace the `body` record**

```ts
  body: {
    en: "We have sent you an email request for verification documents. Once your documents are verified, we will activate your account.",
    ha: "Mun aika muku da imel muna neman takardun tabbatarwa. Da zarar an tabbatar da takardunku, za mu kunna asusunku.",
    yo: "A ti fi ímeèlì ránṣẹ́ sí yín láti béèrè àwọn ìwé ìjẹ́rìísí. Kété tí a bá ti jẹ́rìísí àwọn ìwé yín, a ó ṣí àkọọ́lẹ̀ yín.",
    ig: "Anyị ezigala gị ozi ịmeel na-arịọ akwụkwọ nkwenye. Ozugbo anyị kwadoro akwụkwọ gị, anyị ga-agbanye akaụntụ gị.",
    fr: "Nous vous avons envoyé un e-mail demandant vos documents de vérification. Dès qu'ils seront vérifiés, nous activerons votre compte.",
    pt: "Enviámos-lhe um e-mail a pedir os documentos de verificação. Assim que os seus documentos forem verificados, ativaremos a sua conta.",
    sw: "Tumekutumia barua pepe tukiomba nyaraka za uthibitisho. Mara nyaraka zako zitakapothibitishwa, tutawasha akaunti yako.",
    ar: "لقد أرسلنا إليك بريدًا إلكترونيًا نطلب فيه مستندات التحقق. وبمجرد التحقق من مستنداتك، سنقوم بتفعيل حسابك.",
    tw: "Yɛasoma email akɔma wo rebisa wo nkrataa a wɔde bɛsɔ wo ano. Sɛ yɛsɔ wo nkrataa no ano wie a, yɛbɛbue wo akawnt no.",
    zu: "Sikuthumele i-imeyili sicela amadokhumenti okuqinisekisa. Uma amadokhumenti akho eseqinisekisiwe, sizovula i-akhawunti yakho.",
  },
```

- [ ] **Step 2: Verify types and tests**

Run: `npm run typecheck && npm run test`
Expected: PASS. A missing locale here is a compile error, so typecheck is the real gate.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/agency-verification.ts
git commit -m "Say what actually happens next on the verification screen"
```

---

### Task 2: "Provision agency" → "Create agency"

**Files:**
- Modify: `src/lib/i18n/ops-tenants.ts:465-476` (`provisionButton`)

**Why:** Peace at 13:20–14:36. *"Provision"* did not read as anything to them; they asked what it meant, and once Ali explained it auto-fills agency setup from a demo request, Peace said *"let's say create agency then."*

**Scope note:** rename the **label only**. The symbol names (`provisionButton`, `provisionTenant`, `ProvisionTenant`, `toplance.tenant_provisioned`) stay as they are. Renaming the analytics event would break the union in `src/lib/analytics/events.ts` and the audit trail; renaming the component is churn the design freeze rules out.

- [ ] **Step 1: Replace the `provisionButton` record**

```ts
  provisionButton: {
    en: "Create agency",
    ha: "Ƙirƙiri hukuma",
    yo: "Ṣẹ̀dá ilé-iṣẹ́",
    ig: "Mepụta ụlọ ọrụ",
    fr: "Créer une agence",
    pt: "Criar agência",
    sw: "Unda wakala",
    ar: "إنشاء وكالة",
    tw: "Bɔ adwumakuo",
    zu: "Dala i-ejensi",
  },
```

- [ ] **Step 2: Check for other places the old wording leaks**

Run: `grep -rn "Provision agency\|Provision one" src/lib/i18n/`
Expected: one hit at `ops-tenants.ts:310` — the empty-state line *"No agency has been created yet. Provision one from an enquiry below, or start from scratch."* Change `Provision one` → `Create one` in all ten locales of that record too, so the empty state and the button agree.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/ops-tenants.ts
git commit -m "Call the button what it does: create an agency"
```

---

### Task 3: Support ticket vocabulary

**Files:**
- Modify: `src/lib/i18n/ops-support.ts:135-137` (`stateClaimed`), `:160-162` (`tableHead.assignee`), `:169-171` (`claim`)

**Why:** Peace at 17:09–20:01. Their reasoning, verbatim: *"claim kind of looks like a dispute resolution term, as though you were inviting a mediator to come and assess something."* They first said "Assigned" for the state, then corrected themselves to "In progress" and asked not to overcomplicate it.

The trio must land together — the button, the state pill and the column header are one vocabulary, and `ops-support.ts:10` already warns about *"describing one thing with two vocabularies."*

- [ ] **Step 1: Replace all three records**

```ts
  stateClaimed: {
    en: "In progress",
    ha: "Ana kan aiki",
    yo: "Ó ń lọ lọ́wọ́",
    ig: "Na-aga n'ihu",
    fr: "En cours",
    pt: "Em curso",
    sw: "Inaendelea",
    ar: "قيد التنفيذ",
    tw: "Ɛrekɔ so",
    zu: "Kuyaqhubeka",
  },
```

```ts
    assignee: {
      en: "Assignee",
      ha: "Wanda aka ba",
      yo: "Ẹni tí a yàn",
      ig: "Onye e kenyere",
      fr: "Responsable",
      pt: "Responsável",
      sw: "Aliyekabidhiwa",
      ar: "المسؤول",
      tw: "Deɛ wɔde ama",
      zu: "Obelwe",
    },
```

```ts
  claim: {
    en: "Assign to me",
    ha: "Ba ni wannan",
    yo: "Yàn án fún mi",
    ig: "Kenye m ya",
    fr: "M'attribuer",
    pt: "Atribuir a mim",
    sw: "Nikabidhi mimi",
    ar: "إسناد إليّ",
    tw: "Fa ma me",
    zu: "Ngabele mina",
  },
```

- [ ] **Step 2: Check the state pill's colour still makes sense**

Read: `src/app/[locale]/agency/support/page.tsx:32-35`
`STATE_VARIANT.claimed` is `"brand"`. "In progress" in brand blue beside `open` and `resolved` is still legible — leave it. Do not change the variant.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/ops-support.ts
git commit -m "One vocabulary for support tickets: assign, in progress, assignee"
```

---

### Task 4: "Any status" → "All statuses", everywhere

**Files:**
- Modify: `src/lib/i18n/ops-tenants.ts:285-296`
- Modify: `src/lib/i18n/ops-staff.ts:256-267`
- Modify: `src/lib/i18n/agency.ts:893-904`
- Modify: `src/lib/i18n/ops-kyb.ts:144` (surrounding record)
- Modify: `src/lib/i18n/ops-enquiries.ts:289` (surrounding record)

**Why:** Peace at 24:55–25:21, asking for the agencies table. Per the decision above, all five filters change so the product does not use two labels for one control.

- [ ] **Step 1: Apply this record to `anyStatus` in all five files**

```ts
  anyStatus: {
    en: "All statuses",
    ha: "Duk matsayi",
    yo: "Gbogbo ipò",
    ig: "Ọnọdụ niile",
    fr: "Tous les statuts",
    pt: "Todos os estados",
    sw: "Hali zote",
    ar: "كل الحالات",
    tw: "Tebea nyinaa",
    zu: "Zonke izimo",
  },
```

- [ ] **Step 2: Confirm nothing was missed**

Run: `grep -rn "Any status" src/`
Expected: no output.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/
git commit -m "Every status filter says All statuses"
```

---

# Phase B — Tables and chrome

### Task 5: Agencies table defaults to newest first

**Files:**
- Modify: `src/app/[locale]/ops/tenants/page.tsx:134`

**Why:** Peace at 11:20–12:19. BeOrchid Travel had just been created and showed up third. Peace: *"default should be chronological… the one that was most recently created"* — so staff can track active verifications without hunting.

**Current:** `const sort = readSort(params.sort, TENANT_SORTS, "agency");` — falls back to sorting by agency name.

- [ ] **Step 1: Read the sorting helpers before changing anything**

Run: `sed -n '1,80p' src/lib/domain/sorting.ts` and `grep -n "TENANT_SORTS" -A15 src/lib/domain/sorting.ts src/components/ops/tenants-table.tsx`
Establish: what `readSort` does with a default, whether direction is a separate param, and that `"added"` is a valid key in `TENANT_SORTS` (the column at `tenants-table.tsx:100` has `id: "added"`, `sortable: true`).

- [ ] **Step 2: Change the default sort key to `added`, descending**

Change line 134 so the fallback is `"added"` rather than `"agency"`, and make sure the default direction resolves to descending (newest first). If `readSort` returns only a key and direction comes from a separate `readDir`/`dir` value, set that default too — check line 142's `dir` argument.

The explicit `?sort=` link a reader clicks must still win; only the no-parameter default changes.

- [ ] **Step 3: Verify in the browser**

Open `/ops/tenants` with no query string. The most recently created agency is row 1. Click the "Agency" header — it still sorts by name. Reload with no query string — newest first again.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/ops/tenants/page.tsx"
git commit -m "Show the newest agency first, so a fresh verification is at the top"
```

---

### Task 6: Team roster email gets its own column

**Files:**
- Modify: `src/components/agency/team-roster.tsx:97-121`
- Modify: `src/lib/i18n/agency.ts` (`tableHead`, add `email`)

**Why:** Peace at 21:15–21:52: *"that text you just highlighted now looks really small… I'm kind of squinting my eyes to see it."* The email currently renders under the name as `<span className="special block truncate">`, which is the 13px style Ali confirmed on the call.

- [ ] **Step 1: Add an `email` label to `AGENCY.tableHead`**

`tableHead` is declared in **two** places in `src/lib/i18n/agency.ts` and both need the addition — the type block at `:108-116` (`client, route, documents, status, submitted, colleague, joined, rank`) and the value record at `:1115`. Add `email: L;` to the type, and this to the record:

```ts
    email: {
      en: "Email",
      ha: "Imel",
      yo: "Ímeèlì",
      ig: "Ozi ịmeel",
      fr: "E-mail",
      pt: "E-mail",
      sw: "Barua pepe",
      ar: "البريد الإلكتروني",
      tw: "Email",
      zu: "I-imeyili",
    },
```

- [ ] **Step 2: Add the header cell**

In `team-roster.tsx`, after the `colleague` head:

```tsx
              <TableHead>{AGENCY.tableHead.colleague[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.email[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.joined[locale]}</TableHead>
```

- [ ] **Step 3: Move the email out of the name cell into its own cell**

Replace the colleague `<TableCell>` and add the new one after it:

```tsx
                <TableCell>
                  <span className="block truncate font-semibold">
                    {member.fullName || member.email}
                  </span>
                </TableCell>

                <TableCell className="t-muted">
                  <span className="block truncate" title={member.email}>
                    {member.email}
                  </span>
                </TableCell>
```

The `title` moves with the address, since that is what it was disambiguating. `t-muted` rather than `special` is the point of the task — `special` is the 13px style Peace could not read.

- [ ] **Step 4: Check the roster at a narrow width**

The table now has five columns. Open the agency team screen at 1024px and at 768px and confirm nothing overflows the page — the repo's tables scroll inside themselves (Ali demonstrated this at 12:38), so the fix if it is tight is the existing scroll container, not a font size.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/agency/team-roster.tsx src/lib/i18n/agency.ts
git commit -m "Give the colleague's email its own column instead of 13px under the name"
```

---

### Task 7: Collapsed sidebar shows the logo mark

**Files:**
- Modify: `src/components/shared/admin-sidebar.tsx:54-68`

**Why:** Peace at 27:13–27:28: *"can we have it to be the icon?"* Today the collapsed rail prints `title.charAt(0)` — the first letter of the console name — in a grey rounded square.

**Read the existing comment first.** Lines 55-57 explain the letter is deliberate: *"the rail is the only thing on screen that says which console this is."* A logo mark is fine for that as long as the rail still identifies the console; keep `aria-hidden` on it and keep the accessible name coming from `navLabel`.

- [ ] **Step 1: Find out whether a mark component or asset already exists**

Run: `grep -rn "Logo\|logo\|Mark\b" src/components/site src/components/shared --include="*.tsx" | head -20` and `ls public/`
If there is an existing brand mark, use it. If there is not, this task needs an asset from Peace before it can be finished — say so and move on rather than drawing one.

- [ ] **Step 2: Swap the letter for the mark**

Keep the existing `group-data-[collapsed]/rail:flex` visibility mechanism and the `size-8` box so the rail's metrics do not move. Replace only what is inside it. Keep `aria-hidden`.

- [ ] **Step 3: Check both states and both themes**

Collapse and expand the rail on `/ops` and on `/agency`. Check light and dark — if the mark is a single-colour SVG it needs `currentColor` or a token, not a baked hex.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/admin-sidebar.tsx
git commit -m "Print the logo mark on the collapsed rail, not the first letter"
```

---

# Phase C — Traveller surface

### Task 8: Status sections stop being green regardless of status

**Files:**
- Modify: `src/app/[locale]/(app)/app/(corridor)/documents/page.tsx:214,228`

**Why:** Peace at 46:11: *"can we have it colour coded… because right now it's all close green."*

**This is the actual bug, and it is not what the action item says.** The status *pills* are already colour-coded correctly: `STATUS_VARIANT` in `src/lib/domain/status.ts:78` maps `submitted → info` (blue), `under_review → warning` (amber), `approved → success` (green), `rejected → danger` (red) — a mapping the comment records as *"locked with the client 2026-08-21"*, which is exactly what Peace asked for again. Nothing needs changing there.

What is wrong is the **section sheets** on the documents page. Line 214 (everything verified, ready to submit) and line 228 (just submitted) both hardcode:

```
border-[color-mix(in_srgb,var(--success)_32%,transparent)] bg-[color-mix(in_srgb,var(--success)_7%,transparent)]
```

Two different states painted the same green. That is the "all close green" Peace saw.

- [ ] **Step 1: Write a failing test for the mapping helper**

Create `src/lib/domain/status.test.ts` additions (or a new test beside it) asserting that a helper returns a different token for `submitted` than for `approved`:

```ts
import { describe, expect, it } from "vitest";
import { statusSheetTone } from "@/lib/domain/status";

describe("statusSheetTone", () => {
  it("does not paint submitted and approved the same", () => {
    expect(statusSheetTone("submitted")).not.toBe(statusSheetTone("approved"));
  });

  it("follows STATUS_VARIANT rather than inventing a second mapping", () => {
    expect(statusSheetTone("under_review")).toBe("warning");
    expect(statusSheetTone("approved")).toBe("success");
    expect(statusSheetTone("rejected")).toBe("danger");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/domain/status.test.ts`
Expected: FAIL — `statusSheetTone` is not exported.

- [ ] **Step 3: Add the helper to `src/lib/domain/status.ts`**

It must read `STATUS_VARIANT`, not restate it — a second mapping is the bug this task exists to avoid.

```ts
/**
 * The sheet colour for a status panel, derived from the pill's own
 * variant so the panel and the badge can never disagree.
 *
 * The documents screen used to hardcode `--success` for both "ready to
 * submit" and "just submitted", which is why every state downstream of
 * upload read as green to the client on 10 September.
 */
export function statusSheetTone(status: ApplicationStatus): BadgeVariant {
  return STATUS_VARIANT[status];
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/lib/domain/status.test.ts`
Expected: PASS

- [ ] **Step 5: Use it on the two hardcoded sections**

Replace the literal `var(--success)` in both `<section>` class strings with a token chosen from `statusSheetTone(application.status)`. Build the class from a small lookup in the page rather than interpolating a token name into a Tailwind arbitrary value — Tailwind cannot see dynamically built class strings, and an interpolated `var(--${tone})` will silently produce no style.

Keep the "just submitted" sheet's existing comment (lines 220-225): it explains why that confirmation stays on screen, and that reasoning is unchanged.

- [ ] **Step 6: Walk the states in the browser**

Take one application through `collecting_documents → submitted → under_review → approved` and confirm the sheet changes colour at each step and matches the pill beside it.

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/domain/status.ts src/lib/domain/status.test.ts "src/app/[locale]/(app)/app/(corridor)/documents/page.tsx"
git commit -m "Colour the status sheet from the status, not always green"
```

---

### Task 9: The yellow CTA goes brand blue

**Files:**
- Modify: `src/app/[locale]/(app)/app/(corridor)/page.tsx:160`

**Why:** Peace at 48:30–49:25: *"this button here is yellow… can we keep it blue? Or outline. Let's just stay in line with the brand colours."*

**Read this before editing.** That yellow is `--way`, and `src/app/globals.css:171-174` says: *"`--way` marks the next step and nothing else. Exactly one thing per screen wears it; two means one is wrong."* Per the decision taken above, the change is scoped to **this button only** — the token keeps its value, and `src/components/site/corridor-bar.tsx:227` keeps its yellow.

**There are now two `--way` buttons on this page, not one.** PR #128 restructured the plate, and as of `3c75331` they sit at **line 160** and **line 181**, on the two arms of one ternary:

- **Line 160** — the `actionable` arm, carrying all four action labels including `ctaReviewSubmit`. **This is the one Peace pointed at.** Change this one.
- **Line 181** — the `decided && granted` arm, linking to the arrival companion on an approved case. Peace never saw this one yellow; it is also the exact branch Task 12 rebuilds, so leave it alone here and settle its colour there rather than changing the same lines twice.

They are mutually exclusive branches, so only one ever renders and §4.1 is not violated today. Changing line 160 alone means the pre-decision screens carry no `--way` object while the approved screen still does — deliberate, and worth a sentence to Peace when you show it.

Consequence to be aware of: the traveller dashboard will then have no `--way` object at all. That is a deliberate acceptance of the client's preference over §4.1, not an oversight. Leave a comment saying so, per `AGENTS.md`'s instruction to leave the reasoning where the next person finds it.

**Separately: the persistence bug is already fixed and already merged.** Ali told Peace at 48:36 that the button still showing after submission was addressed in an unmerged PR. That PR has since landed as **#128 (`3c75331`)**, which added `src/lib/domain/next-step.ts`. Its header comment describes exactly the bug Peace saw: *"A checklist stays complete after submission, so that plate survived `submitted`, `under_review`, `processing`, the interview and both decisions: a case sitting with the embassy still invited the traveller to send it."* Do not re-fix it, and do not list it as outstanding when reporting back to Peace.

- [ ] **Step 1: Change the variant and replace the comment**

```tsx
                {/* Brand blue rather than `--way`, at the client's
                    request on 10 September: they asked for the button to
                    stay in the brand palette. §4.1 wanted the next step
                    in `--way` and this screen therefore now carries no
                    `--way` object — a deliberate exception, not a
                    missed one. The token itself is unchanged and the
                    site's corridor bar still wears it. */}
                <Button asChild variant="primary" className="mt-6">
```

`primary` is confirmed to exist in `src/components/ui/button.tsx` (the variants are `primary, secondary, tertiary, neutral, success, warning, danger, way, ghost, link`). If Peace prefers the outline reading they also offered, `secondary` or `tertiary` is the nearer match — check which one renders as an outline before substituting.

- [ ] **Step 2: Check contrast still holds**

Run: `npx vitest run src/lib/design/tokens.test.ts`
Expected: PASS. The `--way`/`--way-ink` assertions are untouched because the token did not change.

- [ ] **Step 3: Look at all four CTA labels**

This button carries four labels depending on state (`ctaFixSentBack`, `ctaReviewSubmit`, `ctaSeeDocuments`, `ctaUploadNext`). All four now render blue. Confirm none of them looked deliberately yellow for a different reason.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(app)/app/(corridor)/page.tsx"
git commit -m "Put the traveller's next-step button back in the brand palette"
```

---

### Task 10: Route diagram — smaller, sticky, with the helper text foldable

**Files:**
- Modify: `src/components/app/route-diagram.tsx`
- Modify: `src/app/[locale]/(app)/app/(corridor)/page.tsx:101`

**Why:** Two asks that the action items split apart but that are one change.
- 4:22, on the dashboard: *"I love it, but it is taking up a little too much space… most of the primary information is buried already. So let's try and optimize the space at the top of the screen."*
- 41:11–42:10, on the document upload page: *"I'd like for it to be reserved in position even while they are scrolling"*, then *"have a subheading for this helpful text… then they can minimize it so that that one then becomes sticky."*

**Establish first:** `RouteDiagram` currently renders **only** on the corridor dashboard (`(corridor)/page.tsx:101`). It is not on the documents page at all. Before building, confirm with Peace which screen they meant at 41:11 — the transcript has them looking at document uploads. Two readings:
- (a) they want the existing dashboard diagram denser **and** the documents page to grow a sticky tracker, or
- (b) they were describing the documents page's own header block (`documents/page.tsx:109-127`, the heading plus `CompletionRing`).

Reading (b) is likelier from context — the ring and the three-column note block are what sits above the uploads. **Do the density check (Steps 1–2) regardless; hold the sticky work until this is answered.**

- [ ] **Step 1: Check whether #128 already did this**

PR #128 rewrote 196 lines of `route-diagram.tsx` after the call. The stage list is now `<ol className="mt-2 flex flex-col sm:flex-row sm:pt-7">` at line 57 — already tighter than the `mt-3 … gap-3` it had when Peace complained at 4:22.

**Look at the live dashboard before changing anything.** Peace's complaint was against the pre-#128 diagram. If #128 already bought back the space, this step is done and the honest answer to Peace is "already fixed", not a second round of tightening. Only continue if it still crowds the fold.

- [ ] **Step 2: If it is still too tall, reduce the footprint**

Tighten the top margin and the stacked spacing. Do not change the `sm:` row layout, the `aria-current="step"` handling, or the ordered-list semantics — the comment above the `<ol>` explains why it is an `<ol>`.

- [ ] **Step 3: Confirm the screen reader output is unchanged**

Run: `npm run test`
Then read the diagram with VoiceOver or check the rendered markup: still an `<ol>`, still one `<li>` per stage, still `aria-current="step"` on the marked stage.

- [ ] **Step 4: Commit the density change on its own**

```bash
git add src/components/app/route-diagram.tsx
git commit -m "Give the route diagram less of the fold"
```

- [ ] **Step 5: (Blocked) sticky tracker + collapsible helper text**

Do not start until the question above is answered. When it is: the helper text on the documents page is `documents/page.tsx:146-165` — the three-column `t-muted` block and `precheckDisclosure`. Folding that under a subheading and making the block above it `sticky top-0` is the shape of the change.

---

### Task 11: Next-step plate lays out horizontally

**Files:**
- Modify: `src/app/[locale]/(app)/app/(corridor)/page.tsx:122-180`

**Why:** Peace at 29:02: *"for this toast… can we make it more inline, for instance can we shift it to the side horizontally, so that it doesn't stack… so that it occupies even less space."*

**What Peace means by "toast" is not a Sonner toast.** `src/components/ui/sonner.tsx` is the transient toast system and is not what was on screen. The thing Peace pointed at is the notice plate on the traveller dashboard — heading, body, `VERIFIED_MEANS` line, then the CTA, all stacked inside `<div className="max-w-[58ch]">`. It is the same element they called "this toast" at 4:22. Do not touch `sonner.tsx`.

- [ ] **Step 1: Lay the plate out as a row on wide screens**

Keep the heading and body in a column, and move the CTA beside them rather than under them, so the plate loses a row of height. The panel is already inside a `lg:grid-cols-[1fr_360px]` grid, so the available width is generous at `lg` and tight below it — the row treatment should be `sm:` or `lg:` gated and stack on mobile.

Preserve `max-w-[58ch]` on the prose so the measure does not blow out when the copy column widens.

- [ ] **Step 2: Check every heading state**

The heading has five branches (sent back one/many, verified, uploaded, to-upload one/many). The longest is the sent-back-many case with names interpolated. Confirm the row layout survives the longest one without the CTA wrapping oddly.

- [ ] **Step 3: Check `AttendanceNotice` still reads correctly beside it**

Line 110 renders `<AttendanceNotice>` above this block — the biometrics notice Peace saw at 3:48. Confirm the two do not now compete.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(app)/app/(corridor)/page.tsx"
git commit -m "Lay the next-step plate out across the width instead of down the page"
```

---

### Task 12: The approved state feels like something happened

**Files:**
- Modify: `src/app/[locale]/(app)/app/(corridor)/page.tsx`
- Modify: `src/lib/i18n/dashboard.ts`

**Why:** Peace at 47:44–48:16: *"getting your visa approved is something to celebrate… instead of just displaying it in the typical status banner that we have, let's make it more exciting."* They explicitly said it need not be animated — *"it doesn't even have to be animated"* — an illustration is enough.

**This is the one genuinely open-ended item on the list.** Everything else has a determined answer; this does not. Two constraints bound it:
- Peace's design freeze at 20:03 — local and minor, no overwhelming revision.
- `globals.css` — if this uses a fill, it must be a token, and it must not become a second `--way` object on the screen.

- [ ] **Step 1: Put one option to Peace before building**

A single celebratory sheet on the `approved` branch: a larger heading, an illustration or a mark, and the arrival-checklist link as the follow-on action. No confetti, no animation, no new dependency. Get a yes on the shape before spending time on the asset.

- [ ] **Step 2: Add the copy record**

Once agreed, add the heading and body to `DASHBOARD` in `src/lib/i18n/dashboard.ts` in all ten locales, following the existing `headingVerified`/`bodyVerified` pattern immediately around it.

- [ ] **Step 3: Render it on the approved branch only**

Gate on the application status being `approved`. Every other status keeps the plate exactly as it is.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(app)/app/(corridor)/page.tsx" src/lib/i18n/dashboard.ts
git commit -m "Mark an approved visa as the thing worth marking"
```

---

# Phase D — Dashboard

### Task 13: Top requested destinations we do not cover

**Files:**
- Modify: `src/lib/data/dashboard.ts` (query + `DemandKpis`)
- Modify: `src/app/[locale]/ops/dashboard/page.tsx:519-600` (the `Demand` panel)

**Why:** Peace at 26:12–27:01: *"top requests from the website… especially the ones we don't have, so that we know what to prioritize for our next iteration."* Ali committed to shipping it the same day.

**The good news: the data already exists.** `toplance.corridor_requested` is in the events union (`src/lib/analytics/events.ts:38`) and is written in two places in `src/lib/data/intake.ts` — at line 198 when a free-text answer has no ISO code, and at line 233 when a corridor resolves to no rule set. `src/lib/domain/corridors.ts:45` states the intent outright: *"a traveller can now express a destination we do not serve — so `toplance.corridor_requested` counts it, and the roadmap gets demand instead of silence."*

Nothing surfaces it. `dashboard.ts:191-194` queries `analytics_events` but only groups by `name`, so the destination inside `props` is discarded.

**Watch the two prop shapes.** Line 198's branch writes `{ nationality, destination, purpose }` — raw free text. Line 233's writes `{ nationalityIso, destinationIso, purpose }` — ISO codes. Any aggregation must read both keys or it silently loses half the demand.

- [ ] **Step 1: Write the failing test**

Create `src/lib/data/dashboard.test.ts` (or extend it if it exists):

```ts
import { describe, expect, it } from "vitest";
import { requestedDestinationsOf } from "@/lib/data/dashboard";

describe("requestedDestinationsOf", () => {
  it("counts both the ISO branch and the free-text branch", () => {
    const rows = [
      { props: { destinationIso: "jp" } },
      { props: { destination: "Japan" } },
      { props: { destinationIso: "jp" } },
    ];
    const top = requestedDestinationsOf(rows, 6);
    expect(top.find((t) => t.key.toLowerCase().startsWith("j"))?.count).toBe(3);
  });

  it("ignores an event with no destination at all", () => {
    expect(requestedDestinationsOf([{ props: {} }], 6)).toEqual([]);
  });
});
```

The first assertion requires deciding how "Japan" and "jp" reconcile. Normalise free text through `DESTINATION_ISO` in `src/lib/domain/corridors.ts` where a key matches, and fall back to the raw string where it does not — a destination the product has never heard of is precisely the demand signal Peace wants, so it must not be dropped.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/data/dashboard.test.ts`
Expected: FAIL — `requestedDestinationsOf` is not exported.

- [ ] **Step 3: Add the query**

Alongside the existing event query at `dashboard.ts:191`, select `props` for rows where `name = 'toplance.corridor_requested'` and `createdAt >= windowStart`. Reuse the existing `analytics_events_name_idx` — it is `(name, createdAt)`, which is exactly this predicate.

- [ ] **Step 4: Add `requestedDestinations` to `DemandKpis`**

```ts
export type DemandKpis = {
  destinations: TopCount[];
  /** Destinations travellers asked for that no rule set answers. */
  requestedDestinations: TopCount[];
  purposes: TopCount[];
  // …unchanged
};
```

Populate it in `demandOf`, using `topCounts` from `src/lib/domain/kpis.ts:360` so the ordering tie-break matches every other panel.

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx vitest run src/lib/data/dashboard.test.ts`
Expected: PASS

- [ ] **Step 6: Render it in the Demand tab**

Add a panel beside "Top destinations" at `ops/dashboard/page.tsx:554`, following that panel's exact shape. Label it so the distinction from "Top destinations" is unmissable — "Requested, not yet covered". An empty state matters here: `empty="No uncovered destinations requested in this window."`

The window is `USAGE_WINDOW_DAYS` (30). Say so in the panel or the reader will assume all time.

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run test && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/data/dashboard.ts src/lib/data/dashboard.test.ts "src/app/[locale]/ops/dashboard/page.tsx"
git commit -m "Surface the destinations travellers asked for and we do not serve"
```

---

### Task 14: Agency stats show real numbers

**Files:**
- Investigate: `src/components/ops/tenants-table.tsx:60-88`, and whatever populates `TenantRow`

**Why:** Ali at 24:15, watching the demo: *"somehow it's showing the stats wrong here… we didn't change the stats to live yet."* Peace saw a newly created agency with zero applications. **This has no Circleback action item** — it was said as an observation and the summariser dropped it.

- [ ] **Step 1: Reproduce before changing anything**

Run: `grep -rn "TenantRow" src/lib/data/ | head` then read whichever function builds it. Establish whether `applicationsTotal`, `inProgress`, `withReviewer`, `approved` and `rejected` are computed from live rows or are placeholders.

- [ ] **Step 2: State what you found before fixing it**

If they are live and merely zero because a fresh agency genuinely has no applications, then there is no bug and Ali misread the demo — say that and close the task. If they are placeholders, fix them and write a test that asserts a seeded agency reports its true counts.

Do not skip Step 2. The whole task is contingent on which of these is true.

---

# Phase E — Off-repo

These are not code and cannot be done by editing this repository. They are listed because they are on the client's action list and someone will ask.

### Task 15: Merge and deploy the open PRs

Ali told Peace at 3:12 that updates were sitting in PRs unmerged *"just not to break the production right now"*, and at 48:36 that the persisting-submit-button fix is among them.

**Largely done already.** `gh pr list --state open` returns nothing, `main` is at `3c75331` (#128), and local `main` is level with `origin/main` — 0 ahead, 0 behind. The persisting-button fix Ali described is #128 itself. So "merge the pending PRs" is satisfied for that item.

- [ ] Confirm nothing is stranded on an unpushed local branch: `git branch --no-merged main` will list any that still carry unmerged work.
- [ ] **Deploy is the remaining half.** Merging is done; staging runs on Coolify (Docker/standalone behind Traefik + Cloudflare), which this repo records nowhere. Confirm `3c75331` is actually deployed before telling Peace the fixes are live.
- [ ] Base branch: `main` **is** the default and the correct PR base (`gh repo view` reports it; local `origin/HEAD` was stale until 2026-09-10 and now agrees). Landing is a **squash**, signed commits are enforced, and direct pushes to `main` fail with GH013 — so every task in this plan goes through a PR from a side branch.

### Task 16: Clerk plan upgrade

Blocked, and not on Ali. Peace at 33:36 asked what it takes; Ali's answer at 33:46: *"we are using free mode probably. We have to ask Edward how to fix this issue… you guys have to pay for that."* Until BeOrchid upgrades, every test email needs the `+clerk_test` suffix and sign-ins fail past roughly 100 attempts.

- [ ] Ali to raise with Edward. Nothing to implement here.

### Task 17: Staging cleanup

Ali at 34:16: *"I have to clean up the staging as well, I have got lots of testing emails and stuff."* He deleted some Clerk users live on the call at 36:06 to get unblocked.

- [ ] Purge accumulated test users from Clerk and from staging's database.
- [ ] Note the constraint recorded in memory: `.env.local` points local storage at the **staging R2 bucket**, so deleting stored objects locally is not local.

### Also outstanding: passport photo AI verification

Peace at 43:07, Ali at 44:20–44:25. No agreed scope. Ali said he would *"improve it, make it easier"*, with manual verification as the standing fallback and live capture explicitly set aside. **Get a definition of done from Peace before starting.**

---

## Self-Review

**Spec coverage.** All 17 MT action items are covered: Clerk (16), PRs (15), staging (17), destinations metric (13), sticky tracker (10), yellow button (9), celebratory approval (12), colour-coded statuses (8), horizontal toast (11), sidebar logo (7), team email (6), All statuses (4), support copy (3), Create agency (2), agencies sort (5), verification copy (1), tracker size (10). The two P items are Peace's own. Three transcript-only items are captured: agency stats (14), passport AI (Task 17 note), and the design freeze (Global Constraints).

**Known blocks.** Task 10's sticky work, Task 12's treatment, and the passport-photo work each need an answer from Peace before implementation. Tasks 14, 15 and 16 need investigation or another person. Everything in Phase A and Tasks 5–9, 11 and 13 can start immediately.

**Type consistency.** `statusSheetTone` (Task 8) returns `BadgeVariant` from `src/lib/domain/status.ts:9`. `requestedDestinationsOf` (Task 13) returns `TopCount[]` from `src/lib/domain/kpis.ts`. `AGENCY.tableHead.email` (Task 6) follows the existing `colleague`/`joined`/`rank` shape. No task references a symbol another task does not define.
