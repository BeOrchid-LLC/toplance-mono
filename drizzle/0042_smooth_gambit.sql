ALTER TYPE "public"."application_status" ADD VALUE 'interview_scheduled' BEFORE 'additional_documents';--> statement-breakpoint
ALTER TYPE "public"."application_status" ADD VALUE 'awaiting_decision' BEFORE 'additional_documents';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'interview_reminder' BEFORE 'support_replied';--> statement-breakpoint
ALTER TABLE "corridors" ADD COLUMN "requires_interview" boolean DEFAULT false NOT NULL;