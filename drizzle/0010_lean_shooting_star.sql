ALTER TYPE "public"."notification_kind" ADD VALUE 'visa_expiring';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "visa_expires_on" date;