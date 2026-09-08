ALTER TABLE "demo_requests" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_assignee_id_profiles_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demo_requests_assignee_idx" ON "demo_requests" USING btree ("assignee_id");