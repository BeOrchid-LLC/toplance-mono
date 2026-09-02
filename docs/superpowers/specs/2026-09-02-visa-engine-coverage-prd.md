# Toplance — Visa Requirements Engine (Phase 3) PRD

| | |
|---|---|
| **Project** | Toplance Visa Requirements Engine — coverage build-out |
| **Client** | BeOrchid (authoritative spec: Felix's six-phase brief, Phase 3) |
| **Owner** | Ali (Mukhammadali Toshpulatov) |
| **Date** | 2026-09-02 |
| **Status** | Draft → In Review → Approved |
| **Scope** | Phase 3 only. Phases 1, 2, 4, 5 and 6 are built and out of scope. |

---

## 1. Executive summary

Toplance resolves a traveller's nationality, destination and travel purpose into a
document checklist sourced from the mission that will actually assess their
application. Today the engine serves four corridors; the launch requirement is a
minimum of 50 destination countries.

This document specifies how that coverage is reached: **tourism is served by a
licensed data provider**, and **work, study, medical and relocation are served by
curated corridors** drafted from official sources and approved in-app by a
BeOrchid super admin before any traveller sees them.

The engine's existing guarantee does not change — a corridor with no data shows an
honest gap screen rather than an invented checklist.

## 2. Goals and success metrics

| Goal | Measure |
|---|---|
| Meet the launch coverage requirement | ≥ 50 destination countries resolvable |
| Serve non-tourism travel | 15 curated corridors live and approved |
| Every requirement is traceable | 100% of live corridors carry a source URL |
| Nothing unreviewed reaches a traveller | 100% of live corridors carry an approver and approval date |
| Staleness is visible, not silent | Every corridor displays a "last checked" date |
| No invented requirements | 0 corridors live without an approving super admin |

## 3. User personas

**Traveller** — sponsored by an organisation. Needs to know exactly which documents
to produce, and to trust that the list reflects what the mission currently asks for.

**BeOrchid super admin (`staffRole: "owner"`)** — reviews drafted corridors against
their sources and approves or rejects them. Accountable for accuracy.

**BeOrchid reviewer (`staffRole: "reviewer"`)** — reviews traveller documents and
cases. May view corridor drafts; may not approve them.

## 4. User stories

**Traveller**
- As a traveller, I want a checklist built from my nationality, destination and
  purpose, so I only gather documents that apply to me.
- As a traveller, I want to see where each requirement came from and when it was
  last checked, so I can judge whether to trust it.
- As a traveller on an uncovered corridor, I want to be told plainly that we do not
  serve it yet, rather than shown a list that might be wrong.
- As a traveller mid-application, I want to be told when my checklist changes,
  rather than finding new items silently added.

**Super admin**
- As a super admin, I want to see every corridor with its coverage, version and last
  checked date, so I know what is live and what is ageing.
- As a super admin, I want to review a drafted corridor side by side with its
  sources before approving it.
- As a super admin, I want to see what changed between the live version and a new
  draft, so I can approve a revision without re-reading the whole list.
- As a super admin, I want to reject a draft with a reason, so it does not reach a
  traveller.

## 5. Functional requirements

### 5.1 Tourism coverage via data provider

- [ ] A new provider implements the existing `VisaDataProvider` interface with
      `canLead: true`, serving `purpose = tourism` only.
- [ ] Responses are cached; a background warming job populates corridors ahead of
      demand rather than fetching while a traveller waits.
- [ ] The provider returns `null` for uncovered pairs; it never throws a traveller
      to an error page.
- [ ] Provider responses render with the vendor named as source, plus any
      attribution their licence requires.
- [ ] The curated provider retains precedence: a curated corridor always wins over
      a provider answer for the same triple.
- **Acceptance:** a tourism corridor for a destination with no curated row returns a
  sourced checklist with upload slots.

### 5.2 Curated coverage for non-tourism purposes

- [ ] 15 corridors across `work`, `study`, `medical` and `relocation`, drafted from
      VFS Global published checklists and the mission's own pages.
- [ ] Every requirement carries a name, description, category, required flag and a
      source URL.
- [ ] Corridor-level fee and processing time are cited to the page that stated them.
- **Acceptance:** each of the 15 corridors is live, approved, and every requirement
  row resolves to a working source link.

### 5.3 Draft and approval flow

- [ ] A drafted corridor is created as a new `version` with `is_live = false`. It is
      invisible to travellers until approved — the existing resolver requires
      `is_live = true` and takes the highest version, so no engine change is needed.
- [ ] Approval is restricted to `staffRole = "owner"`. Reviewers may view, not approve.
- [ ] Approving stamps approver, approval timestamp and last-verified date, and sets
      `is_live = true`, superseding the prior version atomically.
- [ ] Rejecting records a reason and leaves the draft not live.
- [ ] Every approval and rejection writes an `audit_log` entry.
- [ ] The review screen shows a field-level diff against the current live version
      when one exists, and the full list when it does not.
- **Acceptance:** a drafted corridor cannot be served to a traveller until an owner
  approves it, and the approval is attributable in the audit log.

### 5.4 Freshness and re-verification

- [ ] Every live corridor carries a last-checked date, displayed to travellers.
- [ ] A scheduled job re-reads each corridor's source and flags drift for
      re-approval. Detected drift never auto-writes to a live corridor.
- [ ] Past an agreed staleness window a corridor displays a staleness notice; past a
      hard limit it drops out of `is_live` and falls to the gap screen.
- [ ] Document rejections recorded in case review can be raised as evidence that a
      checklist is wrong.
- **Acceptance:** a corridor whose source changes produces a review item, not a
  silent update; a corridor nobody has checked degrades to the gap screen rather
  than serving stale figures.

### 5.5 Traveller-facing changes

- [ ] The requirements screen shows the last-checked date alongside the source.
- [ ] Each requirement links to its own source where one exists.
- [ ] When a corridor revision changes a traveller's live checklist, they receive a
      notification; uploaded documents are never destroyed.
- **Acceptance:** a traveller can see when their checklist was last verified and is
  told when it changes.

## 6. Non-functional requirements

- **Accuracy over coverage.** An uncovered corridor is acceptable; a wrong checklist
  is not. Every ambiguity resolves to the gap screen.
- **Attribution.** No requirement is displayed without a citable source.
- **Auditability.** Every corridor that reaches a traveller has a named approver and
  timestamp.
- **Cost control.** Provider quota is protected by caching and warming; a traveller
  page view must not spend a metered request.
- **Availability.** A provider outage must not break a screen the curated table can
  already serve.
- **Security.** Approval actions require staff authentication with 2FA, consistent
  with the existing ops console.
- **Responsive** on web and mobile browser, consistent with the existing app.

## 7. Data model overview

Additive only — no renames, no schema moves. BeOrchid platform conventions are
unaffected.

| Table | Change |
|---|---|
| `corridors` | add `last_verified_at`, `approved_by`, `approved_at`, `review_state` |
| `corridor_requirements` | add `source_url` |
| `audit_log` | new actions: `corridor.approved`, `corridor.rejected` |

`version`, `effective_from` and `is_live` already exist and carry the draft/approve
lifecycle without modification.

**Analytics events** (added to `src/lib/analytics/events.ts`, per the platform
naming convention): `toplance.corridor_drafted`, `toplance.corridor_approved`,
`toplance.corridor_rejected`, `toplance.corridor_drift_detected`.

## 8. Integrations

| Service | Role | Notes |
|---|---|---|
| Tourism data provider | Checklists for `purpose = tourism` across 50+ destinations | Caching rights must be confirmed in writing before reliance |
| Travel Buddy | Entry rules — allowed stay, passport validity, embassy and eVisa links | Already integrated, contributor only, never leads |
| VFS Global (published checklists) | Primary source for curated non-tourism corridors | Reference material, not an API |
| Mission / embassy pages | Fees, processing times, official links | Reference material |
| OpenAI | Drafting and drift detection only — never publishes | Already in the stack |

## 9. Out of scope

- Phases 1, 2, 4, 5, 6 of Felix's spec — already built
- Changes to automated document verification (`precheck.ts`)
- Additional visa-data vendors
- Database schema convention migration (`toplance.*`, `core.users`) — platform team
- Any corridor going live without super admin approval

## 10. Assumptions

Proceeding on these pending client confirmation. Each one changes the plan if wrong.

1. "Minimum 50 destination countries" is satisfied by destination coverage, not by
   50 × every travel purpose.
2. Tourism coverage counts toward that requirement.
3. The tourism provider's terms permit caching and display to end users.
4. Automated extraction into a draft, approved by a super admin before display,
   satisfies the client's "don't invent requirements with the AI" instruction.
5. Non-tourism coverage of 15 corridors is sufficient for launch.
6. Corridors may go live progressively as approved, rather than all at once.

## 11. Open questions

1. Which 15 non-tourism corridors, as nationality → destination → purpose?
2. What approval turnaround can the super admin commit to? This is on the critical
   path for the two-week window.
3. What staleness window before a corridor is pulled — proposed 90 days for work and
   relocation, 180 for study?
4. Who owns and pays for the tourism data subscription?
5. Who maintains corridor accuracy after launch?

## 12. Approvals

- [ ] Client sign-off — BeOrchid
- [ ] Technical confirmation — Ali
