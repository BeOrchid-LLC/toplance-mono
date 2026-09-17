ALTER TABLE "demo_requests" ADD COLUMN "converted_by" text;--> statement-breakpoint
ALTER TABLE "demo_requests" ADD COLUMN "converted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_converted_by_profiles_id_fk" FOREIGN KEY ("converted_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
--
-- Backfill. Nothing recorded who converted an enquiry until now, but
-- `provisionTenantTx` has always written the new agency's first
-- invitation (`kind = 'staff'`, `invited_by` = the operator) in the same
-- transaction that stamped the enquiry converted. So the earliest staff
-- invitation to the converted organisation is the conversion: its
-- inviter is the converter and its `created_at` is the moment.
--
-- Only the earliest. A later staff invitation to the same agency is its
-- director inviting a colleague, and naming them would put an agency
-- employee on BeOrchid's sales queue. `invited_by` on that earliest row
-- can itself be null (the operator's profile was since deleted); the
-- time is still right, so it is kept and the name stays empty. With no
-- invitation at all, the organisation's own `created_at` is the same
-- transaction's clock.
--
UPDATE "demo_requests" d
SET
  "converted_by" = first_invite."invited_by",
  "converted_at" = coalesce(first_invite."created_at", o."created_at")
FROM "organisations" o
LEFT JOIN LATERAL (
  SELECT i."invited_by", i."created_at"
  FROM "invitations" i
  WHERE i."org_id" = o."id" AND i."kind" = 'staff'
  ORDER BY i."created_at" ASC
  LIMIT 1
) first_invite ON true
WHERE d."status" = 'converted'
  AND d."converted_org_id" = o."id"
  AND d."converted_at" IS NULL;
--> statement-breakpoint
--
-- A converted enquiry reading "Unassigned" is what the client flagged:
-- somebody attended to that agency. Where nobody was named, the
-- converter is the last person who worked it.
--
UPDATE "demo_requests"
SET "assignee_id" = "converted_by"
WHERE "status" = 'converted'
  AND "assignee_id" IS NULL
  AND "converted_by" IS NOT NULL;
