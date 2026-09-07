# BeOrchid Staff Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A BeOrchid owner invites a colleague into the platform console from `/ops`, replacing the hand-written SQL that is the only way to mint staff today.

**Architecture:** Extend the existing `invitations` table with a `platform_staff` kind, a nullable `org_id` and a `staff_rank`, so one token format, one accept page and one expiry policy serve both invitations. A check constraint replaces the invariant the nullable column costs.

**Tech Stack:** Next.js App Router (see `node_modules/next/dist/docs/`), Drizzle ORM + Postgres, Clerk, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-beorchid-staff-invitations-design.md`

## Global Constraints

- Runs **after** the pricing plan; its migration is **0029**.
- Every user-facing string is `Record<Locale, string>` across all 10 locales.
- Reuse the existing `toplance.invitation_*` analytics events — no new names for the same lifecycle.
- Creation is gated on `requireStaffAction()` **and** `isOwner(actor)`. Both, at every action.
- `npx vitest run --maxWorkers=3` — this suite leaks fixtures under full parallelism.

---

### Task 1: Schema

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0029_*.sql` (generated)

- [ ] **Step 1:** Add `platform_staff` to `invitationKind`; drop `notNull` from `invitations.orgId`; add `staffRank: staffRole()`; add the `platform_invite_has_no_org` check and the partial index on `(status) where org_id is null`.
- [ ] **Step 2:** Rewrite the `invitationKind` doc comment — it currently says "one table carries both invitations an agency sends", which is about to be wrong.
- [ ] **Step 3:** `npm run db:generate && npm run db:migrate`. The `ALTER TYPE … ADD VALUE` is safe here because nothing in the same migration inserts a row using the new value.
- [ ] **Step 4: Commit** `feat(ops): make room on invitations for a platform staff invite`

---

### Task 2: The door

**Files:**
- Modify: `src/lib/domain/invitation-door.ts`
- Test: `src/lib/domain/invitation-door.test.ts`

**Interfaces:**
- Produces: `InvitationKind` widened to `"client" | "staff" | "platform_staff"`.

- [ ] **Step 1: Write the failing tests** — all nine cells:

```ts
it("lets a traveller accept a platform staff invitation", () => {
  expect(invitationDoor("traveler", "platform_staff")).toBe("accept");
});
it("refuses an agency member a platform staff invitation", () => {
  expect(invitationDoor("org_member", "platform_staff")).toBe("wrong-persona");
});
it("refuses staff every kind, including their own", () => {
  expect(invitationDoor("staff", "platform_staff")).toBe("wrong-persona");
});
```

- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Implement**, and extend the doc comment to say *why* an agency member is refused — a BeOrchid account holding an agency seat holds exactly the document reach the v1.3 tenancy removed.
- [ ] **Step 4: Run** — green.
- [ ] **Step 5: Commit** `feat(ops): decide who may accept a platform staff invitation`

---

### Task 3: The data layer

**Files:**
- Modify: `src/lib/data/invitations.ts`
- Test: `src/lib/data/invitations.test.ts`

**Interfaces:**
- Produces: `createInvitation(orgId: string | null, invitedBy: string, input: { …; kind?: InvitationKind; staffRank?: StaffRole })`; `listPlatformInvitations(): Promise<ListedInvitation[]>`; `resendablePlatformInvitation(id)`.

- [ ] **Step 1: Write the failing tests** — a platform invitation round-trips with a null org; the check constraint rejects all three malformed shapes; `getInvitationPreview` returns a platform row (the left-join regression); accepting flips `role` and `staff_role` together; accepting is a no-op against an account that is not `traveler`; a second pending invitation to the same address is refused; `listInvitations(orgId)` never returns a platform row.
- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Implement**, in this order — `createInvitation`'s `isNull(org_id)` duplicate check, `getInvitationPreview`'s `leftJoin` and nullable `orgName`, `listPlatformInvitations`, then `acceptInvitationTx`'s third branch. That branch is **one UPDATE** setting `role` and `staff_role` together, narrowed to `where role = 'traveler'` — two statements would trip `staff_role_only_for_staff`.
- [ ] **Step 4: Run** `npx vitest run src/lib/data/invitations.test.ts --maxWorkers=3` — green.
- [ ] **Step 5: Commit** `feat(ops): mint and accept a platform staff invitation`

---

### Task 4: The email

**Files:**
- Modify: `src/lib/notifications/templates.ts`
- Test: `src/lib/notifications/templates.test.ts`

- [ ] **Step 1: Write the failing test** — `platformInvitationEmail` names BeOrchid, links the invite, and says a second factor will be needed.
- [ ] **Step 2: Run and watch it fail.**
- [ ] **Step 3: Implement** beside `invitationEmail`, reusing `renderEmail`.
- [ ] **Step 4: Run** — green.
- [ ] **Step 5: Commit** `feat(ops): an invitation email written for a colleague, not a traveller`

---

### Task 5: Share the roster components

**Files:**
- Move: `src/components/agency/{invitation-roster,resend-invitation-button,revoke-invitation-button}.tsx` → `src/components/shared/`
- Modify: `src/app/[locale]/agency/team/page.tsx`, `src/app/[locale]/agency/clients/page.tsx`

- [ ] **Step 1: Move the three files** and take the server action as a prop rather than importing the agency one.
- [ ] **Step 2:** Take the toast text as props too. `RevokeInvitationButton` currently hardcodes `"Invitation revoked"` in every locale; this is the moment to pass it in. That changes what the agency console renders — deliberately.
- [ ] **Step 3: Run** typecheck and the suite — green, with both agency call sites updated.
- [ ] **Step 4: Commit** `refactor(invitations): share the roster between both consoles`

---

### Task 6: The ops screen

**Files:**
- Create: `src/app/[locale]/ops/staff/page.tsx`, `src/app/[locale]/ops/staff/actions.ts`, `src/components/ops/invite-staff.tsx`
- Modify: `src/components/ops/ops-nav.ts`, `src/components/ops/ops-nav.test.ts`, `src/lib/i18n/ops-common.ts`
- Create: `src/lib/i18n/ops-staff.ts`

- [ ] **Step 1: Write the failing nav test** — a third entry at `/ops/staff`, with the first two unmoved.
- [ ] **Step 2: Run and watch it fail.**
- [ ] **Step 3: Add the nav entry** to `opsNav` and `localizedOpsNav`.
- [ ] **Step 4: Write the three actions** — `invitePlatformStaff`, `resendPlatformInvitation`, `revokePlatformInvitation`. Each opens `requireStaffAction()` then `isOwner(actor)`, exactly as `approveCorridor` does. Each writes `audit(actor.userId, "staff.invited" | "staff.invite_revoked", "invitation", id)`. The token is sent, never returned.
- [ ] **Step 5: Build the page** — owner-only, `redirect("/ops/corridors")` for anyone else, form plus the shared roster.
- [ ] **Step 6: Every string, 10 locales.**
- [ ] **Step 7: Run** typecheck + suite — green.
- [ ] **Step 8: Commit** `feat(ops): invite a BeOrchid colleague from the platform console`

---

### Task 7: The accept page branch

**Files:**
- Modify: `src/app/[locale]/invite/[token]/page.tsx`, `src/lib/i18n/invite.ts`
- Create: `e2e/platform-staff-invite.spec.ts`

- [ ] **Step 1:** `InvitationSummary` branches on a null `orgName`: "BeOrchid has invited you to the platform console", plus a line saying the account will need a second factor — better said here than discovered at the wall.
- [ ] **Step 2: All strings, 10 locales.**
- [ ] **Step 3: Write the e2e spec** — an owner invites, the roster shows pending, the link opens, and the signed-up invitee lands on the second-factor wall rather than inside `/ops`.
- [ ] **Step 4: Run** `npx playwright test e2e/platform-staff-invite.spec.ts`.
- [ ] **Step 5: Commit** `feat(ops): tell an invited colleague who invited them`
