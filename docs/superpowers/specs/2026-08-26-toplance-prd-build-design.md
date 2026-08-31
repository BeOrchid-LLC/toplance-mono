# Toplance — Build Plan vs Felix's Six-Phase PRD

## Context

Felix's PRD describes a B2B visa/relocation platform: businesses invite travellers, an AI
assistant runs intake and guides documents, admins review and approve, and the product
generates itineraries and a post-arrival companion. The repo (branch
`feat/clerk-auth-phase-1`) already contains a substantial foundation — Clerk OTP auth,
a versioned corridor/requirements engine, document upload to private R2/MinIO with human
review, an ops queue, and an employer roster view — but the four loudest PRD promises are
absent: **no LLM anywhere** (the "AI agent" is a scripted 10-question flow), **staff cannot
change application status** (approved/rejected are unreachable), **no email or notifications
of any kind**, and **the employer invite flow is a disabled button** (invitations table has
zero code references).

Decisions confirmed with the user (2026-08-26):
- **Scope: all six phases, thin** — every phase demoable in the two-week window.
- **Visa data: keep the current 4 curated corridors** (ng→gb/ae/ca/de); no 50-country expansion now.
- **Document verification: human final verdict + AI pre-check** on upload (type/legibility/category).
- **Voice: full realtime** (OpenAI Realtime API two-way speech) in the intake agent.
- **AI provider: OpenAI**, testable with an `OPENAI_API_KEY`.
- **Design: implementation-only** — all new UI reuses the existing design system
  (`Panel`, `StatusBadge`, app bar, token classes); no visual redesign workstream.

## Gap analysis (verified against the repo)

| PRD phase | Current state |
|---|---|
| 1 AI intake | Scripted 10-question chat (`src/lib/domain/intake.ts`, `src/components/app/intake-agent.tsx`); persistence solid (`answerQuestion` → `intake_answers` → checklist). Zero LLM, mic button is a toast stub. |
| 2 Traveller profile | Largely EXISTS (`src/app/(app)/app/profile/page.tsx`): details, editable fields, score, case notes, itinerary render path. |
| 3 Requirements engine | EXISTS and well built (`src/lib/visa/*`, `adoptRuleSet`); 4 corridors seeded; verification 100% human via `reviewDocumentTx`. No AI pre-check. No embassy contact fields. |
| 4 Admin dashboard | Queue + case page + doc verdicts + case notes EXIST. Missing: status transitions (only `submitted` reachable), messaging (table exists, zero refs), assignment, alerts, audit writes. |
| 5 Itinerary | `itineraries` table + read/render path exist; no generator, nothing writes it. |
| 6 Companion | Nothing but marketing copy. |
| Notifications | Nothing. No email lib, no table, no 100% alert. |
| Employer | Read-only roster via `org_application_progress` view; no org signup, no invitations, nothing sets `applications.orgId`. |
| Testing | Good Vitest unit + real-Postgres integration suites; no e2e, no component tests, no CI. |

Constraints that shape everything (from AGENTS.md):
- Breaking-changes Next.js — consult `node_modules/next/dist/docs/` before route-handler work; middleware is `src/proxy.ts`.
- Model-authored chat renders only through `src/components/app/chat-markdown.tsx`; traveller text stays plain.
- Analytics events are a compile-checked union (`src/lib/analytics/events.ts`), `toplance.object_action` format, written via `track()` (never throws).
- Tables: snake_case plural; do NOT rename existing deviations (`audit_log`, `organisations`) or move schemas — platform-team work.
- Roles live in Postgres (`profiles.role`), never Clerk metadata.

## Step 0 — persist this design in the repo

On approval, save this document to
`docs/superpowers/specs/2026-08-26-toplance-prd-build-design.md` and commit it, so the
design lives with the code (plan mode only permits writing to the harness plan file until
then).

## Design (per slice)

### A. AI slices — intake agent, voice, doc pre-check, itinerary (~8d)

**Foundation (~0.5d)**: deps `ai@^7`, `@ai-sdk/openai@^4`, `@ai-sdk/react@^4`, `zod@^4`,
`@openai/agents-realtime@^0.17` (Realtime WebRTC client; AI SDK doesn't cover Realtime).
New `src/lib/ai/models.ts` centralising model IDs (`gpt-5.4-mini` for intake/pre-check,
`gpt-5.4` for itinerary, `gpt-realtime-mini` for voice) + `aiEnabled()` keyed on the single
new env var `OPENAI_API_KEY`. Everything degrades gracefully when the key is absent.
Note: `generateObject` is deprecated in ai v7 — use `generateText` + `Output.object`; tools
take `inputSchema`. Next 16 `after()` (verified in node_modules docs) is the post-response hook.

1. **LLM intake agent, text (~3d)** — LLM owns phrasing/locale/free-text understanding;
   the question list (`INTAKE_QUESTIONS`), persistence, and corridor resolution stay
   deterministic and untouched.
   - Refactor: extract `answerQuestion`'s body into `recordIntakeAnswer()` in new
     `src/lib/data/intake.ts` (`server-only`, caller guards — same pattern as
     `submitApplicationTx`); `buildChecklist` moves there. Scripted flow keeps working.
   - New route `src/app/api/intake/chat/route.ts`: guard via `requireApplicationAccess`,
     re-read answers+locale from DB each turn, `streamText` with one tool `record_answer`
     (z.enum of the 10 keys) whose execute calls `recordIntakeAnswer`; respond via
     `toUIMessageStreamResponse()`.
   - New `src/lib/ai/intake-prompt.ts` (pure, tested): topics in order, speak the profile
     locale, normalise answers to canonical labels from `NATIONALITY_ISO`/`DESTINATION_ISO`/
     `PURPOSE_ISO` else record verbatim; guardrail: never state visa requirements/fees/
     timelines — the checklist comes from corridor data.
   - Client: `intake-agent.tsx` dual-mode — `useChat` when `aiEnabled`, existing scripted
     branch otherwise (and as on-error fallback). Chips call `sendMessage(chipLabel)`.
     Assistant text renders through existing `ChatMarkdown` bubble (AGENTS.md rule holds).
     No message persistence — transcript rebuilds from `intake_answers` on reload (deferred:
     `intake_messages` table).
2. **Realtime voice (~2d)** — new `src/app/api/intake/realtime/route.ts` mints an ephemeral
   client secret (guarded; POSTs to OpenAI `/v1/realtime/client_secrets`; API key never
   leaves server). New `use-voice-intake.ts` hook: `RealtimeAgent`/`RealtimeSession` with the
   same intake prompt and a client-side `record_answer` tool that calls the existing
   `answerQuestion` server action (traveller's own Clerk session authenticates it). Mic
   button becomes a toggle with active state. Cuts: no live transcript bubbles (the profile
   rail updating is the feedback), no VAD tuning, no token refresh; failure → text mode.
3. **AI document pre-check (~1.5d)** — in `uploadDocument`, `after(() => precheckDocument(...))`
   post-response. New `src/lib/ai/precheck.ts`: fetch bytes via new `getDocumentBytes()` in
   the storage module; images + PDFs only; structured verdict `{pass|flag, reason, notes}`;
   "when unsure, pass". New `applyPrecheckTx` (src/lib/data/precheck.ts): flag → state
   `flagged` + traveller-readable `reason` + `precheck` jsonb, guarded by
   `WHERE state='checking' AND storage_path=<checked path>` so human verdicts/re-uploads are
   never clobbered; pass → stays `checking`; **AI never writes `verified`**; errors leave
   `checking`. Schema add: `documents.precheck jsonb`.
4. **Itinerary generator (~1d)** — new `src/lib/ai/itinerary.ts`:
   `generateAndStoreItinerary(applicationId, actorId)` — inputs are intake answers + corridor
   + locale; `Output.object` schema of strings/string[] shaped exactly for the existing
   `itinerarySections()` renderer (move that from profile/page.tsx to
   `src/lib/domain/itinerary.ts`, test schema↔renderer agreement); upsert into `itineraries`;
   failure writes nothing (empty state stays honest). Called from the approve action via
   `after()`. Guardrail: practical arrival advice only, no invented phone numbers or
   entry-requirement claims. Voice summary deferred (optional TTS route later).

New analytics events: `toplance.intake_message_sent`, `toplance.voice_session_started`,
`toplance.document_prechecked`, `toplance.itinerary_generated`.
Tests: prompt (pure), `recordIntakeAnswer` (DB), precheck tx races (DB), itinerary
schema↔renderer (pure). No test calls OpenAI.

### B. Admin workflow + notifications (~9d)

1. **Staff status control (~2d)** — new `src/lib/data/transitions.ts` mirroring
   `submissions.ts`: exported `STAFF_TRANSITIONS` map (`submitted → under_review |
   additional_documents`; `under_review → approved | rejected | additional_documents`;
   `approved`/`rejected` terminal; `additional_documents → submitted` stays the traveller's
   resubmit). `changeStatusTx()` row-locked: validates transition, **approval requires all
   required docs verified** (reuses submission's doc query in-tx), requires a non-empty
   message to the traveller, writes `decidedAt` on terminal states + a `status_events` row.
   New `changeCaseStatus` action in `src/app/ops/actions.ts` (isStaff-gated like
   `reviewDocument`): track + audit + notify traveller; on approve,
   `after(() => generateAndStoreItinerary(...) then notify "itinerary_ready")` — generation
   failure never fails the committed approval. New `src/components/ops/status-control.tsx`
   ("Decision" panel on the case page: legal next steps + required message + confirm on
   terminal). Concurrency tests copied from `submissions.test.ts` structure.
2. **Assignment (~0.5d)** — `claimCase` (atomic `UPDATE … WHERE assignee_id IS NULL
   RETURNING`), `releaseCase` (reviewers their own, owners anyone); owner column in queue
   via `alias(profiles)` join; claim/release buttons on the case page.
3. **Messaging (~2d)** — wires the existing `messages` table, no schema change. New
   `canReadMessages`/`canWriteMessages` predicates (owner or staff; sponsors excluded —
   same boundary as case notes) + tests. New `src/lib/data/messages.ts` (send ≤2000 chars,
   list, `markThreadRead` = counterpart's rows, unread count). Shared `sendMessage` action.
   New `message-thread.tsx` + `message-composer.tsx` — **plain text with
   `whitespace-pre-wrap`, not chat-markdown** (traveller-authored content). New traveller
   page `/app/messages` (+ nav item, un-disable the dashboard button); "Messages" panel on
   the ops case page. Mark-read via `after()` in the Server Components.
4. **Notifications (~3d, build first — slices 1–3 emit through it)** —
   - Schema: `notification_kind` enum (`application_submitted`, `status_changed`,
     `document_flagged`, `message_received`, `itinerary_ready`, `companion_digest`) + plural
     `notifications` table (recipientId→profiles, kind, applicationId, payload jsonb,
     readAt, createdAt; recipient index). Invitations are NOT a kind (invitee has no
     profile row) — they use `sendEmail()` directly.
   - **Email: Resend via plain `fetch`** — zero new deps, no react-email. New
     `src/lib/notifications/`: `email.ts` (`sendEmail()`, no-op with a log when
     `RESEND_API_KEY` absent, **never throws** — track()'s philosophy), `templates.ts`
     (pure subject/html/text builders incl. `invitationEmail()`, with `escapeHtml()` on all
     user-authored values), `notify.ts` (`notify()` = insert row + email; `notifyStaff()` =
     all staff rows, thin; reads + `markNotificationsRead`). Called only after transactions
     commit.
   - Emitters: submission → `notifyStaff` (makes the submitApplicationTx docstring true —
     the PRD's "immediate alert at 100%"); status change / doc flagged / itinerary ready →
     traveller; message → counterpart (assignee if set, else all staff); invitation →
     `sendEmail` from the employer slice; weekly companion digest → cron route.
   - UI: `notifications-menu.tsx` bell + unread badge + dropdown (Radix dropdown already a
     dep), mark-all-read on open; `app-bar.tsx` gains a `notifications` slot; mounted in
     the traveller layout and both ops pages.
   - Env: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`.
5. **Audit honesty (~0.5d)** — write the rows instead of softening the copy: new
   `src/lib/audit.ts` `audit()` (never throws; `audit_log` singular name stays — recorded
   deviation). Call sites: staff `documentUrl` views, verdicts, status changes,
   claim/release. No reader UI yet. Also verify the "30-minute idle session" Clerk setting
   or soften that sign-in bullet.
6. **Staff 2FA (~1d)** — Clerk dashboard: enable TOTP + backup codes. Code: ops pages'
   staff gate also requires `twoFactorEnabled` (blocker panel linking to Clerk Account
   Portal to enroll); extract shared `requireStaffConsole()` helper (also dedupes the
   refusal JSX). `auth-form.tsx` gains a `needs_second_factor` TOTP step (verify exact
   Clerk v7 method names against typings when implementing). Travellers untouched.

New analytics events: `toplance.application_status_changed`, `toplance.case_claimed`,
`toplance.case_released`, `toplance.message_sent`.

### C. Employer & invitations (PRD "business signs up, invites travellers, tracks progress")

**Schema adds** (`src/lib/db/schema.ts`, one migration): `invitations.acceptedBy/acceptedAt`;
`profiles.notificationPrefs jsonb default {}`; new `companion_updates` table
(applicationId, kind, payload jsonb, generatedAt; unique (applicationId, kind)).

1. **Employer onboarding (~1–1.5d)** — new `/employer/sign-up` page reusing `AuthForm`;
   on first `/employer` visit with no membership, a "Name your organisation" panel →
   `createOrganisationTx(userId, name)` in new `src/lib/data/organisations.ts`: one
   transaction inserting `organisations` + `org_members` (owner) + flipping
   `profiles.role` `traveler→org_member` only (refuse staff, refuse second org, refuse
   existing-traveller accounts with an honest error). New `src/app/employer/actions.ts`.
   Add `/employer/sign-up` to `src/lib/auth/routes.ts`. Seats stay seeded/manual.
2. **Invitations end-to-end (~2.5–3d)** —
   - Policy: `isOrgMemberOf` / `canManageInvitations` in `policy.ts` (staff excluded),
     `requireOrgAccess` guard; tests mirroring `policy.test.ts`.
   - Data: new `src/lib/data/invitations.ts` — create (dedupe pending per org+email),
     list (present pending-past-expiry as expired), revoke (scoped by orgId), and
     `acceptInvitationTx(token, travelerId)`: row-locked; handles application-exists and
     not-yet-exists orders (`insert … onConflictDoNothing` then guarded `update … set orgId`);
     rejects cross-org poaching; marks accepted with acceptedBy/At. Full DB test matrix.
   - UI: enable the invite button on `src/app/employer/page.tsx`; invite dialog (email,
     name, job title, destination, purpose) that shows a copyable `/invite/<token>` link;
     invitations panel with status badges + revoke.
   - Accept: `/invite/[token]` public route (add to `isPublicRoute` in `src/proxy.ts`);
     signed-out → sign-up/sign-in with `next=` return; signed-in traveller accepts via
     explicit button (never on GET) → `redirect("/app/agent")`. Sends email via the
     notifications module's `notifyInvitation()` (never throws).
   - Intake prefill from invitation: **deferred** (ISO↔free-text inverse mapping breaks the
     intake's truncate-and-rebuild invariant); accept page displays destination/purpose.
3. **Roster polish (~0.5d)** — invitations panel + pending count only. Nudge stays out of scope.

### D. Post-arrival companion — Phase 6 thin (~2d)

- New `src/lib/domain/companion.ts` (pure, tested): curated `arrivalChecklist(destinationIso,
  purpose)` per the 4 live corridors + generic fallback; `renewalGuidance(corridor, decidedAt)`
  from real facts only — no invented expiry dates.
- New `src/lib/data/companion.ts`: get/upsert `companion_updates`, 7-day staleness.
- New page `src/app/(app)/app/(corridor)/companion/page.tsx`, gated on `status === "approved"`;
  sections: arrival checklist, renewal card, AI "local tips" generated on visit when
  missing/stale (via the OpenAI module; degrades to checklist-only on failure), rendered
  through `chat-markdown.tsx`. Nav item "After you land" appears only when approved.
- `canReadCompanion` policy predicate (owner or staff; sponsors excluded).
- Notification frequency pref: `notificationPrefs.companionDigest` (weekly/off) editable on
  the profile page via `updateProfile`.
- Weekly digest: `src/app/api/cron/companion/route.ts` guarded by `CRON_SECRET` bearer;
  regenerates stale tips + calls `notify()`. Scheduler wiring is deploy-time config.
- Deferred explicitly: visa-expiry tracking, SMS/push, per-city tips, notification centre.

### E. Traveller profile vs PRD Phase 2 (~0.5d)

Already complete against the PRD checklist (details, travel history, status, score, admin
notes, itinerary panel). Add only: a sponsorship line on the identity panel when
`application.orgId` is set ("Sponsored by X — they see progress, never your documents"),
and the digest toggle from slice D.

### F. Testing & CI (~2–2.5d)

- Vitest: new DB suites for invitations/organisations/companion; extended policy/routes tests;
  new analytics events (`toplance.organisation_created`, `.invitation_sent`, `.invitation_revoked`,
  `.invitation_accepted`, `.companion_viewed`, `.companion_generated`) in the events union.
- Playwright e2e (new `e2e/` dir + `playwright.config.ts`): `@playwright/test` + `@clerk/testing`
  (`clerkSetup()` testing tokens; OTP flow uses `+clerk_test` emails with fixed code 424242
  against the existing custom OTP UI). Four journeys: traveller intake→upload→submit;
  ops review→approve; employer signup→invite→accept (via copyable link); approved traveller
  sees companion. Staff promotion happens via SQL helper (deliberately no code path).
- CI: `.github/workflows/ci.yml` — lint, typecheck, Postgres service + migrate + sql-objects,
  `vitest run` with DATABASE_URL, `next build`. E2e as a separate manually-triggered workflow.

## Consolidated schema changes (one `db:generate` migration, no renames/moves)

- `documents.precheck jsonb` (nullable) — AI pre-check audit trail.
- `invitations.acceptedBy text → profiles.id`, `invitations.acceptedAt timestamptz`.
- `profiles.notificationPrefs jsonb not null default {}`.
- New enum `notification_kind` + new table `notifications` (see slice B4).
- New table `companion_updates` (applicationId, kind, payload jsonb, generatedAt;
  unique (applicationId, kind)).

## Cross-slice contracts (reconciled)

- `generateAndStoreItinerary(applicationId, actorId)` (A4) is what B1's approve action calls
  inside `after()`; it must never throw into the action.
- `sendEmail()` (B4) is what C2's invitation flow uses (template `invitationEmail()` lives in
  `templates.ts`); `notify()` requires a profiles row and is used everywhere else.
- The companion cron (C/D) uses `notify(recipientId, "companion_digest", …)`.
- Build order inside a slice-day: B4's notifications module lands before B1–B3 and C2 emit
  through it; the AI foundation (A0) lands before A1–A4 and D's tips generation.
- `recordIntakeAnswer` (A1 refactor) is the single persistence path for text chat, voice
  tool calls, and the scripted fallback alike.

## New environment variables

`OPENAI_API_KEY` (AI; absent → scripted intake, no pre-check, no itinerary/tips),
`RESEND_API_KEY` + `EMAIL_FROM` (email; absent → log-and-skip), `APP_URL` (email links),
`CRON_SECRET` (companion digest route). All documented in `.env.local.example`.

## Two-week sequencing — and an honest feasibility note

The slices sum to **~26 dev-days** (A ≈ 8, B ≈ 9, C+D+E+F ≈ 9–10). Inside a 10-working-day
window that means either **2–3 developers working the parallel tracks below, or a cut line**.
This must be raised with Felix's team per the PRD's "confirm feasibility and phasing with us".

Parallel tracks (independent until integration day):
- **Track 1 (AI)**: A0 foundation → A1 text agent → A3 pre-check → A4 itinerary → A2 voice.
- **Track 2 (workflow)**: B4 notifications module → B1 status control → B2 assignment →
  B3 messaging → B5 audit → B6 2FA.
- **Track 3 (employer/companion)**: schema migration (all changes at once) → C1 org
  onboarding → C2 invitations → D companion → E profile touches → F e2e + CI throughout.

Suggested week shape: week 1 = A0–A1, B4–B1, schema + C1–C2 (the demo skeleton: AI intake →
submit → staff approve → itinerary → employer invite loop closes). Week 2 = voice, pre-check,
messaging, companion, 2FA, audit, e2e + CI, polish.

If a cut line is needed (in drop order, last first): B6 2FA enrollment UI (dashboard-only
TOTP still possible) → D weekly cron (page stays on-visit generation) → A2 realtime voice →
B3 messaging. Everything above that line is the PRD's core loop.

## Verification

- **Unit/integration**: `npm run lint && npx tsc --noEmit && npx vitest run` with
  `DATABASE_URL` set (MinIO + Postgres via the repo's local setup) — all new `*Tx`
  functions carry real-concurrency tests mirroring `submissions.test.ts`.
- **E2e (Playwright + @clerk/testing)**: the four journeys in slice F, run locally against
  `npm run dev` with `+clerk_test` emails / fixed OTP 424242.
- **Manual demo script** (the PRD's "tested end to end with real users"): employer signs up
  → creates org → invites traveller (email arrives) → traveller accepts, talks to the AI
  agent (text, then voice), uploads a blurry file (AI pre-check flags it), re-uploads,
  submits at 100% (staff email + bell fire) → staff claims, reviews, approves (message
  required) → traveller gets itinerary email + profile arrival plan → companion page live.
- **Definition of done per phase**: each phase's acceptance line from the PRD checked
  against staging (never production), with `OPENAI_API_KEY`/`RESEND_API_KEY` set there.

## Amendment — travellers are invite-only (2026-08-31)

Appended rather than folded into the sections above, so the record of what changed and
when survives. Everything before this heading describes the build as scoped on
2026-08-26; where the two disagree, this section wins.

**The client's decision, verbatim from the thread:** *"Travellers should only be invited
through B2B accounts."* Self-serve traveller sign-up is withdrawn. There is no
traveller-facing purchase and no traveller-facing account creation.

### What changed

- **`/sign-up` is token-gated.** It resolves `?token=` against `getInvitationPreview` and
  renders the form only for a live, pending invitation; every other case is a dead end
  naming its reason. `next` is derived from the token rather than read from the query
  string, so the door cannot be pointed anywhere else.
- **`completeProfile` carries the invariant.** It takes a `SignUpIntent` — `{ intent:
  "invited", token }` or `{ intent: "employer" }` — verifies the token names a pending
  invitation addressed to the email Clerk just verified, and writes `traveler` only then.
  The page gate is a courtesy; this is the enforcement.
- **The invitation check is asked twice, and the early one is the useful one.**
  `completeProfile` remains the enforcement, but it answers only after Clerk has created
  the account and the emailed code has been spent — at which point `auth-form` pushes the
  visitor off the form to the destination the token names. A traveller who mistyped the one
  address their invitation will accept therefore had no way to correct it and, under
  invite-only, no other door to try. `checkInvitedEmail` asks the same question before
  `signUp.create()`, so a typo costs a correction rather than an account. Both callers
  share `checkInvitedAddress` and one pair of error strings, since the early answer is a
  promise about what the later one will decide.
  - It takes no session, deliberately: it runs before one exists.
  - It confirms or denies an address the caller supplied and never returns the invited one
    — the same oracle `completeProfile` has always been, minus the burnt code, and it keeps
    the rule that the invited address is never rendered to whoever holds the link.
  - The two text fields on that form became controlled in the same change. `<form
    action={fn}>` resets an uncontrolled form once the action returns, which was harmless
    while every refusal was terminal; it is not harmless when the refusal exists so the
    field can be fixed.

- **Employer sign-up writes `org_member` immediately**, before any organisation exists.
  It previously wrote `traveler` and relied on `createOrganisationTx` to flip it, which
  left every employer who never named an organisation as an org-less traveller with the
  whole traveller product open to them.
- **`getProfile` no longer provisions.** It was creating a row — defaulting to the
  schema's `role: "traveler"` — for any Clerk session it had not seen. That made every
  check above decorative: a Clerk account plus one request to `/app` minted a traveller.
  `completeProfile` is now the only path from a session to a `profiles` row.
- **The public site sells seats, not applications.** The Self-serve and Guided tiers are
  gone (their features merged into the seat plan, since "Everything in Guided" no longer
  resolved to anything) and every CTA points at `/employer/sign-up`.

### Deliberately not done

Copy still written to a traveller who pays, left for the client rather than rewritten:

- The pricing FAQ — *"What does it cost to find out what I need?" → "Nothing… You pay when
  you ask us to handle an application."* Under sponsorship the traveller never pays at all.
- The `paid: true/false` markers on the "how it works" steps, which draw a free/paid line
  that no longer falls anywhere a traveller can see.
- The `LEDGER` rows, which argue against paying an agent — an argument aimed at a
  self-serve buyer.
- The site's second person throughout is still the traveller, not the HR buyer who is now
  the only person who can act on it.

### Consequence for the e2e suite

`/sign-up` is no longer a way to make an arbitrary account, so specs needing one that is
about to become staff use `/employer/sign-up` (now `signUp`'s default door), and specs
needing a traveller use `signUpInvited` with a token from `seedInvitation`. Traveller
entry is two acts now — the sign-up and the accept — and `signUpInvited` carries both.

### Invitation delivery, and what each environment needs

Invite-only changed the severity of every email failure. While travellers could
self-serve, an invitation email that did not arrive was an inconvenience; it is now the
only way a traveller learns the URL, so a failed send is a person who cannot get in at
all. Three variables decide whether that happens, and all three fail quietly.

| Variable | Unset | Consequence |
|---|---|---|
| `RESEND_API_KEY` | `sendEmail` logs `[email] … skipped` and returns | employer sees a successful invite; nothing is sent |
| `EMAIL_FROM` | Resend answers `422`, logged only to the console | same, one layer further along |
| `APP_URL` | `appUrl()` falls back to `http://localhost:3000` | the email arrives carrying a link nobody can open |

`sendEmail` never throwing is deliberate and stays that way — no email is worth failing a
user's action for. The consequence is that these are operational checks, not things the
application will report.

**`EMAIL_FROM` needs a verified Toplance sending domain.** The Resend account's only
verified domain is `thrivo.fit`, which belongs to the other product; sending a Toplance
invitation from it is mis-branded, and borrowing another product's domain also means
Toplance's bounce and complaint rates land on `thrivo.fit`'s reputation. Convention is a
dedicated subdomain — `mail.toplance.com` or `send.toplance.com` — rather than the root,
so transactional sending cannot damage the reputation of the domain that carries the
company's ordinary mail.

**The e2e suite is deliberately excluded.** `playwright.config.ts` sets
`RESEND_API_KEY: ""` in `webServer.env`, so no test can send. This is load-bearing rather
than tidy: every run invites `…@example.com` addresses, and a reserved domain hard-bounces
every one of them. Do not remove it to "test the email path".

**Recovery.** `resendInvitation` sends the same token to the same address again. It is the
only route back to a link once the invite dialog has closed, because `listInvitations`
never selects the token. It does not rotate the token (a slow first email should still
work) and does not extend `expiresAt` (a resend should not quietly lengthen the life of a
bearer credential). An expired invitation is refused — that one needs inviting again.
