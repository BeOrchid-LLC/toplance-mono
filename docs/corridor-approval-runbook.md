# Corridor approval runbook

The queue holds drafted corridors that no traveller can see. This is how they
become live, in order, with the two steps that are easy to miss called out.

Written 2026-09-03, when 50 drafts were waiting.

---

## Before the first approval

**1. There must be an owner.** Approval is restricted to `staffRole = "owner"`;
a reviewer may read a draft and not publish it. There is deliberately no UI for
granting it, so after the account has signed up once:

```sql
update profiles set role = 'staff', staff_role = 'owner' where email = 'you@example.com';
```

**2. That owner needs an authenticator app.** `requireStaffConsole` refuses
`/ops/*` until `currentUser().twoFactorEnabled` is true. Enrol from the Account
Portal linked on the blocker screen. Clerk must have TOTP and backup codes turned
on for *that instance* — the setting does not carry over from development.

---

## Approving

Work at `/ops/corridors`. The list shows every version; the detail screen shows a
field-level diff against the current live version, or the full list where there
is none.

Approve in descending richness — the corridors with the most requirements come
from the best-scoring sources, so they are the fastest to check and the most
valuable to publish. Poland, Singapore, South Africa and Kenya carry full
six-purpose sets.

**The check that matters is not the diff, it is the source.** Open the corridor's
`source_url` and read the draft against it. Approving stamps you as the approver
and sets `last_verified_at`; that is a claim that a person read the page.

### Three drafts carry a foreign-jurisdiction row — check these first

The drafting script flags any requirement naming a country that is neither the
passport nor the destination, because that usually means the source was another
jurisdiction's variant of the same checklist. It warns and still writes the
draft: the row may be legitimate, and a reviewer is better placed to judge than a
word list. Audited across all 50 drafts on 2026-09-03; these are what is left
after one confirmed contamination was re-sourced.

| Draft | Row | Likely verdict |
|---|---|---|
| `ng→dk/study` | Biometric features · One passport photo — both conditioned on applying at a **Norwegian** mission | Probably legitimate. Denmark is represented by Norway in some countries; confirm that holds for Nigeria. |
| `ng→dk/work` | One passport photo, same Norwegian-mission condition | As above. |
| `ng→jp/study` | Pre-Entry **Tuberculosis** Screening, tagged `china` | Probably wrong. Japan's pre-entry TB screening applies to a named list of countries; check whether Nigeria is on it before keeping the row. |

**Already fixed:** `ng→pl/work` was drafted from a gov.pl attachment of unconfirmed
jurisdiction and produced an India-specific "Travel Medical Insurance" row — the
same contamination that forced an earlier Poland draft to be discarded. It has
been re-sourced from the Nigeria-specific page `gov.pl/web/nigeria-en/...`, the
one Poland's study corridor already used, and now carries 21 requirements with no
foreign-jurisdiction rows.

### Two drafts need a decision, not just a read

- **`ng→gb/work` v2** is the fee correction. The live v1 says £719; gov.uk says
  £819. Take this one early.
- **`ng→ca/study` v2** improves the document list (the official IMM5820E
  checklist, rather than a generic landing page) but its **fee is blank**, where
  v1 correctly held CAD $150 — the PDF does not state a fee. Carry the figure
  forward before approving. Do not publish the empty fee.

---

## After each batch — the step that is easy to miss

Approving updates the database. It does **not** update the site.

`LIVE_CORRIDORS` in `src/lib/domain/corridors.ts` is a hardcoded array, and it is
what every surface a person reads means by "live": the hero bar's Live / In build
state, the departure board, the counted figure on `/` and `/travellers`, and
`corridor-gap.ts`'s "we cover X, but not for Y yet". Approve fifty corridors and
the site still advertises four — they are live and unreachable, because the bar
still offers "Request this corridor" instead of sending anyone to intake.

So, after every batch:

```bash
npm run corridors:export
```

That regenerates two files from the database: `src/lib/db/corridors.live.json`,
the manifest `corridors.test.ts` asserts `LIVE_CORRIDORS` against, and
`src/lib/db/corridors.sql`, which ships the corridors themselves with the deploy
so staging and production do not have to re-approve anything.

Then paste the manifest's contents into `LIVE_CORRIDORS` and commit both together.
`npm test` is the check: a mismatch fails
*"matches the corridors the database actually serves live"*.

That assertion exists because of a real incident, and its comment says so: it used
to parse `seed.sql` with a regex, which stopped telling the truth once corridors
were drafted and approved rather than hand-written — China lived in the database,
appeared in no seed file, and the assertion passed while the board said "Soon" for
a corridor we served. A generated manifest cannot silently match nothing.

> **Why the array is still hand-updated.** It is what the site claims; the table is
> what the engine serves. Collapsing them means deriving the array from the
> database at runtime, and the marketing page's client components cannot do that
> without being handed the set from a server component. Until then the export is
> the seam, and it is one command.

---

## What approving cannot fix

- **`ng→de/work`** is live on a source with no enumerated checklist. The real one
  sits on VFS Global, which returns 403 to automated requests. It needs a person
  reading VFS, which is what "reference material, not an API" always meant.
- **`ng→ae/work`** is live on `u.ae`, which does not answer at all — the whole
  `.gov.ae` estate TCP-times-out from our networks. It is the permanent
  `"failed": 1` in `/api/cron/corridor-recheck`. Retry from a different network
  before concluding the pages are gone.
- **Fifty destinations.** Approving everything reaches eighteen. The rest come
  from the licensed tourism provider, and `VISALIST_API_KEY` is unset.

Beware the shape of the Germany problem, because the drift job cannot see it: a
baseline hash proves a *page* has not changed, never that the page was the right
page.
