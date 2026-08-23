-- Added by hand: Drizzle Kit models neither extensions nor sequences,
-- and both are needed before the tables below. Re-adding these is the
-- one manual step after any `db:generate` that recreates this file.
--
-- pgcrypto provides gen_random_bytes for the invitations token default.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
-- case_ref_seq backs the applications case reference. Postgres resolves
-- nextval() when the default is set, so the sequence has to exist before
-- the table that uses it. Starting above zero keeps the first reference
-- from advertising that it is the first.
CREATE SEQUENCE IF NOT EXISTS "case_ref_seq" START 1000;--> statement-breakpoint
CREATE TYPE "public"."app_role" AS ENUM('traveler', 'org_member', 'staff');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'collecting_documents', 'submitted', 'under_review', 'additional_documents', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_state" AS ENUM('not_started', 'uploaded', 'checking', 'verified', 'flagged', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('hr_admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('reviewer', 'owner');--> statement-breakpoint
CREATE TYPE "public"."travel_purpose" AS ENUM('tourism', 'work', 'study', 'medical', 'relocation');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_ref" text DEFAULT 'TPL-' || lpad(nextval('case_ref_seq')::text, 6, '0') NOT NULL,
	"traveler_id" text NOT NULL,
	"org_id" uuid,
	"corridor_id" uuid,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"assignee_id" text,
	"intake_complete" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"sla_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_caseRef_unique" UNIQUE("case_ref")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corridor_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corridor_id" uuid NOT NULL,
	"doc_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'identity' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "corridor_requirements_doc_key" UNIQUE("corridor_id","doc_key")
);
--> statement-breakpoint
CREATE TABLE "corridors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nationality_iso" text NOT NULL,
	"destination_iso" text NOT NULL,
	"purpose" "travel_purpose" NOT NULL,
	"visa_name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"effective_from" date DEFAULT current_date NOT NULL,
	"source_name" text,
	"source_url" text,
	"processing_weeks_min" integer,
	"processing_weeks_max" integer,
	"government_fee_minor" bigint,
	"government_fee_currency" text DEFAULT 'NGN',
	"is_live" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corridors_corridor_version_key" UNIQUE("nationality_iso","destination_iso","purpose","version")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"doc_key" text NOT NULL,
	"name" text NOT NULL,
	"state" "document_state" DEFAULT 'not_started' NOT NULL,
	"storage_path" text,
	"reason" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"checked_at" timestamp with time zone,
	"verified_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_doc_key" UNIQUE("application_id","doc_key")
);
--> statement-breakpoint
CREATE TABLE "intake_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"value" text NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intake_answers_question_key" UNIQUE("application_id","question_key")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"job_title" text,
	"destination_iso" text,
	"purpose" "travel_purpose",
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"token" text DEFAULT encode(gen_random_bytes(24), 'hex') NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '30 days' NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itineraries_applicationId_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"sender_id" text,
	"sender_role" "app_role" NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"org_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "org_role" DEFAULT 'hr_admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"seats_purchased" integer DEFAULT 0 NOT NULL,
	"billing_contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seats_not_negative" CHECK ("organisations"."seats_purchased" >= 0)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"country_iso" text DEFAULT 'ng' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"role" "app_role" DEFAULT 'traveler' NOT NULL,
	"staff_role" "staff_role",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locale_supported" CHECK ("profiles"."locale" in ('en', 'ha', 'yo', 'ig')),
	CONSTRAINT "staff_role_only_for_staff" CHECK ("profiles"."staff_role" is null or "profiles"."role" = 'staff')
);
--> statement-breakpoint
CREATE TABLE "status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status" NOT NULL,
	"message" text,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_traveler_id_profiles_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_assignee_id_profiles_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corridor_requirements" ADD CONSTRAINT "corridor_requirements_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_profiles_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_answers" ADD CONSTRAINT "intake_answers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_traveler_idx" ON "applications" USING btree ("traveler_id");--> statement-breakpoint
CREATE INDEX "applications_org_idx" ON "applications" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status","sla_due_at");--> statement-breakpoint
CREATE INDEX "audit_log_subject_idx" ON "audit_log" USING btree ("subject_type","subject_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_application_idx" ON "documents" USING btree ("application_id","state");--> statement-breakpoint
CREATE INDEX "invitations_org_idx" ON "invitations" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "messages_application_idx" ON "messages" USING btree ("application_id","created_at");