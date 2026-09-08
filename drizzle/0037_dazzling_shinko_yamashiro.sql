CREATE TYPE "public"."kyb_state" AS ENUM('not_started', 'in_review', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "kyb_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"doc_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"state" "kyb_state" DEFAULT 'not_started' NOT NULL,
	"storage_path" text,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"checked_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kyb_requirements_doc_key" UNIQUE("org_id","doc_key")
);
--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "kyb_requirements" ADD CONSTRAINT "kyb_requirements_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyb_requirements" ADD CONSTRAINT "kyb_requirements_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kyb_requirements_org_idx" ON "kyb_requirements" USING btree ("org_id","state");--> statement-breakpoint
--
-- Backfill. Every agency that existed before this migration is treated
-- as already let in: a rule introduced today must not lock out somebody
-- who onboarded last week, and pre-launch this is a handful of rows.
-- KYB applies to agencies provisioned from here on.
--
UPDATE "organisations" SET "activated_at" = now() WHERE "activated_at" IS NULL;--> statement-breakpoint
--
-- …and give them a checklist anyway, so the console has something to
-- show for an agency an operator opens out of curiosity, and so a
-- licence that lapses later has a row to be re-filed against.
--
-- A point-in-time snapshot of `KYB_REQUIREMENTS` (`src/lib/domain/kyb`),
-- which is the same discipline the `name`/`description` columns follow:
-- a row carries its own copy, and editing the constant must not rewrite
-- history. `seedKybRequirements` is idempotent on (org_id, doc_key), so
-- a later change to the list is applied by the application rather than
-- by editing this file.
--
INSERT INTO "kyb_requirements" ("org_id", "doc_key", "name", "description", "sort_order")
SELECT o."id", r."doc_key", r."name", r."description", r."sort_order"
FROM "organisations" o
CROSS JOIN (VALUES
  ('operating_licence', 'Operating licence', 'Travel, tour operator or immigration consultancy licence, in date, issued to the company named on the account.', 0),
  ('incorporation_certificate', 'Certificate of incorporation', 'Registry document showing the company''s legal name and registration number.', 1),
  ('director_id', 'Director''s government ID', 'Passport or national ID of the person who created the account, readable and unexpired.', 2),
  ('business_address', 'Proof of business address', 'Utility bill, lease or bank correspondence in the company''s name, dated within the last three months.', 3),
  ('ownership_proof', 'Proof of ownership', 'Share register, board resolution or registry extract naming the account holder as an owner or director of this company.', 4),
  ('bank_account', 'Bank account proof', 'Statement or account-confirmation letter showing an account held in the company''s name.', 5)
) AS r("doc_key", "name", "description", "sort_order")
ON CONFLICT ("org_id", "doc_key") DO NOTHING;
