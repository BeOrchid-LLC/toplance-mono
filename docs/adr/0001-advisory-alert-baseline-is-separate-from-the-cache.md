# The advisory alert baseline is stored separately from the cached reading

`companion_updates` holds two lists for a `safety_advisory` row, not one:
`advisories`, the reading the sources last gave us, and `alerted`, the reading
the traveller has actually been told about. A change is anything in the first
that has moved past the second.

## Why

They were one list, and `refreshAdvisoriesIfStale` both refreshed it and
reported what had changed. The companion page calls that function on render and
discards `changed` — rendering a page is not the moment to email somebody — but
the refresh had already moved the baseline the nightly sweep compares against.
So a traveller who opened their page after a government moved its advice
consumed the change: the sweep found nothing and never sent the alert. The page
is approved-only, which is exactly the sweep's population, so this was not an
edge case.

Splitting the two makes the bug unrepresentable. Any caller may refresh; only
`markAdvisoriesAlerted` moves the baseline, and only after `notify` reports the
alert went out. A failed send therefore stays owed and is retried on the next
sweep.

## Considered options

- **Make the page read-only** and let the cron be the sole writer. Rejected: it
  trades away freshness on the one page where an advisory's whole value is being
  current.
- **Persist a pending-alert flag** on refresh, drained by the cron. Rejected as
  the same idea with more moving parts — a flag has to be cleared correctly to
  be idempotent, whereas comparing against a stored reading is idempotent by
  construction.

## Consequences

The first sighting of an application seeds `alerted` with the reading itself.
Seeding it empty instead makes every source look permanently new, because
"changed" is defined against a previous reading and there is none — which is a
silent no-alerts-ever failure, and was caught only by a test.

A row written before the split has no `alerted` key. It falls back to the last
reading, which reproduces the old behaviour once and seeds the field properly on
the next write. That fallback can go once no such rows remain.
