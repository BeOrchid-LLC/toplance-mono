# Encryption at rest and in transit

The brief's technical requirements include:

> All user data must be encrypted at rest and in transit.

Most of that line is not satisfiable by code in this repository — it is a
property of the Coolify deployment. This file is the checklist against which
the line can honestly be called done, and the record of which parts are
verified in CI versus which need someone to look at the host.

Written 2026-09-05. Re-check the **Needs the deployment** table before any
claim that the requirement is met.

## What user data exists, and where it lives

| Data | Store |
|---|---|
| Name, email, phone, visa fields | Postgres — `profiles` |
| Passport number, date of birth, corridor answers | Postgres — intake answers |
| Passport and supporting-document scans | Cloudflare R2 (staging bucket is EU jurisdiction) |
| Case notes, messages, audit rows | Postgres |
| Identity credentials (password, TOTP secret, backup codes) | Clerk — never in our database |

## How to know it is actually encrypted

Config records intent. To observe the real state:

```
npm run encryption:verify                             # database + storage legs
npm run encryption:verify -- https://staging.example.com   # and the deployed edge
```

It asks Postgres, over its own connection, whether that connection is using TLS
(`pg_stat_ssl` — the server's view of the socket, which a misleading connection
string cannot fake), and probes the deployed site for the HTTP→HTTPS redirect,
certificate expiry and every security header. Exits non-zero on failure, so a
deploy step or CI job can gate on it.

Three things it deliberately does not claim, because no client can observe them:
Postgres volume encryption, R2 object encryption, and backup encryption. Those
are host and vendor properties; the honest evidence is an attestation, and they
stay as checkboxes below.

## Verified in this repository

| Leg | How it is covered | Where |
|---|---|---|
| Browser → app | HSTS, one year, `includeSubDomains`, production only | `src/lib/security/headers.ts`, asserted in `headers.test.ts` |
| App → Postgres | Cleartext connection strings are refused at module load in production, warned about elsewhere | `src/lib/db/client.ts`, asserted in `client.test.ts` |
| App → R2 | HTTPS `S3_ENDPOINT`; object reads are presigned and expire after 600s | `src/lib/storage/documents.ts` |
| App → OpenAI, Clerk, Resend, visa APIs | HTTPS SDK endpoints |  |
| Browser → OpenAI voice | WebRTC (DTLS-SRTP). Audio never transits our server | `src/components/app/use-voice-intake.ts` |
| Document scans at rest | R2 encrypts every object at rest by default; not optional, not configurable off | Cloudflare platform |
| PII in logs | No `console.*` call logs answers, profiles or document contents | audited 2026-09-05 |

## Needs the deployment — not verifiable from this repository

Each of these is unconfirmed. None of them can be closed by a commit.

- [ ] **`DATABASE_URL` carries `sslmode`.** As of 2026-09-05 a production boot
      with a cleartext connection string **fails** rather than warns
      (`actionForInsecureConnection`), so this one announces itself. Detail: `verify-full` preferred, `require`
      the minimum. Only needed if Postgres is reached across a network the host
      does not control — `isPrivateHost` in `src/lib/db/client.ts` treats Docker
      service names and RFC 1918 addresses as private, and says nothing about
      them. Check the value in Coolify for staging and production.
- [ ] **The Postgres volume is on an encrypted disk.** This is the largest
      remaining gap: the database holds passport numbers and dates of birth, and
      nothing in this repository influences the host's disk. Confirm with
      whoever provisions the Coolify host.
- [ ] **Backups are encrypted, and their destination is too.** No backup
      configuration exists in this repository. An unencrypted `pg_dump` on the
      host or synced to object storage is an at-rest exposure regardless of what
      the volume does.
- [ ] **The proxy redirects HTTP to HTTPS.** Coolify's default is yes; confirm
      rather than assume. HSTS protects every request after the first, and this
      is what protects the first.
- [ ] **TLS certificates renew unattended.** Let's Encrypt via Coolify; an
      expired certificate is an availability incident, not a confidentiality
      one, but it is on the same surface.

## Decided, not omitted

- **No column-level encryption** on passport number or date of birth. "Encrypted
  at rest" is read here as storage-level, which is the ordinary reading. Column
  encryption would put the key in the same environment as the data and break
  every query that filters on those fields; if a future requirement asks for it
  explicitly, it wants a KMS and a different design, not `pgcrypto` bolted on.
- **Production refuses to boot on a cleartext `DATABASE_URL`**, rather than
  warning. A deploy that loses its `sslmode` will not start — intended, because
  a site that is down leaks nothing. Non-production still warns, so a developer
  pointed at staging is not blocked.
- **No `preload` on HSTS.** Cheap to add to the browsers' preload list and slow
  to leave it. Revisit once the production domain is settled.

## Known open work

- **Content-Security-Policy.** Not set. Clerk, the OpenAI realtime transport and
  R2 each need their origins allowed, so this needs to be derived from the real
  request set rather than guessed — a CSP that is wrong breaks the intake agent
  in production only. Not an encryption gap, but it is on the same header.

## What the e2e suite says

`e2e/client-spec-traveller.spec.ts` carries a `test.skip` against this brief
line, recording that it is not a browser assertion. That is still true and
should stay — the checklist above is the coverage, not the suite.
