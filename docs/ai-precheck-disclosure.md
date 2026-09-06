# The AI pre-check, and what has to be said about it

Written 2026-09-06, when decision 2 removed the per-agency switch.

Every document a traveller uploads is read by software before a human
sees it. There is no setting that turns this off — not for an agency,
not for a traveller, not for one document. That is a deliberate choice
and it has consequences that are not engineering ones, which is what
this file is for.

---

## What actually happens

A traveller uploads a file. Before any person opens it:

1. The file is passed to a model, which is asked one question — is this
   legible, in date, the right document, and complete?
2. The model returns a verdict (`pass` or `flag`), a class
   (`unreadable`, `expired`, `wrong_document`, `incomplete`, `mismatch`,
   `other`) and one plain sentence addressed to the traveller.
3. On a flag, the document goes to `flagged` and the traveller is told,
   usually within a minute. On a pass, nothing changes: the document
   stays `checking` and waits for a human.

**The model never verifies anything.** It can send a document back; it
cannot approve one. Every document that reaches `verified` was moved
there by a person at the agency.

## The three sentences that have to be true

**To the traveller.** Said on the documents screen, where they upload,
not in terms they will not read. The wording is
`DOCUMENTS.precheckDisclosure` in `src/lib/i18n/documents.ts`, in all
ten languages. It says three things: software checks it first, this is
why they hear about a bad scan in minutes, and nobody at Toplance reads
their documents — only their agency does.

**To the agency, at signup.** The pre-check is part of the product and
cannot be switched off. An agency whose own client contract forbids
third-party processing of client documents cannot use Toplance. This is
better discovered before they onboard than during their legal review.

**From the agency to its clients.** This is the one that is not ours to
write and is ours to make writable. An agency's client contract has to
carry the flow-down below, because the agency — not BeOrchid — is the
party with a contract with the traveller.

## Flow-down wording for an agency's client terms

Offered as a starting point, not as legal advice. An agency's own
counsel should read it.

> **Automated document checks.** Documents you upload are processed by
> automated software provided by our technology supplier before a member
> of our team reviews them. The software checks whether a document is
> legible, in date, complete and of the expected type, and may return a
> document to you for re-submission on that basis. It does not approve
> documents and it does not make any decision about your application —
> every approval is made by a person at [Agency]. Personnel at our
> technology supplier do not have access to your documents.

Three things in that paragraph are load-bearing and should survive any
rewrite:

- **"before a member of our team reviews them"** — the traveller learns
  the check happens first, not instead.
- **"does not approve documents and does not make any decision"** — true
  today, and the reason the model is only ever allowed to flag.
- **"do not have access to your documents"** — true because of fix 01
  and decision 5: the reviewer branch is deleted from every document
  policy, there is no break-glass, and no BeOrchid screen renders a
  document.

## What must not be claimed

**Not "BeOrchid cannot decrypt your documents."** That would need
per-tenant keys the platform does not hold. What is true is narrower and
still strong: no person at BeOrchid can open them, because no policy
grants it and no screen renders it.

**Not "your documents are not sent to a third party."** They are read by
a model. That is exactly what the disclosure exists to say.

**Not "you can opt out."** Nobody can, at any level. That is decision 2.

## If this is ever revisited

The per-agency toggle was considered and rejected on 2026-09-06 in
favour of one code path and one product. The cost accepted was that an
agency whose contract forbids third-party processing cannot onboard. If
that cost turns up as a lost customer, the toggle is the change to
reconsider — and it would make this document's second sentence
conditional, which is a larger edit than it looks.
