<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Content below is maintained by hand. `next dev` only regenerates the block above. -->

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

Nothing in this repo emits analytics yet. The first instrumentation added here
sets the precedent, so it must follow this shape from the first event.

## Repositories

`<app>-<surface>`, matching the existing `thrivo-backend`, `thrivo-mobile`,
`thrivo-admin`, `thrivo-public`. For this product: `toplance-web`,
`toplance-backend`, and so on.

## Environments

`staging` and `production`. Nothing else — no `dev`, `qa`, `uat` or `preview`
as a named environment tier.

# Known deviations in this repo

Recorded so they are neither perpetuated nor silently "fixed" without a plan.
Pre-launch, so no production data is at risk.

| Convention | Current state | Notes |
|---|---|---|
| `toplance.*` schema | every table is in `public` | needs a schema move |
| `core.users` | local `profiles` table, FK to `auth.users` | duplicates shared identity |
| `core.organizations` | `organisations` (British spelling) | convention is the `z` spelling |
| `core.memberships` | `org_members` | |
| plural table names | `audit_log` is singular | should be `audit_logs` |
| `<app>-<surface>` repo | remote is `toplance-mono` | does not match the pattern |

Do not migrate these unilaterally — the schema move is part of BeOrchid Core
work and gets planned with the platform team.
