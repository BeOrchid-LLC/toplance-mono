# Visa Engine Coverage — Developer Handoff

**Read first:**
- What to build → `docs/superpowers/specs/2026-09-02-visa-engine-coverage-prd.md`
- How and in what order → `docs/superpowers/plans/2026-09-02-visa-engine-coverage-execution.md`
- Project conventions → `AGENTS.md` (read it fully; it overrides defaults)

This document is orientation: how to run it, what not to break, and what is already
wrong.

---

## 1. Get it running (verified 2026-09-01)

```bash
open -a Docker            # daemon must be up first
npm install
npm run db:up             # Postgres :54329, MinIO :54330/:54331
npm run db:migrate        # migrations + SQL objects
npm run db:seed           # corridors + requirements + demo org
npm run dev               # :3000
```

Copy `.env.local.example` → `.env.local`. Needed for this work: `DATABASE_URL`,
Clerk keys, `OPENAI_API_KEY`, `TRAVEL_BUDDY_API_KEY`. `RESEND_API_KEY` no-ops
locally — invitation links still work.

Checks: `npm run typecheck` · `npm test` · `npm run e2e` · `npm run lint`

DB-backed tests skip themselves without `DATABASE_URL` — see
`src/lib/auth/guards.test.ts` for the pattern.

## 2. Where things live

```
src/lib/visa/            the engine
  types.ts               VisaDataProvider, CorridorRuleSet, RequirementSpec
  index.ts               PROVIDERS list — order is precedence
  resolve.ts             the walk (pure, testable against stubs)
  merge.ts               fillGaps / hasGaps
  curated.ts             Postgres provider, canLead: true
  travelbuddy.ts         RapidAPI provider, canLead: false
src/lib/data/
  intake.ts              intake completion → resolveRuleSet → adoptRuleSet
  checklist.ts           adoptRuleSet — materialises documents rows
  applications.ts        percentComplete
src/app/(app)/app/(corridor)/
  requirements/page.tsx  reference sheet (renders ruleSet directly)
  documents/page.tsx     working checklist (renders documents rows)
src/lib/db/schema.ts     every table and column, one file
src/lib/db/seed.sql      corridor reference data
src/app/ops/             staff console
src/lib/auth/policy.ts   AppRole, StaffRole ("reviewer" | "owner")
```

## 3. Invariants — do not break these

**`canLead` is a safety gate, not a preference.** A provider that returns no
documents must never open a rule set. If it did, `adoptRuleSet` would materialise a
checklist with zero rows: no upload slots, no completion score, no 100% trigger for
the review queue. `travelBuddyProvider` is `canLead: false` for this reason.

**Order in `PROVIDERS` is precedence.** First provider to answer owns the spine —
documents, corridor, identity. Later providers may only fill blank fields via
`fillGaps`, never overwrite. Curated must stay first.

**Never invent a checklist.** If no provider answers, the traveller gets
`CorridorGap` and the request is counted via `toplance.corridor_requested`. A missing
checklist is honest; a guessed one gets someone refused. The requirements screen says
*"Nothing here is our interpretation"* — that promise is load-bearing.

**`adoptRuleSet` is idempotent and non-destructive.** It inserts only missing
`docKey`s and deletes stale rows **only** where `state = 'not_started'`. An uploaded
document must survive whatever the corridor now asks for. It is called from both the
intake action and the requirements screen — the second call heals applications whose
corridor data arrived late.

**Analytics names are a union type.** Add to `src/lib/analytics/events.ts` or it is a
compile error. Format is `toplance.object_action`, lowercase. `track()` never throws.

**Do not migrate schema conventions.** `AGENTS.md` lists known deviations
(`public` schema, `organisations`, `audit_log` singular). They are deliberate and
belong to BeOrchid Core planning. Additive columns are fine; renames are not.

**Do not touch `src/components/ui/`** or the design system.

**Model output renders through `src/components/app/chat-markdown.tsx`.** No
`rehype-raw`, no `dangerouslySetInnerHTML`, no remote images.

**Drizzle:** `pgTable`'s second-argument callback returns an **array**, not an object.

## 4. 🚨 A latent bug that goes live with milestone 02

Currently harmless. **It becomes a real defect the moment the VisaList provider
ships**, because that provider is `canLead: true` and returns `corridorId: null`.

`documents/page.tsx` looks up requirement descriptions like this:

```ts
const requirements = application.corridorId ? await db.select(…) : [];
```

`adoptRuleSet` sets `applications.corridor_id = ruleSet.corridorId`, which is `null`
for any API-provided rule set — there is no row of ours behind it. And the
`documents` table has no `description` column of its own.

**Result once VisaList is live:** a tourism traveller sees full descriptions on
`/app/requirements` and bare names with no guidance on `/app/documents`.

**Fix, in milestone 02, not later:** add `description` to `documents` and have
`adoptRuleSet` write it from the rule set, so the upload screen stops depending on a
corridor row existing. Roughly 3 hours including the migration and a regression test.

## 5. Known-wrong data

- **UK Skilled Worker fee is stale.** `seed.sql` has `government_fee_minor = 71900`
  (£719). gov.uk currently publishes **£819** (up to 3 years) / £1,618 (over 3).
  Verified 2026-09-02.
- **All four corridors are `version = 1`** with `effective_from` between
  2026-01-15 and 2026-02-10 — seven to eight months unverified.
- **No freshness column exists.** `effective_from` is when the *mission's rule* took
  effect, not when anyone last checked. Milestone 01 adds `last_verified_at`.
- `seed.sql`'s own header says: *"These figures are illustrative and dated … Verify
  against the mission before going live."*
- **Dead config:** `DINV_API_KEY` in `.env.local` — provider removed in `78fd596`.
  Delete it.
- **Stale comment:** `src/lib/visa/index.ts:31` references `@/lib/visa/visahq`, which
  does not exist on disk.

## 6. Vendor context — do not re-litigate

Twelve vendor categories were evaluated 2026-08-31 → 2026-09-02. **No API sells
work, study, medical or relocation document checklists.** Rejected with reasons:
Sherpa, VisaHQ, SimpleVisa, Zyla, IATA Timatic, Deel (and EOR peers), student
recruitment platforms, open datasets, DoINeedVisa.

Two conclusions that save a week:

- **VisaList has real checklists but tourism only** — hence the split in the PRD.
  Use the **Basic tier** (~$0.10/request, 1/hour) with a warming job, not Pro
  ($999.99/mo). Their caching terms must be confirmed in writing first.
- **Do not restore `src/lib/visa/doineedvisa.ts` from git.** Its paid `purpose` tier
  returns no documents and leaves the *tourist* `required_documents` attached, so
  `DINV_PURPOSE_TIER=1` would serve tourist checklists on work corridors. Its Zod
  schema is also incompatible with the live API now.

## 7. Where to start

Milestone 01 — schema additions — unblocks everything else and is the smallest
reviewable change. Then 02 (VisaList) in parallel with 04/05 (drafting + ops review),
since they share only the schema.

Before writing the VisaList provider, read `src/lib/visa/travelbuddy.ts` end to end.
It is the reference implementation: envelope validation, caching, key-rejection
stand-down, `httpUrl()` link sanitising (vendor strings reach an `href`), and the
test file records real payload shapes. Mirror its structure.

## 8. Definition of done

- 50+ destination countries resolvable for tourism
- 15 non-tourism corridors live, each approved by a `staffRole = "owner"`
- Every live corridor carries a source URL and a last-checked date, both displayed
- No corridor reachable by a traveller without an approver recorded in `audit_log`
- Uncovered corridors still reach the gap screen, never an invented list
- `npm run typecheck`, `npm test`, `npm run e2e` all green
