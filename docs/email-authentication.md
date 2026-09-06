# SPF, DKIM and DMARC on the sending domain

Written 2026-09-06. Nothing in this file is code — it is three DNS
records somebody with access to the domain has to add, and this is what
they are and why.

Check the current state with:

```
npm run email:verify
```

It reads the domain out of `EMAIL_FROM`, so it checks the address the
product actually sends from rather than one written down here. As of
writing, all three are missing.

---

## Why this is not cosmetic

Every email Toplance sends is transactional and consequential: an
invitation somebody has to accept before they can start, a document sent
back nine days before an embassy appointment, a visa-expiry reminder.
Without these records, receivers treat the mail as unauthenticated —
Gmail and Outlook put it in spam, and some drop it outright.

The failure is silent from inside the app. `sendEmail` gets a 200 from
Resend and moves on, because Resend accepted the message. Everything
after that happens between Resend and the receiver, and nothing in the
product ever learns it. A traveller who never got their invitation looks
exactly like a traveller who ignored it.

## The three records

Replace `toplance.com` with whatever `EMAIL_FROM` uses. Add them at the
DNS host for that domain.

### 1. SPF — which servers may send as us

| | |
|---|---|
| **Type** | TXT |
| **Name** | `@` (the domain itself) |
| **Value** | `v=spf1 include:amazonses.com ~all` |

Resend sends through Amazon SES, so that is the include. Take the exact
value from the Resend dashboard rather than trusting this line — if they
change infrastructure it changes with them.

**Exactly one SPF record per domain.** Two is a permanent error and
fails *every* check rather than being merged, which is a worse state
than having none. If the domain already sends mail from somewhere else,
add the include to the existing record; do not add a second.

`~all` (softfail) rather than `-all` while you are still finding out
what else sends as this domain. Tighten to `-all` once DMARC reports are
quiet.

### 2. DKIM — the signature receivers verify

| | |
|---|---|
| **Type** | TXT |
| **Name** | `resend._domainkey` |
| **Value** | the public key Resend generates for this domain |

Resend generates the key per domain, so it has to be copied from their
dashboard — there is no value that can be written here. The selector
`resend` is what `email:verify` looks under; a different provider means
a different selector and a change to that script.

### 3. DMARC — what to do when the other two disagree

| | |
|---|---|
| **Type** | TXT |
| **Name** | `_dmarc` |
| **Value** | `v=DMARC1; p=quarantine; rua=mailto:dmarc@toplance.com; pct=100; adkim=s; aspf=s` |

Start at `p=none` for a week or two to collect reports, then move to
`p=quarantine`. **`email:verify` deliberately fails on `p=none`**: it is
a monitoring posture, not a protective one, and a record that exists but
protects nothing is the easiest kind to forget about.

`rua` needs a mailbox somebody actually reads. Aggregate reports arrive
daily and are how you find the other systems sending as this domain
before you tighten SPF to `-all`.

## Order to do this in

1. Add SPF and DKIM. Verify with `npm run email:verify` — DNS can take
   up to an hour to propagate.
2. Add DMARC at `p=none` and read the reports for a week.
3. Move DMARC to `p=quarantine`. Run `email:verify` again; it should
   pass all three.
4. Once reports are quiet, tighten SPF to `-all`.

Steps 1 to 3 are the pilot blocker. Step 4 can wait.

## Before the pilot

Send a real invitation to a Gmail address and one to an Outlook address,
and open the message headers. Look for `spf=pass`, `dkim=pass` and
`dmarc=pass`. The verify script proves the records exist; only a
delivered message proves they are correct.
