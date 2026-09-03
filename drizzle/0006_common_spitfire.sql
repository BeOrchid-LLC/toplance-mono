CREATE TYPE "public"."corridor_review_state" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "corridor_requirements" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "corridors" ADD COLUMN "last_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "corridors" ADD COLUMN "review_state" "corridor_review_state" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "corridors" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "corridors" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "corridors" ADD COLUMN "reject_reason" text;--> statement-breakpoint
ALTER TABLE "corridors" ADD COLUMN "source_hash" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "corridors" ADD CONSTRAINT "corridors_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;