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
    auth/            policy (pure rules), guards (rules applied to rows)
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
- Email one-time-code auth for all three personas, with session refresh
- The intake conversation — eleven topics, editable answers, checklist rebuild
- Corridor resolution and the versioned requirements engine, behind a
  `VisaDataProvider` so a data vendor is one more entry in a list
- Product analytics to `analytics_events` via `track()`, names locked to
  `toplance.object_action`
- Document upload to an S3-compatible bucket, read back via signed URLs
- Completion scoring, and submission gated on it
- The employer roster, reading through the privacy-safe view
- The operations queue with SLA ageing

Scaffolded, needs the next pass:

- Messaging between traveller and case handler (`messages` table exists)
- The document reviewer screen and status transitions from the ops side
- Invitations and seat management for organisations
- Itinerary generation after approval (`itineraries` table exists)
- Automated document checks — currently a file lands in `checking` and stays
  there until a reviewer moves it

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest — policy rules, guards, storage |
| `npm run db:up` / `db:down` | Postgres and MinIO in Docker |
| `npm run db:generate` | Turn a schema change into a migration |
| `npm run db:migrate` | Apply migrations, then the hand-written SQL objects |
| `npm run db:seed` | Reload the corridor rule sets |
| `npm run db:bucket` | Create the documents bucket |
| `npm run db:studio` | Drizzle Studio |
