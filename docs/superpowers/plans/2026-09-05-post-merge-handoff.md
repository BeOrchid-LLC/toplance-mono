# Post-Approval Slice — Handoff (2026-09-05)

**Read first:**
- Domain vocabulary → `CONTEXT.md`
- Why the advisory cache holds two readings → `docs/adr/0001-advisory-alert-baseline-is-separate-from-the-cache.md`
- Project conventions → `AGENTS.md` (read it fully; it overrides defaults)

State at the time of writing: PRs #37 and #38 are merged. `main` is `f16d7d9`,
its CI (lint, types, 910 unit tests) green. One thing is red and one PR is open.

---

## 1. 🚨 Do this first — e2e on `main` is red and cannot self-heal

Run <https://github.com/BeOrchid-LLC/toplance-mono/actions/runs/33947092975> —
the first execution of the End-to-end workflow #38 added — failed without running
a single test.

**Cause:** `gh secret list` returns *nothing*. The repository has no secrets at
all, so `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` resolve to
empty strings, Next refuses to boot (`@clerk/nextjs: Missing publishableKey`,
once a second for four minutes), and Playwright gives up with `Timed out waiting
240000ms from config.webServer`.

**Fix:**

```bash
gh secret set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   # pk_test_…
gh secret set CLERK_SECRET_KEY                    # sk_test_…
gh run rerun 33947092975
```

Both must come from the same Clerk **development** instance — `e2e.yml`'s own
header notes a production key makes the suite refuse to start. A working
`pk_test`/`sk_test` pair already exists in a developer's `.env.local`.

This was never catchable before merge: the workflow only triggers on `push:
main` and `workflow_dispatch`, so no PR could have run it.

## 2. Open PR

**#40 — `docs/context-and-adr`.** This file, `CONTEXT.md` and ADR 0001. Docs
only, no code. Needs review and merge.

## 3. Local cleanup (not done — needs a shell outside the agent worktree)

```bash
git switch main && git pull          # main is checked out elsewhere; the
                                     # agent worktree cannot move it
git worktree remove .claude/worktrees/delegated-floating-origami
```

The worktree holds its own `node_modules`. Both merged branches are already
deleted, locally and on the remote — note they needed `git branch -D`, because
#37 was *squash*-merged and its commits are therefore not ancestors of `main`
even though every line of them is.

## 4. Invariants this slice introduced — do not "simplify" these

**The advisory cache holds two readings, not one.** `advisories` is what the
sources last said; `alerted` is what the traveller has been told. Collapsing them
back is the obvious refactor and it silently kills the feature — the companion
page refreshes on render and discards `changed`, so a single page view would
consume the alert the nightly sweep exists to send. Full reasoning in ADR 0001.
Only `markAdvisoriesAlerted` may move `alerted`, and only after `notify` reports
the send succeeded.

**On a first sighting, `alerted` is seeded with the reading itself.** Seeding it
empty makes every source look permanently new — "changed" is defined against a
previous reading, and `advisoryChanged(null, next)` is `false` — so no alert ever
fires again. This shipped broken once and was caught only by a test.

**`thresholdDays` and `daysRemaining` are different numbers.** The first is which
of the 60/30/7 notices this is, used for dedupe and never shown to anyone. The
second is what is actually true on the day of sending, and the only one any copy
may print. They were one field called `daysOut`, which told a traveller with 31
days left that they had 60.

**The expiry dedupe is keyed on the expiry date too, not just the threshold.** A
traveller whose visa is extended must get the full run of notices again for the
new date.

**`notify` returns whether it sent.** It never throws — it swallows its own
failures by design — so a `try`/`catch` around it cannot distinguish a sent
notification from a failed one. Any caller that counts sends or emits an
analytics event claiming delivery must gate on the return value. All three call
sites in `/api/cron/companion` do.

**Two lookup tables, not one.** `FCDO_SLUG_OVERRIDES` fixes gov.uk slugs;
`STATE_DEPT_NAMES` fixes State Department feed names. They serve different
sources and are not alternatives. Both were checked against the live endpoints on
2026-09-05; a wrong entry fails *silently* as a missing advisory, so verify
against the API rather than reasoning about it.

## 5. Next feature work — brief item 14, partly done

Shipped: document-renewal reminders (visa expiry), weather, and safety alerts.

Still open in that item:
- local opportunities — jobs, housing, events, networking
- community and expat group suggestions
- future travel plan suggestions based on the profile
- **voice message** as a delivery channel alongside text and email

## 6. Not audited — do not read absence as completion

Brief items 1–8, 10, 12, 15 and 16 were **not** checked against the code in this
session. #38's title claims 9, 11 and 13. Anyone planning the next slice should
do that audit first rather than trusting this document's silence.

## 7. Known-wrong / annoying

- **The DB suite is flaky under parallel load on a developer machine.** A
  different random subset of DB-backed suites fails each run, always on hook or
  test timeouts, never on assertions; every one passes on re-run or in isolation.
  A crashed run also leaks fixtures, which then shows up as duplicate-key errors
  — clear with `delete from corridors where nationality_iso in ('zx','zy')` and
  `delete from profiles where email like '%@test.invalid'`. CI is unaffected.
  Note this persists *after* `applications_corridor_idx` landed, so the missing
  index was not the whole story.
- **`origin/HEAD` points at `feedback/status-pills-and-admin-copy`, not `main`.**
  Worth confirming which branch is actually trunk — #37 targeted `main` and
  merged, and CI runs on `main`, so the symref may simply be stale.
