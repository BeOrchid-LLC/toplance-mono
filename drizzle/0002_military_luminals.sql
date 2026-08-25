-- Environments that ran the racy getOrCreateApplication can already
-- hold several applications per traveller, and the constraint below
-- would refuse to exist over them. Keep the row with the most intake
-- answers (newest first on ties) — the one the traveller's work most
-- plausibly landed on — and let the children of the rest cascade.
-- Pre-launch: no production data is at risk.
WITH ranked AS (
  SELECT a.id,
         row_number() OVER (
           PARTITION BY a.traveler_id
           ORDER BY (
             SELECT count(*) FROM intake_answers ia WHERE ia.application_id = a.id
           ) DESC, a.created_at DESC, a.id DESC
         ) AS rn
  FROM applications a
)
DELETE FROM "applications" WHERE id IN (SELECT id FROM ranked WHERE rn > 1);--> statement-breakpoint
DROP INDEX "applications_traveler_idx";--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_traveler_key" UNIQUE("traveler_id");