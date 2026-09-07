# Book a Demo — design

**Date:** 2026-09-07
**Branch:** `feat/book-a-demo-form`
**Status:** approved in brainstorming; implementation plan to follow

## The problem

The agency landing page's secondary call to action is a `mailto:` link:

```tsx
// src/app/(site)/page.tsx:347
<a href={`mailto:${DEMO_EMAIL}?subject=Toplance%20demo`}>
  {SITE_HOME.heroCtaBookDemo[locale]}
</a>
```

`DEMO_EMAIL` is `hello@toplance.com`, and the comment above it
(`src/app/(site)/page.tsx:88-95`) says plainly that the address is a guess the
client has to confirm before the page is public. So the only conversion point
on the only page with no session behind it is a mail client handoff to an
address that may not exist.

A `mailto:` also collects nothing. Whoever picks the mail up gets whatever the
sender chose to type, in whatever order, and there is no record of the request
anywhere in the product.

## What is being built

A "Book a demo" dialog on the landing page collecting five required fields,
writing a row to a new `demo_requests` table, and notifying an internal inbox
by email.

Five fields, all required, exactly as specified:

1. Full name
2. Work email
3. Agency / Company name
4. Job title / Role
5. Preferred demo date & time

## Decisions taken

### Placement: a dialog, not a route

The form opens in a `Dialog` on the landing page rather than at a `/demo` URL.
The visitor never leaves the page they are being persuaded by, and the existing
`src/components/ui/dialog.tsx` primitive already carries the focus trap and the
escape handling.

The cost, accepted: there is no shareable URL for sales to paste into an email
or an ad. If that turns out to be wanted, the same client component can be
mounted on a route later without changing the action or the table.

The landing page stays `force-static` with its five-minute `revalidate`. A
client island does not change a page's rendering mode; the dialog's JavaScript
joins the sticky nav, the corridor state, the FAQ accordion and the theme
switch that are already there.

### Date and time: an instant plus the zone it was named in

The audience spans Lagos, Accra, Nairobi, Johannesburg and Douala. A wall-clock
string with no zone attached is a booking nobody can act on without asking a
follow-up question.

So the field is a native `<input type="datetime-local">` beside an explicit
timezone `<select>`, defaulted from
`Intl.DateTimeFormat().resolvedOptions().timeZone` and populated from
`Intl.supportedValuesOf("timeZone")`. Both are platform APIs — no new
dependency, and no curated shortlist that could omit the visitor's own zone.

The pair is stored as a `timestamptz` (`preferred_at`, the unambiguous instant)
plus the IANA zone name (`preferred_tz`). The instant sorts and compares; the
zone is what lets the sales email say "Tue 14:00 WAT" rather than a UTC number
the reader has to convert.

Defaulting the zone silently from the browser was rejected: a visitor on a VPN,
or travelling, cannot correct a value they are never shown.

### Storage: a row first, then the email

`sendEmail` never throws by design
(`src/lib/notifications/email.ts:8`) — no email is worth failing the user
action that triggered it. That property is right, and it is exactly why an
email-only design would drop leads silently during a Resend outage.

The row is written first and is the record. The email is a notification about
the row, sent afterwards, and its failure is invisible to the submitter by
design.

### No `status` column

`demo_requests` has no status, stage or owner column. There is no ops surface
in this scope that could change one, so any value it held would be a
permanent `new`. Adding the column later is one migration, and adding it now
is a field that lies.

### "Work email" does not reject free-mail domains

The label sets the expectation; validation only checks that the address is
well-formed. A one-person agency in Lagos genuinely runs its business on
Gmail, and rejecting the address loses a real lead to catch some noise.

### Spam defence: a honeypot and a 24-hour duplicate guard

This is the codebase's first public, unauthenticated write. There is no
rate-limiting helper anywhere in `src/lib/security/` — it holds `headers.ts`
and nothing else.

Two cheap measures, both in the action:

- A hidden field that a human never fills and a naive bot fills every time. A
  non-empty value returns the same success result the submitter would have
  seen, and writes nothing.
- A rejection when the same email address has already submitted within 24
  hours, which also stops a double-click producing two rows.

Neither stops a determined attacker. Anything that would — IP throttling, a
captcha, a proof-of-work challenge — is a larger piece of work than this form,
and is out of scope here.

### Only sales is emailed

The submitter's confirmation is the dialog swapping to a short "we have this,
someone will reply" sheet, following `InviteDialog`'s sent-sheet pattern. A
confirmation email to the submitter would be a second template needing all ten
locales; it is deliberately deferred, not forgotten.

## Components

### 1. Schema — `src/lib/db/schema.ts`

A new table, following the conventions the neighbouring tables already use
(plural, snake_case, `uuid().primaryKey().defaultRandom()`, `timestamp({
withTimezone: true })`):

```ts
export const demoRequests = pgTable("demo_requests", {
  id: uuid().primaryKey().defaultRandom(),
  fullName: text().notNull(),
  email: text().notNull(),
  companyName: text().notNull(),
  jobTitle: text().notNull(),
  preferredAt: timestamp({ withTimezone: true }).notNull(),
  preferredTz: text().notNull(),
  locale: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
```

`locale` records which language the form was read in. It costs nothing to
store and tells whoever runs the demo what language to run it in.

The table lands in `public` like every other table here, per the known
deviation recorded in `AGENTS.md` — the schema move to `toplance.*` is BeOrchid
Core work and is not to be done unilaterally.

Migration generated with `npm run db:generate`, landing as `drizzle/0016_*.sql`.

### 2. Server action — `src/app/(site)/actions.ts` (new file)

```ts
export async function requestDemo(
  formData: FormData
): Promise<{ ok: true } | { error: string }>
```

The `(site)` route group has no actions file yet; this is the first, and the
first write on a surface with no session. It therefore calls neither
`requireActor()` nor `requireOrgAccess()` — the two guards every other action
in this codebase opens with. That absence is the security-relevant fact about
this file and is commented as such at the top, so a later reader does not take
it for an oversight and copy it.

Order of operations:

1. Read the honeypot. Non-empty → return `{ ok: true }` without writing.
2. Trim and validate the five fields. Any blank → `{ error }`. Malformed email
   → `{ error }`. Unparseable or unknown timezone → `{ error }`.
3. Resolve the local wall-clock string and the IANA zone into a UTC instant.
4. Reject a second submission from the same email inside 24 hours.
5. Insert the row.
6. `track("toplance.demo_requested", { locale })` — no `userId`, there is none.
7. `sendEmail` to the internal inbox.

Steps 6 and 7 both swallow their own failures, so neither can cost a lead.

### 3. Analytics — `src/lib/analytics/events.ts`

Add `"toplance.demo_requested"` to the union. Per the platform convention in
`AGENTS.md` the name is `app.object_action`, all lowercase, and
`events.test.ts` asserts the format. A name not in the union is a compile
error, which is why this is an edit to the type rather than a string at the
call site.

### 4. Email template — `src/lib/notifications/templates.ts`

A `demoRequestEmail({ fullName, email, companyName, jobTitle, preferredAt,
preferredTz, locale })` returning `EmailContent`, built with the shared
`renderEmail` helper like every other template in the file. The preferred time
is formatted in `preferredTz` so the reader sees the hour the submitter meant.

This is the first template addressed to staff rather than to a traveller or an
agency, so it takes no `cta` — there is no page to send the reader to.

### 5. Recipient — `DEMO_INBOX_EMAIL`

A new environment variable, documented in `.env.local.example` alongside
`RESEND_API_KEY` and `EMAIL_FROM`. Unset, the action logs and skips the send,
matching how `sendEmail` behaves with no API key and keeping local development
free of configuration. The row is still written either way.

### 6. Dialog — `src/components/site/demo-dialog.tsx` (new file)

A client component modelled directly on
`src/components/employer/invite-dialog.tsx`: `Dialog` + `DialogTrigger` +
`Input`/`Label`, `useT()` for copy, `React.useTransition()` for the pending
state, `sonner` for the error toast, and the form swapped for a confirmation
sheet on success. State resets on close so a reopen never flashes the previous
submission.

The active locale comes from `useLocale()` and rides along in a hidden field,
which is what fills the `locale` column.

`useT()` works here because `LocaleProvider` is mounted above the `(site)` group — the root layout renders
`<Providers>` (`src/app/layout.tsx:96`), which wraps its children in it
(`src/components/providers.tsx:22`).

### 7. Landing page — `src/app/(site)/page.tsx`

The `<a href={mailto}>` at line 347 becomes `<DemoDialog />`. The `DEMO_EMAIL`
constant and its placeholder comment (lines 88-96) are deleted — the open
question they record is answered by the form existing.

`SITE_HOME.heroCtaBookDemo` is unchanged and becomes the dialog trigger's
label.

### 8. Translation — `src/lib/i18n/demo-dialog.ts` (new file)

Every string the dialog renders, as `Record<Locale, string>` across all ten
locales in `LOCALES`. A missing locale is a compile error by design
(`src/lib/i18n/locales.ts:12-15`): a language in the menu that silently falls
back to English is worse than one not offered, because the reader has already
said they cannot read English.

Strings: the dialog title and description, five field labels, the timezone
label, the submit button in both its resting and pending states, the
confirmation sheet's heading and body, and each validation message.

The field labels are the client's wording — "Work email", "Agency / Company
name", "Job title / Role" — in English, translated in-house for the other
nine. The file carries the same NEEDS NATIVE REVIEW note as its neighbours.

Server-returned errors from `requestDemo` stay in English, exactly as
`INVITE_DIALOG` documents for `inviteTraveller`. Translating action errors is
a separate piece of work across every action in the codebase, not something to
start unilaterally in this one.

## Error handling

| Case | Behaviour |
|---|---|
| Any required field blank | `{ error }`, shown as a toast; the dialog stays open with its values |
| Malformed email | `{ error }`; nothing written |
| Unknown or unparseable timezone | `{ error }`; nothing written |
| Honeypot filled | `{ ok: true }`, nothing written — a bot learns nothing from the response |
| Same email within 24h | `{ error }` naming the earlier request; nothing written |
| Insert fails | `{ error }`; the submitter is told, and can retry |
| `track` fails | Swallowed and logged; the row stands |
| `sendEmail` fails or is unconfigured | Swallowed and logged; the row stands |

The last two are the reason the row is written before either is attempted.

## Testing

Vitest, colocated as `src/app/(site)/actions.test.ts`, matching how
`notify.test.ts` guards its database-touching cases with
`describe.skipIf(!process.env.DATABASE_URL)`.

Pure validation and time resolution do not need a database and are tested
unconditionally:

- Each of the five fields, blank, is rejected — five cases.
- A malformed email is rejected.
- A wall-clock time in `Africa/Lagos` resolves to the correct UTC instant
  (WAT is UTC+1 with no daylight saving, so this is a stable assertion).
- A wall-clock time in a zone that *does* observe daylight saving resolves
  correctly on both sides of a transition.
- An unknown timezone string is rejected.
- A filled honeypot returns `{ ok: true }` and writes nothing.

Database-dependent, skipped without `DATABASE_URL`:

- A valid submission writes exactly one row with the expected values.
- A second submission from the same email within 24 hours is rejected and
  leaves the row count unchanged.

The time-resolution cases are the ones worth writing first. Everything else is
a blank-field check; converting a local wall clock into an instant is the only
part of this feature where a plausible implementation can be quietly wrong.

## Out of scope

Named so they are deferred rather than forgotten:

- An `/ops` list of demo requests. Nothing in the product reads this table yet;
  the email is the read path.
- A confirmation email to the submitter.
- A calendar integration or real availability. The field is a stated
  preference, not a booking — sales replies to agree a time.
- Rate limiting beyond the honeypot and the duplicate guard.
- A `/demo` route.
- Native review of the nine non-English translations, which is a launch-wide
  task this file joins rather than starts.
