# Toplance

Visa and relocation support for people leaving West Africa for work, study and
treatment — and for the organisations sending them.

Next.js 16 (App Router) · Tailwind v4 · shadcn/ui · Clerk · Drizzle over PostgreSQL · S3-compatible storage.

---

## First run

You need Docker running for Postgres and the object store, and a Clerk
application for sign-in.

```bash
npm install
npm run db:up                     # Postgres on 54329, MinIO on 54330
cp .env.local.example .env.local  # then paste in your two Clerk keys
npm run db:migrate                # applies the schema and the SQL objects
npm run db:seed                   # loads four corridors and their requirements
npm run db:bucket                 # creates the private documents bucket
npm run dev
```

`db:bucket` talks to the S3 API rather than MinIO's own client, so the same
command works against whatever store staging and production use.

The public home page at `/` works without any of this. Every other route shows a
setup notice until `.env.local` exists, rather than a stack trace.

The MinIO console is at <http://127.0.0.1:54331> (`toplance` / `toplance123`).

### Making yourself staff

The operations console is gated on `profiles.role = 'staff'`. There is no UI for
granting it, deliberately. After signing up once:

```sql
update profiles set role = 'staff', staff_role = 'owner' where email = 'you@example.com';
```

Run it with `npm run db:studio`, or:

```bash
docker exec -it toplance_postgres psql -U toplance -d toplance
```

### Staff two-factor authentication

The ops console holds passport scans, so a staff sign-in needs two independent
proofs, not one. This is enforced in code (`requireStaffConsole` in
`src/lib/auth/staff-gate.ts`) rather than in Clerk's own session rules, but the
*second factor itself* — an authenticator app — has to exist on the Clerk side
first. In the Clerk Dashboard, under **User & Authentication → Multi-factor**,
turn on:

- **Authenticator application** (TOTP)
- **Backup codes**, so a staff member who loses their device is not locked out

Nothing else needs configuring — this app never marks a role "requires 2FA" in
Clerk; it just asks `currentUser().twoFactorEnabled` and refuses the console
until that is true. Until a staff account enrolls an authenticator app (from
its Account Portal, linked to from the blocker screen it sees), it can sign in
but cannot open `/ops` or `/ops/cases/*` — the blocker screen explains why and
links straight there. Travellers and employers never see any of this: no
traveller or employer role is ever asked for a second factor, in the dashboard
or in the code.

### End-to-end tests

Four journeys, in `e2e/`, run through a real browser against a real dev
server, the real Clerk development instance, the local Postgres and the local
object store:

| Spec | The journey |
| --- | --- |
| `traveller.spec.ts` | Sign up → intake → the ng→gb checklist → upload a file → *Checking* |
| `ops.spec.ts` | Refused → promoted to staff → queue → verify a document → approve |
| `employer.spec.ts` | Sign up → name an organisation → invite → accept in a second browser → roster |
| `companion.spec.ts` | Approved → "After you land" appears → the arrival checklist |

```bash
npm run db:up && npm run db:migrate && npm run db:seed && npm run db:bucket
npx playwright install chromium
npm run e2e
```

`playwright.config.ts` starts the dev server itself, on **port 3100** and in
its own build directory, with four things about `.env.local` deliberately
overridden:

- **`OPENAI_API_KEY` blanked**, so the intake runs its scripted path,
  `aiEnabled()` is false everywhere, and no test can bill a model
- **`RESEND_API_KEY` blanked**, so no invitation email leaves the machine
- **`S3_*` pointed at the local MinIO**, so a fixture upload never lands in the
  R2 staging bucket
- **`E2E_SKIP_STAFF_2FA=1`**, the seam in `requireStaffConsole` that lets a
  scripted staff sign-in past an authenticator app it cannot enroll. Off
  everywhere else, and it widens nothing else that gate checks

Sign-in is the product's own form, driven like any form. The addresses end in
`+clerk_test`, which Clerk development instances accept with the fixed code
`424242`; `clerkSetup()` in `e2e/global-setup.ts` fetches the testing token
that gets a scripted sign-up past bot protection. If a sign-up ever fails with
"that code did not work" on a fresh instance, check that test mode has not been
turned off in the Clerk Dashboard.

`e2e/helpers/db.ts` is the suite's own hand into Postgres, for the three things
a browser cannot honestly do: making an account staff (there is no code path,
by design), standing up a submitted case for the reviewer to work, and deleting
what the last run left behind. `e2e/fixtures/passport.jpg` is a generated
placeholder — 640×400, a few kilobytes, and legibly not a real document.

Two suites can run side by side (a second checkout, a colleague's branch) with
`E2E_PORT` and `E2E_DIST_DIR` moved together — Next 16 takes an exclusive lock
on its build directory, so both have to move.

Three things stay manual, and are not pretended at anywhere: the authenticator
enrollment blocker a staff account without 2FA actually sees (`staff-gate.ts`'s
`enroll` branch — unit-tested in `staff-gate.test.ts`), anything that needs a
model behind it, and any email actually arriving.

---

## Layout

```
src/
  app/
    (site)/          public marketing page — statically rendered, no session
    (auth)/          sign-up, sign-in, employer and operations entry
    (app)/           traveller: intake agent, requirements, documents
    employer/        organisation console
    ops/             operations case queue
  components/
    ui/              shadcn primitives, carrying BeOrchid tokens
    site/ auth/ app/ shared/
  lib/
    auth/            policy (pure rules), guards (rules applied to rows),
                     staff-gate (staff role + 2FA, gating the ops console)
    db/              schema, pooled client, SQL objects, seed
    storage/         S3-compatible document store
    domain/          intake questions, corridors, countries, status model
    data/            server-only read helpers
    i18n/            locales and the localised hero strings
  proxy.ts           Clerk session handling (Next 16's renamed middleware)
drizzle/             generated migrations, committed
```

---

## Things worth knowing before you change something

**`proxy.ts`, not `middleware.ts`.** Next 16 renamed Middleware to Proxy.
Clerk's guide still says `middleware.ts`; this project uses the newer name. It
handles the session and one convenience redirect. It decides nothing: a path
matcher is not authorization, and every real decision happens in the data layer.

**Authorization is in the code, not the database.** It used to be row-level
security, which meant a forgotten ownership check failed closed. It does not any
more. `src/lib/auth/policy.ts` holds the rules as pure functions;
`src/lib/auth/guards.ts` applies them to a row that has actually been loaded.
Nothing may read or write someone's application without passing a guard, and the
audit at the bottom of `policy.ts` maps every original RLS policy to what
replaces it — including the features that have neither yet.

**Documents are on R2, and the bucket must stay private.** MinIO locally,
Cloudflare R2 in staging and production — `S3_ENDPOINT`, `S3_REGION=auto` and a
key pair, no code difference. Two things are easy to get wrong and neither
raises an error. R2's **public development URL must stay disabled** and no
custom domain attached, or every passport scan is served unsigned and every
signed URL in the app becomes decoration. And the **API token is scoped to the
documents bucket only**: `removeDocument` and the replace path in
`uploadDocument` both delete objects, so a leaked deploy credential must not
also reach the backups. `documents.test.ts` asserts the unsigned request fails —
point `S3_*` at R2 and run it once against the real bucket.

**The privacy boundary is `canReadDocuments`.** An employer sees a sponsored
applicant's completion score, status and destination. That predicate has no
sponsorship branch, and the employer console reads through the
`org_application_progress` view, which has no column that could reveal a
document. This is the promise the marketing page makes. `guards.test.ts` fails if
either half is broken. Do not add a join, a column or a branch that breaks it.

**Design tokens are the API.** `globals.css` defines theme (light/dark) and brand
(toplance/beorchid) as two independent axes. Nothing hard-codes a hue. shadcn's
own variable names (`--color-primary`, `--color-background`, …) are aliased onto
BeOrchid tokens, so anything you pull in with `npx shadcn add` inherits the brand
without edits.

**The type scale is locked by the client.** 16px body floor. `.special` (13px,
600 weight) is the only sub-16 role and is reserved for static, non-interactive
metadata — never a button, link or input. Data tables are the one agreed
exception, and they must not scroll horizontally on desktop.

**Status is never carried by colour alone.** Every status pill is icon + label +
colour. The mapping lives in `src/lib/domain/status.ts` and is fixed.

**"Verified" means accepted for review.** Not approved. That wording is
deliberate and appears in `VERIFIED_MEANS`; keep it wherever document state is
explained.

**Fonts are self-hosted.** Inter and JetBrains Mono are vendored into
`src/app/fonts/` and loaded with `next/font/local`, so no user's browser makes a
request to Google. Refresh instructions are in `src/app/layout.tsx`.

**shadcn components were hand-written.** The registry was unreachable from the
environment that scaffolded this, so `src/components/ui/*` was written to shadcn
conventions rather than generated. `components.json` is correct, so
`npx shadcn@latest add <component>` works normally from here on — new components
will land in the same place and pick up the tokens.

---

## What is built, and what is not

Working end to end:

- The public home page, in four languages for the hero and calls to action
- Email one-time-code auth for all three personas, with session refresh, plus a
  required authenticator-app second factor for staff before the ops console
  opens
- The intake conversation — eleven topics, editable answers, checklist rebuild
- Corridor resolution and the versioned requirements engine, behind a
  `VisaDataProvider` so a data vendor is one more entry in a list
- Product analytics to `analytics_events` via `track()`, names locked to
  `toplance.object_action`
- Document upload to an S3-compatible bucket, read back via signed URLs
- Completion scoring, and submission gated on it
- The employer roster, reading through the privacy-safe view
- The operations queue with SLA ageing

- Messaging between traveller and case handler
- The document reviewer screen and staff status transitions
- Invitations and organisation onboarding, accepted at `/invite/<token>`
- The post-arrival companion, and the digest each traveller sets the frequency
  of

Built, but inert without a key — every one degrades to an honest empty state
rather than an error:

- The LLM intake agent and realtime voice (`OPENAI_API_KEY`; without it the
  intake falls back to the scripted flow)
- Automated document pre-checks (`OPENAI_API_KEY`; a file lands in `checking`
  and waits for a reviewer instead)
- Itinerary generation after approval (`OPENAI_API_KEY`)
- Every email (`RESEND_API_KEY`; `sendEmail` logs and returns)
- Entry rules on top of the four curated corridors — allowed stay, passport
  validity, embassy and eVisa links (`TRAVEL_BUDDY_API_KEY`)

Not built:

- Any voice or SMS channel out — no telephony dependency, so the brief's voice
  summaries and voice digests have nothing to carry them
- Jobs, housing, weather or safety feeds on the companion
- Corridors beyond the four seeded ones (see `LIVE_CORRIDORS`)

### Scheduling the post-arrival digest

`/api/cron/companion` is not self-triggering. It needs a scheduler calling it
with the `CRON_SECRET` as a bearer token:

```
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/companion
```

In Coolify (which is what the `Dockerfile` builds for) that is a **Scheduled
Task** on the application, set to run daily — `0 8 * * *`.

Daily is deliberate, and it is not the cadence. Each traveller chooses daily,
weekly or monthly on their profile, and `travellersDueForDigest` sends only to
those whose last digest is older than their own interval. So the schedule is a
poll: running it more often than the shortest frequency costs a query and sends
nothing extra, and a missed run makes the next digest late rather than lost.
Without `CRON_SECRET` set the route answers 503 and sends nothing at all.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest — policy rules, guards, storage |
| `npm run e2e` | Playwright — the four journeys, against a real browser |
| `npm run db:up` / `db:down` | Postgres and MinIO in Docker |
| `npm run db:generate` | Turn a schema change into a migration |
| `npm run db:migrate` | Apply migrations, then the hand-written SQL objects |
| `npm run db:seed` | Reload the corridor rule sets |
| `npm run db:bucket` | Create the documents bucket |
| `npm run db:studio` | Drizzle Studio |
