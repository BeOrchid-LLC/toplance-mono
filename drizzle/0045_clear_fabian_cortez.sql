ALTER TABLE "applications" ADD COLUMN "first_submitted_at" timestamp with time zone;--> statement-breakpoint
--
-- Backfill. `submitted_at` is overwritten on every resubmission, so on its
-- own it is the latest submission, not the first. `status_events` keeps a
-- row for every move into `submitted` (written in the same transaction as
-- the status since `submitApplicationTx`), so the earliest of those is the
-- first submission where one exists; `submitted_at` covers rows that
-- predate the event log, and `least` ignores whichever side is null.
--
UPDATE "applications" a
SET "first_submitted_at" = least(
  a."submitted_at",
  (
    SELECT min(e."created_at")
    FROM "status_events" e
    WHERE e."application_id" = a."id" AND e."to_status" = 'submitted'
  )
)
WHERE a."first_submitted_at" IS NULL
  AND (
    a."submitted_at" IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM "status_events" e
      WHERE e."application_id" = a."id" AND e."to_status" = 'submitted'
    )
  );
