# Toplance — Visa Engine Coverage: Execution Plan

**PRD:** `docs/superpowers/specs/2026-09-02-visa-engine-coverage-prd.md`
**Date:** 2026-09-02 · **Owner:** Ali · **Window:** two weeks, live

---

## 1. Tech stack decisions

Inherited, not chosen. Deviations from Ali's default stack are the repo's existing
choices and stay.

| Layer | Choice | Reasoning |
|---|---|---|
| Framework | Next.js 16.3.2, App Router, Turbopack | existing |
| ORM | **Drizzle**, not Prisma | existing; schema is one file, `src/lib/db/schema.ts` |
| DB | PostgreSQL | existing |
| Auth | Clerk + `staff-gate` 2FA | existing; `StaffRole` already has `owner` |
| AI | AI SDK v7 + `@ai-sdk/openai`, structured output via Zod | existing; used by `precheck.ts` |
| Storage | S3-compatible (R2 / MinIO local) | existing |
| Email | Resend | existing, no-ops without key |
| Deploy | Coolify, staging first | existing constraint |

**No new dependencies required.** The VisaList provider is `fetch` + Zod, same shape
as `travelbuddy.ts`.

## 2. Architecture

Nothing in the resolver changes. This is the load-bearing decision of the whole plan:

- `curatedProvider` already selects `is_live = true`, highest `version`.
- So a **draft is a new `version` with `is_live = false`** — invisible to travellers
  by construction, no gating code, no feature flag.
- Approval flips `is_live = true`, and the higher version instantly supersedes.
- `resolve.ts`, `merge.ts`, `curated.ts`, `types.ts` are untouched.

Provider list becomes:

```
PROVIDERS = [ curatedProvider,   // canLead: true  — all purposes
              visaListProvider,  // canLead: true  — tourism only
              travelBuddyProvider ] // canLead: false — entry rules
```

Order is precedence: a curated corridor always beats a VisaList answer for the same
triple.

## 3. How the curated data actually gets filled — the runbook

This is the part the PRD does not cover. Per corridor, six steps:

**Step 1 — Locate sources.** Two per corridor:
- VFS Global published checklist for that nationality → destination → purpose.
  These are already enumerated lists, which is why they beat embassy prose.
- The mission's own page, for `government_fee_minor` and `processing_weeks_*`.

**Step 2 — Extract to a draft.** `scripts/draft-corridor.mts` takes the triple plus
source URLs, fetches both, and asks the model for a structured object matching a Zod
schema that mirrors `RequirementSpec[]` plus corridor fields. Structured output, not
free text — an unparseable response fails loudly rather than producing half a
checklist. Every requirement must come back with the `source_url` it was read from;
a requirement with no source is dropped, not guessed.

**Step 3 — Write as a pending version.** The script inserts `corridors` at
`version = current + 1`, `is_live = false`, `review_state = 'pending'`, plus its
`corridor_requirements` rows. Nothing is visible to travellers at this point.

**Step 4 — Review in the ops console.** A super admin opens `/ops/corridors/[id]`
and sees each requirement with its source link, and — where a live version exists —
a field-level diff of what changed.

**Step 5 — Approve or reject.** Approve sets `is_live = true`, stamps `approved_by`,
`approved_at`, `last_verified_at`, and writes `audit_log`. Reject records a reason
and leaves it dark. Gated on `staffRole === "owner"`.

**Step 6 — Re-check on a schedule.** A cron re-reads each `source_url`, compares a
content hash first (cheap; most weeks nothing moved), and only re-extracts when the
page changed. Drift produces a new pending version — never a write to a live one.

**Throughput:** with the list already enumerated on the VFS page, drafting is
transcription plus verification, not research. Budget ~45 min of human review per
corridor, so 15 corridors ≈ 11 hours of review spread across the window.

## 4. Database schema

Additive only. No renames, no schema moves — BeOrchid conventions untouched.

```sql
-- corridors
alter table corridors add column last_verified_at timestamptz;
alter table corridors add column approved_by text references profiles(id) on delete set null;
alter table corridors add column approved_at timestamptz;
alter table corridors add column review_state text not null default 'approved';
  -- 'pending' | 'approved' | 'rejected'; existing rows backfill to 'approved'
alter table corridors add column reject_reason text;
alter table corridors add column source_hash text;   -- change detection

-- corridor_requirements
alter table corridor_requirements add column source_url text;
```

`version`, `effective_from`, `is_live` already exist and need no change.

Drizzle: edit `src/lib/db/schema.ts`, then `npm run db:generate && npm run db:migrate`.

## 5. API / surface

| Surface | Type | Auth | Purpose |
|---|---|---|---|
| `/ops/corridors` | page | staff | coverage list: state, version, last checked |
| `/ops/corridors/[id]` | page | staff | review a draft, diff vs live |
| `approveCorridor` | server action | `owner` | flip live, stamp, audit |
| `rejectCorridor` | server action | `owner` | record reason |
| `/api/cron/corridor-recheck` | route | cron secret | drift detection |
| `scripts/draft-corridor.mts` | CLI | local | extract + insert pending version |

**Analytics** added to `src/lib/analytics/events.ts`:
`toplance.corridor_drafted`, `toplance.corridor_approved`,
`toplance.corridor_rejected`, `toplance.corridor_drift_detected`.

## 6. Milestones

| # | Milestone | Deliverable | Hours | Depends on |
|---|---|---|---|---|
| 01 | Schema additions | columns + migration + backfill | 4 | — |
| 02 | VisaList provider | provider, Zod mapping, cache, tests | 14 | terms confirmed |
| 02b | **`documents.description`** | column + `adoptRuleSet` writes it + regression test. **Mandatory with 02** — see handoff §4: VisaList is `canLead: true` with `corridorId: null`, so without this the upload screen loses all guidance text for tourism travellers | 3 | 01 |
| 03 | Warming job | cron populates corridors under rate limit | 8 | 02 |
| 04 | Draft extraction script | `draft-corridor.mts`, structured output | 12 | 01 |
| 05 | Ops corridor list + review screen | `/ops/corridors`, `/ops/corridors/[id]` | 14 | 01 |
| 06 | Approve / reject actions | server actions, audit, events | 6 | 05 |
| 07 | Traveller freshness UI | last-checked date, per-requirement sources | 8 | 01 |
| 08 | Curate 15 corridors | drafting + client review cycles | 12 | 04, 06 |
| 09 | Drift re-check job | hash compare, re-extract, pending version | 10 | 04 |
| 10 | Checklist-change notification | notify traveller on corridor revision | 4 | 06 |
| 11 | Testing + E2E + polish | | 8 | all |
| | **Subtotal** | | **103** | |
| | **+12% buffer** | | **115** | |

## 7. The honest problem with the two-week window

**115 hours does not fit two weeks of solo work (~80 hours).** Stating it plainly
rather than discovering it in week two.

**Recommended demo cut — 87 hours, just fits:**

| Cut | Saves | Why it is safe to defer |
|---|---|---|
| 09 — drift re-check | 10 | Freshness is *displayed* from day one; automation follows. Manual re-check for 15 corridors is viable short-term. |
| 10 — change notification | 4 | Only bites once corridors start revising, which is post-demo. |
| Diff view in 05 → full-list view | 6 | First approval of every corridor has no prior version to diff against. |
| **New total** | **87** | delivers all 50 destinations + 15 corridors + approval + sources + dates |

Deferred items become the fast-follow immediately after the demo. **Do not cut 07** —
displaying the last-checked date is what keeps the product honest while automation
is missing.

## 8. Timeline

**Week 1 — the headline number.**
Milestones 01, 02, 03. Ends with 50+ destinations resolvable for tourism. This is
the deliverable the client's spec is measured against, so it lands first.

**Week 2 — the curated depth.**
Milestones 04, 05, 06, 07, then 08 running continuously as the client approves
batches. Ends with 15 non-tourism corridors live, sourced and dated.

**Critical path runs through the client, not the code.** Milestone 08 cannot finish
faster than the super admin approves. Batches should go out for approval from day 8,
not day 13.

## 9. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| VisaList terms forbid caching | Kills milestone 02 economics | Confirm in writing **before** starting 02. Fallback: curated tourism for a reduced destination list. |
| Client approval turnaround slips | 15 corridors do not go live | Send batches from day 8; agree a named approver and SLA up front. |
| "50 destinations" means × purposes | Scope becomes ~1,250 corridors | Assumption #1 in the PRD — confirm before build. |
| VFS lacks a checklist for a corridor | That corridor falls back to embassy prose | Slower to curate; pick the 15 partly on source availability. |
| Extraction produces plausible-but-wrong rows | Wrong checklist reaches a traveller | Approval gate is mandatory; requirements without a source URL are dropped, not guessed. |
| Rate limit stalls warming | Coverage incomplete at demo | Start warming on day 3; it runs unattended. |
| Existing data is already stale | Demo shows wrong figures | UK fee confirmed £100 wrong. Re-verify all 4 live corridors in milestone 08. |

## 10. Testing

- **Unit** — provider mapping against recorded payloads (mirrors `travelbuddy.test.ts`);
  extraction schema validation; approval authorization (`owner` vs `reviewer`).
- **Integration** — draft → pending → approve → served, asserting a pending version is
  never resolvable.
- **E2E (Playwright)** — traveller sees checklist with source and date; reviewer
  cannot approve; owner can.
- **Manual** — every one of the 15 corridors verified against its source by a human
  before approval. This is the actual quality gate; the tests protect the machinery
  around it.

## 11. Deployment

Staging first, always. Migration runs via `npm run db:migrate`. New env vars:
`VISALIST_API_KEY`, plus the existing cron secret pattern for the re-check route.
Backfill `review_state = 'approved'` and `last_verified_at` for the four existing
corridors as part of milestone 01 — they must not appear as unapproved drafts.

## 12. Open technical questions

1. VisaList caching rights — blocks milestone 02.
2. Which 15 corridors, and does VFS publish a checklist for each?
3. Staleness thresholds before `is_live` drops.
4. Should the four existing corridors be re-approved through the new flow, or
   grandfathered? Recommend re-approving — the UK fee is already wrong.
