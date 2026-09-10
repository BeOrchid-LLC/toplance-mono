CREATE TYPE "public"."document_source" AS ENUM('corridor', 'agency');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "source" "document_source" DEFAULT 'corridor' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "requested_by" text;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;