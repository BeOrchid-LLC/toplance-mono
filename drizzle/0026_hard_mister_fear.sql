CREATE TYPE "public"."demo_request_status" AS ENUM('new', 'contacted', 'scheduled', 'converted', 'declined');--> statement-breakpoint
ALTER TABLE "demo_requests" ADD COLUMN "status" "demo_request_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "demo_requests" ADD COLUMN "converted_org_id" uuid;--> statement-breakpoint
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_converted_org_id_organisations_id_fk" FOREIGN KEY ("converted_org_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;