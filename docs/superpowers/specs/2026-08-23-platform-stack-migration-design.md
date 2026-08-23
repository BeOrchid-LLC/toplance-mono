# Toplance platform stack migration — design

Date: 2026-08-23
Status: approved for planning
Author: Ali (with Claude)

## Goal

Toplance runs end to end on the BeOrchid target stack: Clerk for identity,
Drizzle ORM over self-hosted PostgreSQL on Contabo via Coolify for data, an
S3-compatible store for documents, and authorization enforced in the
application layer. Supabase is removed entirely. Staging and production are
deployed, and visa requirements are served behind a provider-agnostic
interface that can launch on a free tier.

## Context

The app is a Next.js 16 App Router project with four surfaces — marketing
site, traveller app, employer console, ops queue — all built and working
against Supabase. Next.js remains both frontend and TypeScript backend
through server actions and route handlers; no separate backend service is
planned.

Three constraints shape every decision below.

**Pre-launch, no production data.** AGENTS.md records this explicitly. We
rebuild the schema on the new database and re-seed reference data rather than
migrating rows. This removes the highest-risk category of migration work.

**Platform conventions are binding.** Shared identity belongs in `core.*`,
each app owns `<app>.*`, tables are lowercase snake_case plural, analytics
events are `app.object_action`, and only `staging` and `production` exist as
environments. Changes require written agreement.

**Clerk is a platform-wide decision.** Every BeOrchid app standardises on
Clerk, later integrating with BeOrchid Core. The Clerk user ID is therefore a
platform identity key, not a Toplance-local detail.

## The load-bearing risk: authorization moves, and it must move deliberately

Today the database is the security boundary. Roughly twenty RLS policies keyed
on `auth.uid()` decide who reads and writes what, and the server actions lean
on them completely. `answerQuestion`, `uploadDocument`, `removeDocument` and
`submitApplication` all accept an `applicationId` from the client and never
verify that the caller owns it. That is safe today only because the
user-scoped Supabase client cannot see rows RLS forbids.

The moment queries run over a direct Postgres connection, that protection is
gone. Every one of those actions becomes an insecure direct object reference
unless ownership is checked explicitly. The same applies to the `documents`
privacy boundary — the promise that an employer sees progress but never a
passport — which currently exists only as an absent RLS policy.

Protection ends the moment Clerk lands, not when Postgres does. Once sessions
come from Clerk, queries must use a service-role Supabase client, and the
service role bypasses RLS entirely. There is no phase in which explicit checks
and RLS are both protecting the app — **Phase 1 is the security-critical
phase**, and Phase 2 merely changes which client runs the same checks.

Three consequences for the plan:

1. Explicit authorization ships in Phase 1, in the same change that introduces
   Clerk. It cannot be deferred to Phase 2.
2. Authorization lives in one place — `src/lib/data/` — and every server action
   goes through it. No action queries the database directly.
3. Phase 1 is not complete until every policy in the current `init.sql` has a
   corresponding check in code, verified against that list line by line, with
   tests for the traveller-ownership and employer-privacy boundaries.

## Target architecture

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, server actions and route handlers |
| Identity | Clerk (`@clerk/nextjs` v7, Core 3) |
| Session/routing | `clerkMiddleware` in `src/proxy.ts` |
| Database | PostgreSQL on Contabo, provisioned via Coolify |
| DB access | Drizzle ORM with `pg`, schema in TypeScript |
| Migrations | Drizzle Kit files committed to the repo |
| Authorization | Application layer in `src/lib/data/`, keyed on Clerk user ID |
| Storage | S3-compatible (MinIO on Coolify recommended), signed URLs |
| Visa data | `VisaDataProvider` interface: curated and API implementations |
| Environments | `staging`, `production` |

### Identity model

`profiles.id` is currently a `uuid` foreign key to `auth.users`. Clerk user IDs
are strings such as `user_2abc...`, so the users table's primary key becomes
`text`, and every reference to it changes type: `applications.traveler_id`,
`applications.assignee_id`, `org_members.user_id`, `documents.verified_by`,
`messages.sender_id`, `status_events.actor_id`, `invitations.invited_by`,
`audit_log.actor_id`.

The `handle_new_user` trigger on `auth.users` disappears. Users are provisioned
just in time: the first authenticated request upserts the Clerk user into the
users table. This cannot miss a user the way a webhook can. A Clerk webhook for
profile updates and deletions can follow later; it is not needed to launch.

Application-owned roles (`app_role`, `staff_role`, `org_role`) stay in the
database rather than moving into Clerk metadata. They are Toplance
authorization data, and keeping them in Postgres means role checks are a join
rather than a token claim that can go stale.

### Schema conventions

Rebuilding from scratch is the cheapest moment to resolve the deviations
recorded in AGENTS.md: `audit_log` becomes `audit_logs`, `organisations`
becomes `organizations`, `org_members` becomes `memberships`, and tables move
into a `toplance` schema with shared identity in `core`. Because these are
platform conventions, this requires written agreement from the platform team
before Phase 2 begins. If agreement does not arrive in time, Phase 2 proceeds
with current names and the rename is deferred to BeOrchid Core work — the
sequencing does not change, only the table names in the Drizzle schema.

### What survives untouched

Every component under `src/components/`, all layouts, styling, the design
system, the locale provider, `src/lib/domain/`, and the `completionOf`
calculation are backend-agnostic and are not modified. The rewrite is confined
to `src/lib/data/`, the two `actions.ts` files, page-level queries, the auth
routes, and `src/proxy.ts`.

The `application_completion` SQL function and `org_application_progress` view
are kept as raw SQL in the initial Drizzle migration. The view loses
`security_invoker` — meaningless without RLS — and the data layer filters by
`org_id` explicitly instead.

## Phases

Each phase ends in a working application. No phase leaves the app broken for
the next one.

### Phase 0 — Unblock and baseline

External dependencies and decisions, mostly not code.

- Restore Ali's Coolify access: the account for `toshpulatov.remote@gmail.com`
  is half-created, registration reports it already exists, and password reset
  is unconfigured. The platform lead must delete and re-invite it.
- Confirm Clerk dashboard access and create the Toplance application.
- Obtain written sign-off on: storage choice, deployment target, and the schema
  naming conventions above.
- Provision staging PostgreSQL on Coolify.
- Housekeeping: commit the pending `ChatMarkdown` work, sync with `origin/main`.

Security note to raise with the platform lead: open registration was enabled on
the public Coolify dashboard and invitation links were shared in chat. Coolify
controls deploys for the whole server. The registered-user list is worth
auditing and registration disabling once access is restored.

**Exit:** Coolify and Clerk are accessible, staging Postgres exists, decisions
are in writing.

### Phase 1 — Clerk replaces Supabase auth

- Add `@clerk/nextjs`; `ClerkProvider` in the root layout.
- Replace Supabase session refresh in `src/proxy.ts` with `clerkMiddleware`,
  preserving the existing public-prefix behaviour and `?next=` redirects.
- Rebuild the three sign-in surfaces on Clerk components, keeping the distinct
  traveller, employer and ops entry points.
- Detach `profiles` from Supabase auth so Clerk can own identity while the data
  still lives there: one throwaway Supabase migration drops the
  `profiles.id → auth.users(id)` foreign key and the `handle_new_user` trigger,
  and adds `clerk_user_id text unique`. Profiles are then looked up by Clerk ID
  and provisioned just in time on first authenticated request. This migration is
  discarded in Phase 2, when `clerk_user_id` becomes the primary key.
- **Introduce explicit authorization in `src/lib/data/`** and route every
  server action through it. Data still lives in Supabase this phase, reached
  with a service-role client — which bypasses RLS, making these checks the only
  thing protecting traveller documents from this point forward.
- Delete `(auth)/actions.ts` and the Supabase callback route.

**Exit:** all four surfaces authenticate through Clerk; every server action
performs an explicit ownership or role check; Supabase is a database only.

### Phase 2 — Drizzle and PostgreSQL on Coolify

- Define the schema in TypeScript, generate the initial migration, and port the
  completion function and progress view as raw SQL.
- Write a seed script for corridors and corridor requirements.
- Rewrite `src/lib/data/` and `(app)/actions.ts` from supabase-js to Drizzle,
  keeping the Phase 1 authorization checks intact.
- Replace `supabase start` with a Docker Compose Postgres for local
  development; retire the `db:*` scripts in favour of Drizzle Kit.
- Point staging at Coolify Postgres.

**Exit:** every page and action reads and writes Coolify Postgres; typecheck,
build, and a manual pass over all four surfaces succeed.

### Phase 3 — Document storage

- Provision the object store and port the `documents` bucket.
- Uploads and downloads go through signed URLs issued by server actions, which
  is where the per-application ownership check now lives. Object paths keep the
  `{application_id}/{doc_key}/{filename}` layout.

**Exit:** upload, view and delete work against the new store; employers still
cannot reach document contents by any route.

### Phase 4 — Supabase removal and deployment

- Remove `@supabase/*` dependencies, `db:*` scripts, `database.types.ts`, the
  env plumbing, and `SetupNotice`'s Supabase assumptions.
- Configure Coolify deploys for staging, then production, with per-environment
  Clerk keys, `DATABASE_URL`, and storage credentials.

**Exit:** the Supabase project can be switched off; staging and production are
live.

### Phase 5 — Visa data integration

Independent of the stack work; may begin any time after Phase 2.

- Define `VisaDataProvider` with two first-class implementations: curated
  embassy-sourced data for work and study corridors, and an API provider
  (Sherpa's free tier at 1,000 requests per month, or Travel Buddy).
- Cache provider responses in Postgres, both to respect free-tier limits and to
  keep the requirements screen fast. Confirm each vendor's terms permit caching
  and display before relying on it.
- Emit the first analytics events using `toplance.object_action` from the first
  event.

**Exit:** requirements pages serve real provider and curated data; launch-ready.

## Ordering rationale

Auth precedes data because the reverse — bridging Clerk tokens into Supabase
RLS — is throwaway work on a database we are leaving. Authorization moves in
the same phase as auth because it has to: the service-role client that Clerk
forces bypasses RLS, so there is no safe window in which to defer it. Storage
follows data because it touches the fewest files. Visa data is decoupled
because it does not depend on where the database lives.

## Risks

**Silent authorization gaps.** The largest risk in the migration, and it lands
in Phase 1 rather than Phase 2. Mitigated by centralising checks in the data
layer, auditing every server action against the policy list in the current
`init.sql`, and covering the traveller-ownership and employer-privacy
boundaries with tests. A gap here is not a broken screen; it is one traveller
reading another's passport.

**The employer privacy boundary.** Currently guaranteed by an absent RLS policy
and a view that exposes no document columns. After the move it is guaranteed by
code, which means it needs an explicit test rather than a structural guarantee.

**Coolify operational unfamiliarity.** Neither backups nor connection pooling
come free the way they did with Supabase. Both need answers from the platform
team before production, and Thrivo's existing setup is the precedent to follow.

**Provider terms.** Free-tier visa APIs commonly restrict caching and
redistribution — the very things the caching strategy depends on.

## Open decisions requiring platform sign-off

1. Document storage: MinIO on Coolify (recommended, no new vendor) versus
   external S3 or R2.
2. Deployment target for the Next.js app: Coolify, matching Thrivo, versus
   Vercel.
3. Schema naming: adopt `core`/`toplance` schemas and corrected table names
   during the rebuild, or defer to BeOrchid Core work.
4. Backups and connection pooling for the Coolify Postgres.
