CREATE TYPE "public"."attendance_kind" AS ENUM('biometrics', 'interview');--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'attendance_requested' BEFORE 'visa_expiring';--> statement-breakpoint
CREATE TABLE "attendance_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"kind" "attendance_kind" NOT NULL,
	"scheduled_for" timestamp with time zone,
	"place" text NOT NULL,
	"note" text,
	"requested_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_requests_application_idx" ON "attendance_requests" USING btree ("application_id","created_at");