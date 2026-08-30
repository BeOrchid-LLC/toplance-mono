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
