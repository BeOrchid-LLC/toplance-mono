CREATE TYPE "public"."support_request_state" AS ENUM('open', 'claimed', 'resolved');--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"raised_by" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"state" "support_request_state" DEFAULT 'open' NOT NULL,
	"assignee_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_raised_by_profiles_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_assignee_id_profiles_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_requests_state_idx" ON "support_requests" USING btree ("state","created_at");--> statement-breakpoint
CREATE INDEX "support_requests_assignee_idx" ON "support_requests" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "support_requests_org_idx" ON "support_requests" USING btree ("org_id");