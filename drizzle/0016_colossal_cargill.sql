-- The v1.3 tenancy, in the schema.
--
-- drizzle-kit generates the structure of this change but not the data
-- steps it needs to survive contact with existing rows: the enum cast
-- fails on every `hr_admin` member, and SET NOT NULL fails on every
-- application without an agency. Both are added below, each next to the
-- structural statement it exists to make possible.

ALTER TABLE "applications" DROP CONSTRAINT "applications_org_id_organisations_id_fk";
--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint

-- DATA. `hr_admin` becomes `reviewer` while the column is still text —
-- after the type swap below there is no `hr_admin` to cast from. The
-- word arrived with the employer console and describes nobody in a
-- travel agency; the person it names is the one who reads a traveller's
-- documents and decides their case.
UPDATE "org_members" SET "role" = 'reviewer' WHERE "role" = 'hr_admin';--> statement-breakpoint

ALTER TABLE "org_members" ALTER COLUMN "role" SET DEFAULT 'reviewer'::text;--> statement-breakpoint
DROP TYPE "public"."org_role";--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('reviewer', 'owner');--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "role" SET DEFAULT 'reviewer'::"public"."org_role";--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "role" SET DATA TYPE "public"."org_role" USING "role"::"public"."org_role";--> statement-breakpoint

-- DATA. A case with no agency has no reviewer under this tenancy, so it
-- is unservable rather than merely unbilled — and the decision taken on
-- 2026-09-06 was to delete these rather than park them with a
-- BeOrchid-operated agency. Safe because there is no production data;
-- documents, messages, intake answers, case notes, status events and
-- companion records all cascade from `applications`.
--
-- Direct traveller signup has no mechanism after this. When it is
-- wanted it is new work, not this column.
DELETE FROM "applications" WHERE "org_id" IS NULL;--> statement-breakpoint

ALTER TABLE "applications" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- DATA. Every message the desk sent was sent by the party that now
-- reviews the case — the agency. Left as `staff` they render as
-- BeOrchid speaking to someone else's client, in a product whose whole
-- claim is that BeOrchid is not in that conversation.
UPDATE "messages" SET "sender_role" = 'org_member' WHERE "sender_role" = 'staff';
