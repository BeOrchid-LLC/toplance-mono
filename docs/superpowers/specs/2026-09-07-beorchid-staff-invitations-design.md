# BeOrchid staff invitations

**Date:** 2026-09-07
**Status:** design, approved in chat — awaiting spec review
**Scope:** an owner-only invitation form in `/ops` that mints a new BeOrchid
platform staff account.

## The gap

Nothing in the product writes `profiles.staff_role`. BeOrchid staff exist
because somebody ran SQL. `/ops` has route curation and tenant management and
no way to bring in a colleague, while `/agency/team` has had a working staff
invitation since the v1.3 tenancy.

This adds the missing half, deliberately not by generalising the agency one:
the two invitations grant different things, are sent by different people, and
one of them is a privilege escalation into the console that curates every
traveller's checklist.

## Decisions taken

| Question | Answer |
|---|---|
| Who is invited | A person with no Toplance account. The link runs sign-up → accept. Promoting an existing traveller or agency account is **out of scope** |
| Who may send | `staff_role = 'owner'` only, checked by `isOwner` behind `requireStaffAction` |
| Which rank may be granted | Either — `reviewer` or `owner`, chosen by the sender and stored on the invitation row |
| Data model | Extend `invitations`; no second table |

### The rank divergence, on purpose

`acceptInvitationTx` hard-codes `reviewer` for an agency staff invite, and says
why: "an invitation cannot mint someone with the authority to bill and to
invite." A platform invitation may mint an owner, so it breaks that rule
knowingly.

What contains it: the rank is written by the sender into the locked invitation
row, never chosen by the person accepting; only an existing owner can send one;
and the account still cannot open `/ops` until `decideStaffGate` sees a second
factor enrolled. The escalation is therefore owner → owner, recorded in the
audit log, and never self-service.

## Schema

One migration (`npm run db:generate`, expected `0027_*`), all in
`src/lib/db/schema.ts`:

1. `invitation_kind` gains `platform_staff`. The value is only added here, never
   inserted in the same migration, so the `ALTER TYPE ... ADD VALUE`
   in-transaction restriction is not hit.
2. `invitations.org_id` becomes nullable. It stays a cascading FK; null now
   means "this invitation belongs to the platform, not to a tenant". The
   `invitationKind` doc comment is rewritten to say so.
3. `invitations.staff_rank staff_role` — nullable, set only on
   `platform_staff` rows.
4. A check constraint, `platform_invite_has_no_org`, asserting the three shapes
   agree: `kind = 'platform_staff'` implies `org_id is null and staff_rank is
   not null`, and any other kind implies `org_id is not null and staff_rank is
   null`. The nullable FK loses an invariant; this one replaces it, in the same
   spirit as the existing `staff_role_only_for_staff` on `profiles`.
5. `invitations_platform_idx` on `(status)` where `org_id is null`, for the ops
   roster read. The table is small today, but a missing index on a
   foreign-key-shaped read has already cost this suite 450 seconds once.

`invitations_org_idx` is untouched: `eq(org_id, …)` never matches null, so no
platform invitation can surface in any tenant's roster.

## Data layer — `src/lib/data/invitations.ts`

- `createInvitation` gains an org-less path. `orgId: string | null`, `kind`
  widened, and a `staffRank` input. The pending-duplicate check becomes
  `isNull(org_id)` when the org is null — an equality test against null would
  never match, so without this a second invitation to the same address would be
  minted silently.
- `getInvitationPreview`'s `innerJoin(organisations)` becomes a `leftJoin`, and
  `orgName` becomes `string | null`. This is the change that would otherwise
  make a platform token read as "not valid at all".
- `listPlatformInvitations()` — the ops roster, `where isNull(org_id)`, ordered
  newest first, selecting every column except `token`, exactly as
  `listInvitations` does.
- `acceptInvitationTx` gains a third branch. All the shared work stays where it
  is: the row lock, the revoked/accepted/expired ladder, the expiry flip and
  the email match against the profile. The new branch does one update, both
  columns at once — `role = 'staff'`, `staff_role = invitation.staff_rank`,
  narrowed to `where role = 'traveler'`. One statement because
  `staff_role_only_for_staff` would reject the intermediate state of two.
  `resendableInvitation` and the revoke path get an org-less variant of their
  scope check.
- `provisionInvitedProfile` is unchanged. A new colleague is provisioned
  `traveler` and flipped on accept, the same two steps an agency colleague
  takes.

## Authorisation — `src/lib/domain/invitation-door.ts`

`InvitationKind` gains `platform_staff`, and `invitationDoor` gains its row:

| Signed in as | `client` | `staff` | `platform_staff` |
|---|---|---|---|
| `traveler` | accept | accept | **accept** |
| `org_member` | wrong-persona | accept | **wrong-persona** |
| `staff` | wrong-persona | wrong-persona | **wrong-persona** |

An agency member may not become platform staff by link. That is the v1.3
boundary — a BeOrchid account holding an agency seat holds exactly the document
access the tenancy correction removed — and it is the reason the "existing
account" option was declined up front. An account already staff has nothing to
accept.

## Server actions — `src/app/[locale]/ops/staff/actions.ts`

Three, each opening with `requireStaffAction()` then `isOwner(actor)`, matching
`approveCorridor` exactly. These are POST endpoints with public ids; the page
gate is not their gate.

- `invitePlatformStaff` — email, optional full name, rank. Creates the row,
  sends `platformInvitationEmail`, returns `{ ok, delivered }`. The token is
  built into a URL, sent, and deliberately not returned: it is a 30-day bearer
  credential to the platform console.
- `resendPlatformInvitation` — same token, same address, for a mail that
  silently failed.
- `revokePlatformInvitation`.

Each writes `audit(actor.userId, "staff.invited" | "staff.invite_revoked",
"invitation", id)`. Analytics reuses the existing four
`toplance.invitation_*` events with `{ kind: "platform_staff", rank }` and no
`orgId` — same lifecycle, so no new names in the union. `audit()` takes a
free-form action string, so `staff.invited` needs no registration anywhere.

## Screens

`/ops/staff`, a third nav entry after Routes and Agencies. `opsNav` and
`localizedOpsNav` grow one item; `ops-nav.test.ts` asserts position, so the
entry goes third and the existing two assertions stay true. The tab renders
only for an owner, and the page `redirect("/ops/corridors")` for anyone else —
the same pairing `/agency/team` uses, where the hidden link is never the guard.

The page shows a form (email, full name, rank) and the pending roster with
resend and revoke. `InvitationRoster`, `ResendInvitationButton` and
`RevokeInvitationButton` live under `components/agency/` and are bound to the
agency actions; they move to `components/shared/` and take their actions as
props. That is the one refactor in this design, and it is the alternative to a
second copy of a roster that already renders exactly these rows.

The accept page needs one branch: `InvitationSummary` is written around
`preview.orgName`, which is now null for a platform invitation. It reads
"BeOrchid has invited you to the platform console" instead, and says the
account will need a second factor before the console opens — better said on the
invitation than discovered at the wall.

## Email

`platformInvitationEmail` in `templates.ts`, beside `invitationEmail`. Separate
because the existing copy says "start a visa application sponsored by …",
which is the wrong sentence in every clause for this reader.

## i18n

Ten locales, and `Record<Locale, string>` makes a missing one a compile error.
New strings: the nav label, the page and form copy, the rank labels, the
roster's empty state, the accept-page branch and the action errors. Translated
in-house like the rest, and carrying the same NEEDS NATIVE REVIEW status as
everything added since 2026-09-05.

## Testing

Unit, pure, no database:
- `invitation-door.test.ts` — the full nine-cell table above, especially
  `org_member` × `platform_staff` refusing.
- `policy.test.ts` — `isOwner` already covered; assert the action gate composes
  `requireStaffAction` with it.
- `ops-nav.test.ts` — third entry, first two unmoved.

Against the local database (`src/lib/data/invitations.test.ts`):
- A platform invitation with a null org round-trips, and the check constraint
  rejects all three malformed shapes.
- `getInvitationPreview` returns a platform row — the left-join regression, the
  one most likely to be reintroduced.
- Accept flips `role` and `staff_role` together, and is a no-op against an
  account that is not `traveler`.
- A second pending invitation to the same address is refused.
- `listInvitations(orgId)` never returns a platform row.

Fixtures are `@test.invalid` and cleaned up; run with `--maxWorkers=3`, since
this suite leaks fixtures under parallel load.

End to end: an owner invites, the roster shows pending, the link opens, and a
signed-up invitee is bounced to the second-factor wall rather than into `/ops`.

## Out of scope

Promoting an existing account; demoting or removing staff (revoking an
invitation is not removing a colleague, and the console has no way to do the
latter — it stays a SQL job); a BeOrchid roster screen listing current staff;
any rate-card or billing work.

## Risks

- **`org_id` stops being an invariant.** The check constraint carries it
  instead. Every existing read is org-scoped by equality and therefore already
  excludes platform rows; the audit is to confirm that, not to assume it.
- **The escalation path is new.** It is owner-only at both ends, email-matched
  under a row lock, audited, and still behind the second-factor gate.
- **The roster buttons hardcode English toasts.** `RevokeInvitationButton`
  says "Invitation revoked" in every locale today. Moving them to
  `components/shared/` is the moment to pass that text in, and doing so changes
  what the agency console renders — a small, deliberate fix carried along with
  the move, not a silent one.
