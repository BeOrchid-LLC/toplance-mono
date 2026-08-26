CREATE TABLE "case_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"traveler_id" text NOT NULL,
	"country" text NOT NULL,
	"purpose" text,
	"started_on" date,
	"ended_on" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_records" ADD CONSTRAINT "travel_records_traveler_id_profiles_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_notes_application_idx" ON "case_notes" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "travel_records_traveler_idx" ON "travel_records" USING btree ("traveler_id","started_on");