<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Content below is maintained by hand. `next dev` only regenerates the block above. -->

# What is being built

The client's original brief is `docs/client-brief.md` — six phases, verbatim as
received. The build plan that scopes it against this repo, with the decisions
taken on 2026-08-26, is
`docs/superpowers/specs/2026-08-26-toplance-prd-build-design.md`. Read the brief
for intent; treat the build plan as what is actually being built.

# BeOrchid platform conventions

Locked 2026-08-21 and shared across every BeOrchid product. Changing any of
these later requires written agreement, because other parts of the platform
depend on them. Do not invent per-app variants.

## Database

- Shared identity lives in the `core` schema: `core.users`, `core.organizations`,
  `core.memberships`.
- Each app owns its own schema: `<app>.*` — `thrivo.*`, `toplance.*`.
- App tables reference `core.user_id` and `core.org_id`. An app must not keep
  its own copy of user records.
- Table names are lowercase, snake_case and **plural** — `toplance.food_logs`,
  not `FoodLog` or `food_log`.

## Analytics events

`app.object_action`, all lowercase — `toplance.document_uploaded`,
`thrivo.meal_logged`. No other format, for any app.

The event list is `src/lib/analytics/events.ts` — a union type, so a name that
does not exist is a compile error, and `events.test.ts` asserts the format. Add
new events there rather than passing a string at a call site.

Events are written to the `analytics_events` table by `track()`, which never
throws: no analytics write is worth failing a user's action for. No analytics
vendor has been chosen; adopting one is a second implementation behind `track()`,
not a change at every call site.

## Repositories

`<app>-<surface>`, matching the existing `thrivo-backend`, `thrivo-mobile`,
`thrivo-admin`, `thrivo-public`. For this product: `toplance-web`,
`toplance-backend`, and so on.

## Environments

`staging` and `production`. Nothing else — no `dev`, `qa`, `uat` or `preview`
as a named environment tier.

## AI chat rendering

- Render every model-authored chat message through the shared
  `src/components/app/chat-markdown.tsx` component.
- Keep traveller-authored messages as plain text.
- Do not enable raw HTML, `rehype-raw`, remote Markdown images or
  `dangerouslySetInnerHTML` for model output.
- Extend the shared renderer when a new Markdown element is needed; do not create
  page-specific Markdown implementations.

# Destructive controls confirm before they commit

Decided 2026-09-08, at the client's request, after the argument recorded in
`src/components/ops/tenant-controls.tsx`. It applies to anyone working in this
repo, people and agents alike.

**When you build a control that takes something away, it asks first.** Route it
through `src/components/shared/confirm-dialog.tsx` rather than assembling a
dialog at the call site — a rule with ten implementations is ten rules.

A control is destructive when committing it removes access, deletes data, or
stops work someone else is in the middle of. Publishing, approving, sending back
for changes and saving a form are not: they add or change something without
taking anything away.

Every destructive control in the product today, and what each one asks:

| Control | Where | Why it qualifies |
|---|---|---|
| Suspend agency | `ops/tenant-controls.tsx` | every member stops being able to open a case, at once |
| Demote an owner | `ops/tenant-controls.tsx` | takes the owner's controls off a person; only this direction asks |
| Remove a document | `app/document-row.tsx` | deletes the stored file; the button says "Replace" but nothing replaces it |
| Remove a trip | `app/travel-history.tsx` | gone from travel history for good, from a bare icon in a list of alike rows |
| Revoke an invitation | `shared/invitation-actions.tsx` | the link dies on the spot and there is no un-revoke |
| End the agency plan | `agency/cancel-plan.tsx` | the console closes on every colleague at once, mid-case, and the days already paid for are not refunded |
| Remove a KYB document | `ops/kyb-checklist.tsx` | deletes the filed licence or passport scan; this product keeps no other copy |
| Replace a KYB document | `ops/kyb-checklist.tsx` | the upload overwrites the object, so the file it replaces is gone before anyone reads the new one |

`CorridorDecision` is the worked example of the other kind and deliberately does
not confirm: approving a corridor publishes something, it takes nothing away.
`restoreTenant`, promoting a member and resending an invitation are likewise
additive. So is `purchaseSubscription`, which is the undo for ending the plan
and commits on the click — the way back in is never gated. So is
`activateTenant`: opening an agency's console and emailing its director gives
something, and what stands in its way is the checklist itself rather than a
dialog. There is deliberately no deactivate control beside it — `suspendTenant`
is already that act, and it already asks.

Resending confirms anyway, and its dialog is not destructive — `ConfirmDialog`
takes `confirmVariant="primary"` for it. The reason is on
`INVITATION_ROSTER.resendConfirmTitle`, and it is about where the button sits
rather than about what it does: it is a text button a hand's breadth from the
revoke at the end of the same table row, and the letter it sends leaves this
product for somebody's inbox. Asking is allowed above the rule; it is skipping
that has to be argued for.

Two things the rule is not:

- **Not a substitute for saying what happens.** "Are you sure?" is not a
  confirmation, it is a speed bump. The dialog's body says, in the present
  tense, what lands the moment the button commits — and says something the
  operator has not already read on the page behind it.
- **Not applied to the undo.** The reverse of a destructive action gives
  something back, so it commits on the click. Gating the way out of a mistake
  makes recovery harder than the mistake was.

If you think an action is genuinely the exception, say so in the review rather
than skipping the dialog quietly, and leave the reasoning in a comment where the
next person will find it.

# Known deviations in this repo

Recorded so they are neither perpetuated nor silently "fixed" without a plan.
Pre-launch, so no production data is at risk.

| Convention | Current state | Notes |
|---|---|---|
| `toplance.*` schema | every table is in `public` | needs a schema move |
| `core.users` | local `profiles` table, keyed on the Clerk user id | identity is Clerk's; `profiles` holds the visa-specific fields. No FK to a shared table yet |
| `core.organizations` | `organisations` (British spelling) | convention is the `z` spelling |
| `core.memberships` | `org_members` | |
| plural table names | `audit_log` is singular | should be `audit_logs` |
| `<app>-<surface>` repo | remote is `toplance-mono` | does not match the pattern |

Every table and column name lives in one file, `src/lib/db/schema.ts`. With no
production data, adopting the conventions above is an edit plus a regenerated
migration — which is why deferring them costs little, and why they should not be
changed unilaterally in the meantime.

Do not migrate these unilaterally — the schema move is part of BeOrchid Core
work and gets planned with the platform team.
