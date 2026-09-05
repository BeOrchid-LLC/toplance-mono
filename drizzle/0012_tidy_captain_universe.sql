ALTER TYPE "public"."notification_kind" ADD VALUE 'checklist_complete';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "checklist_complete_at" timestamp with time zone;