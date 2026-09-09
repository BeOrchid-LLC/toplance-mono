# Case-level rule override — a director changing what one traveller is asked for — design

**Date:** 2026-09-09
**Status:** **written, not approved.** Two options are put to the client below.
Nothing here is built until she picks one — see "The decision she has to make".
**Source:** client review call, 2026-09-08. Task 11 of
`docs/superpowers/plans/2026-09-08-client-feedback-round-2.md`.

## What she asked for

> Peace Adejoh explained that a role-based feature is necessary where a director
> can authorize manual updates to visa rules if pricing or required
> documentation changes.

Said again on 8 September in the "restore the hidden admin functions" list, as
"rules setting". The concrete scenario she described: a mission raises its fee,
or starts asking for a document it did not ask for last month, and the agency
knows before BeOrchid does — because their handler was told at the counter that
morning. Today they can do nothing but wait.

## Why it cannot be built the way she described it

She is describing an edit to a visa rule. The corridors engine is deliberately
the opposite of editable, and every one of those decisions is load-bearing:

| Property | Where | Why it exists |
|---|---|---|
| Central | `corridors` has no `org_id` | one route, one truth; 40 agencies do not each maintain the UK's fee |
| Versioned | `corridors.version` + `effective_from` | "what was asked on 3 March" is answerable a year later |
| Immutable once published | `setRequirementCondition` refuses a live version (`src/lib/data/corridors.ts:84`) | a mid-flight change cannot silently invalidate a checklist somebody is halfway through |
| Snapshotted | `applications.corridor_id` pins the version | the traveller's checklist is the one they were shown |
| Reviewed | `review_state`, `approveCorridorTx` | a wrong requirement hides a document from everybody on the route |

**An agency editing a published corridor would edit it for every other agency
on that corridor.** That is not a permissions problem a director role can
solve — it is the wrong object to be editing. The `org_role = 'owner'` check she
imagines already exists (`schema.ts:58`); it is the thing being written to that
does not work.

There is a second, quieter reason. `curatedProvider` serves `is_live = true` at
the highest version and knows nothing about review states. If an agency could
publish, an agency could publish a mistake straight to travellers with nobody
having read it.

## What to build instead — a case-level override (recommended)

Change nothing about the corridor. Let a director amend **one application's own
checklist**, and record that they did.

The application keeps its `corridor_id`. Beside the snapshot sits a small set of
deltas belonging to that case alone:

```
application_overrides
  id
  application_id      -> applications.id, cascade
  kind                'fee' | 'requirement_added' | 'requirement_waived'
  doc_key             null for a fee change
  name, description   for an added requirement; a copy, like corridor_requirements
  fee_minor, fee_currency
  reason              not null — the director says why, and the traveller reads it
  created_by          -> profiles.id
  created_at
```

- **A waived requirement** drops out of the traveller's checklist and out of the
  completion figure, with the reason shown where the document used to be.
  Never silently: "your agency has said you do not need this, because …".
- **An added requirement** appears as a normal upload row, marked as coming from
  the agency rather than from the mission.
- **A fee change** overrides the figure the requirements screen prints, with the
  same attribution line.

Properties this keeps that the edit-the-corridor version destroys:

1. Nobody else's checklist moves.
2. The corridor stays the answer to "what does this route require", so
   `/ops/corridors` and `/agency/rule-sets` remain true.
3. The override is attributable — `audit_log` gets the row, and the traveller
   sees a human decision rather than a rule that changed under them.
4. It is reversible, because it is additive: delete the override and the
   snapshot is still there underneath.

And a fifth that matters to BeOrchid rather than to the agency: **every override
is a signal that a corridor is stale.** Three agencies waiving the same document
on the same route is a corridor that needs re-checking, and it should raise the
same flag `drift.ts` raises. That is a reporting screen, not part of the first
build, but the table is shaped so it is possible.

### Access

`org_role = 'owner'` — the director, as she asked. A reviewer proposes nothing;
this is the one place the role split she described is genuinely the right shape,
because an override is a commitment the agency makes to a traveller.

### What it is not

Not a rules editor. There is no screen where a director browses corridors and
edits them. The override is reached from **one case**, in the context of the
traveller it affects, which is also where the director actually is when the
handler phones in from the counter.

## The alternative — agency-local corridor forks

More faithful to her words: an agency gets its own copy of a corridor and
maintains it.

Against it:

- It splits the reference data the product's accuracy depends on. The pitch to
  travellers is that requirements are correct and sourced; forty divergent
  copies of the UK visitor route is the end of that claim.
- Someone has to maintain each fork. The reason BeOrchid curates corridors is
  that agencies do not have the time — which is the problem the product sells
  against.
- `curatedProvider`, `drift.ts`, `checklistChangesFrom` and the freshness model
  all assume one live version per triple. Forking is not a table; it is a
  rewrite of the engine.
- It gives an agency a way to be quietly wrong at scale, with no review.

It is written down because it is what she described, and she should get to
reject it herself rather than have it dropped on her behalf.

## The decision she has to make

Put both on Wednesday, in this order:

1. **Case-level override** — recommended. She gets the outcome she wants (a
   director can act when a mission changes something) without the product losing
   the property that makes its checklists worth trusting.
2. **Agency-local forks** — what she literally asked for, with the costs above
   said plainly.

There is a third answer she may prefer once she sees the first two, and it costs
nothing to offer: **tell us and we will publish it.** `/agency/support` now
exists (#95, #105), so an agency can send BeOrchid the mission's page and a new
corridor version can be live the same day. If her real complaint is the latency
of a change rather than who makes it, that path is already built and the answer
is an SLA rather than a feature.

## If option 1 is chosen — build order

1. `application_overrides` table + migration; `AGENTS.md` deviations stand (the
   table goes in `public`, plural, existing local style).
2. `src/lib/domain/overrides.ts` — apply a set of overrides to a resolved
   checklist. Pure, and tested first: this is the function that decides what a
   traveller is asked for, and it must be provable without a database.
3. Read path: `checklist.ts` composes corridor requirements with the case's
   overrides. One place, so no screen can forget.
4. Write path: a director-only action from the case screen, reason required.
   Waiving a requirement **is destructive** under `AGENTS.md` — it removes
   something a traveller was asked for — so it routes through `ConfirmDialog`
   and the dialog says which document and who will see the reason. Adding one is
   not, and commits on the click.
5. Traveller surface: the attribution line, on the requirements screen and on
   the document row.
6. `audit_log` + `toplance.override_created` in `src/lib/analytics/events.ts`.

Not before Wednesday. She may pick option 2, in which case none of this is the
plan.
