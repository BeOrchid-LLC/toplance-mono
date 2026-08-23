# Toplance platform stack migration — design

Date: 2026-08-23
Status: approved for planning
Author: Ali (with Claude)

**Revised 2026-08-23**, before implementation got past the authorization
policy. The first draft kept Supabase as a transitional data host so that
authentication and the database would not change in the same step. That bought
nothing here: there is no production data to protect and no working local
Supabase instance to preserve, so the transitional service-role client and the
`clerk_user_id` migration existed only to be deleted once Drizzle landed. The
database, identity and file storage now move together, and the schema is
written once in its final shape.

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

Row-level security does not survive the move. Self-hosted Postgres reached over
a connection string has no `auth.uid()` to key policies on, so the database
stops deciding anything the moment the app leaves Supabase. Everything it was
enforcing has to already exist in code by then.

Three consequences for the plan:

1. Explicit authorization ships in the same phase as the database, not after
   it. There is no window in which both are protecting the app.
2. Authorization lives in one place and every server action goes through it. No
   action queries the database directly.
3. The phase is not complete until every policy in the current `init.sql` has a
   corresponding check in code, verified against that list line by line, with
   tests for the traveller-ownership and employer-privacy boundaries.

This work is done and committed ahead of the rest: `src/lib/auth/policy.ts`
holds all of it as pure functions with 23 tests, written without a database
client on purpose so it survives whatever runs underneath.

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
are strings such as `user_2abc...`, so the users table is keyed on `text` from
the first migration, and every reference to it is `text` too:
`applications.traveler_id`, `applications.assignee_id`, `memberships.user_id`,
`documents.verified_by`, `messages.sender_id`, `status_events.actor_id`,
`invitations.invited_by`, `audit_logs.actor_id`.

Writing the schema once in this shape is the main practical gain from moving
identity and data together. The alternative — a `clerk_user_id` column beside a
UUID primary key, repointed later — means doing the `uuid → text` change across
every one of those foreign keys twice.

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
platform conventions, this requires written agreement from the platform team,
and it now sits on the critical path: the Drizzle schema is written in the
first step of Phase 1 and the names are fixed from that commit onward. If
agreement has not arrived by then, Phase 1 proceeds with the current names and
the rename is deferred to BeOrchid Core work — the sequencing does not change,
only the identifiers in the schema file.

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

Each phase ends in a working application, deployable if it needs to be. Within
Phase 1 the app is expected to be red between steps.

### Phase 0 — Unblock and baseline

External dependencies and decisions, mostly not code. Only the schema-naming
answer blocks the start of Phase 1; the rest is needed by its end.

- Restore Ali's Coolify access: the account for `toshpulatov.remote@gmail.com`
  is half-created, registration reports it already exists, and password reset
  is unconfigured. The platform lead must delete and re-invite it.
- Confirm Clerk dashboard access and create the Toplance application, with
  email verification code as the sole first factor and password disabled — the
  no-passwords decision is client-locked.
- Obtain written sign-off on the schema naming conventions above **before the
  first schema commit**, and on storage choice and deployment target before
  Phase 2.
- Provision staging PostgreSQL on Coolify.
- Housekeeping: commit the pending `ChatMarkdown` work, sync with `origin/main`.
  *(Done — `c4da460`.)*

Security note to raise with the platform lead: open registration was enabled on
the public Coolify dashboard and invitation links were shared in chat. Coolify
controls deploys for the whole server. The registered-user list is worth
auditing and registration disabling once access is restored.

**Exit:** Coolify and Clerk are accessible, staging Postgres exists, decisions
are in writing.

### Phase 1 — Leave Supabase

Identity, data and file storage move together, because Supabase provides all
three through one integration and unpicking them in stages means building
adapters for a system being switched off. Internally the work is ordered
schema → data layer → identity → storage, each step committed separately, but
the app is only expected to run again at the end.

- **Authorization** — done ahead of the rest and already committed: every RLS
  policy transcribed into pure functions in `src/lib/auth/policy.ts`, with
  tests.
- **Schema** — Drizzle schema in TypeScript, keyed on Clerk user IDs, in its
  final conventions-correct shape. Drizzle Kit migrations committed to the
  repo. The `application_completion` function and `org_application_progress`
  view carry over as raw SQL; the view loses `security_invoker`, which is
  meaningless without RLS, and the data layer filters by `org_id` explicitly.
- **Local development** — a Docker Compose Postgres and an S3-compatible store
  replace `supabase start`. Note that port 54322 is already taken on the
  development machine by another project, so this project picks its own.
- **Seed** — corridors and corridor requirements, previously seeded by the
  Supabase migration.
- **Data layer** — `src/lib/data/` and both `actions.ts` files rewritten onto
  Drizzle, with guards from `src/lib/auth/` in front of every query.
- **Identity** — `@clerk/nextjs`, `clerkMiddleware` in `src/proxy.ts`, the
  three sign-in surfaces rebuilt on Clerk's email-code flow, just-in-time user
  provisioning.
- **Storage** — the `documents` bucket ported to the S3 API, with uploads and
  downloads through signed URLs issued by guarded server actions. Object paths
  keep the `{application_id}/{doc_key}/{filename}` layout. Writing against the
  S3 SDK rather than a vendor client means the MinIO-versus-R2-versus-S3
  decision only changes an endpoint and credentials, so it does not block this
  work.
- **Removal** — `@supabase/*` dependencies, the `db:*` scripts,
  `database.types.ts`, the env plumbing and `SetupNotice`'s Supabase
  assumptions all go.

**Exit:** all four surfaces run on Clerk and Coolify-shaped Postgres with no
Supabase dependency; every server action performs an explicit ownership or role
check, audited against `init.sql` line by line; documents upload, download and
delete; typecheck, tests and build pass.

### Phase 2 — Deployment

- Coolify deploys for staging, then production, with per-environment Clerk
  keys, `DATABASE_URL` and storage credentials.
- Backups and connection pooling for the Coolify Postgres, following whatever
  Thrivo already does on the same server.

**Exit:** the Supabase project can be switched off; staging and production are
live.

### Phase 3 — Visa data integration

Independent of the stack work; may begin any time after Phase 1.

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

Supabase leaves in one phase because its parts are not separable in a way worth
paying for. Auth, database and storage share one integration, so keeping any of
them while replacing the others means writing an adapter to a system being
switched off — a service-role client to stand in for RLS, or a `clerk_user_id`
column beside a UUID key that gets repointed later. With no production data and
no working local Supabase, staging the work protects nothing and costs a
schema written twice.

Within the phase the schema comes first because everything else is typed off
it, and authorization comes before any of it because the database stops
enforcing access the moment the connection changes. Deployment follows because
it needs something finished to deploy. Visa data is decoupled throughout — it
does not depend on where the database lives.

## Risks

**Silent authorization gaps.** The largest risk in the migration. Mitigated by
centralising checks in the data layer, auditing every server action against the
policy list in the current `init.sql`, and covering the traveller-ownership and
employer-privacy boundaries with tests. A gap here is not a broken screen; it
is one traveller reading another's passport.

**A long red phase.** Merging the work means the app does not run between the
first schema commit and the last storage commit. Acceptable because nothing is
deployed from this branch and the alternative is rework, but it does mean
mistakes surface later than they would in smaller steps. Mitigated by keeping
the internal order strict, committing each step, and treating the audit against
`init.sql` as a gate rather than a formality.

**The employer privacy boundary.** Currently guaranteed by an absent RLS policy
and a view that exposes no document columns. After the move it is guaranteed by
code, which means it needs an explicit test rather than a structural guarantee.

**Coolify operational unfamiliarity.** Neither backups nor connection pooling
come free the way they did with Supabase. Both need answers from the platform
team before production, and Thrivo's existing setup is the precedent to follow.

**Provider terms.** Free-tier visa APIs commonly restrict caching and
redistribution — the very things the caching strategy depends on.

## Open decisions requiring platform sign-off

**Blocking — needed before the first schema commit:**

1. Schema naming: adopt `core`/`toplance` schemas and the corrected table names
   during the rebuild, or defer to BeOrchid Core work. Whichever way, the
   answer is baked into the first migration.

**Needed before deployment, not before the work starts:**

2. Document storage: MinIO on Coolify (recommended, no new vendor) versus
   external S3 or R2. Building against the S3 SDK means this is an endpoint and
   a set of credentials, not an architecture.
3. Deployment target for the Next.js app: Coolify, matching Thrivo, versus
   Vercel.
4. Backups and connection pooling for the Coolify Postgres.
