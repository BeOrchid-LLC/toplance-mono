CREATE TYPE "public"."payment_kind" AS ENUM('agency_subscription', 'client_application');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "payment_kind" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"org_id" uuid,
	"application_id" uuid,
	"payer_id" text,
	"rate_card_id" uuid,
	"provider" text DEFAULT 'mock' NOT NULL,
	"provider_ref" text,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "payment_shape_matches_kind" CHECK (("payments"."kind" = 'agency_subscription' and "payments"."org_id" is not null and "payments"."application_id" is null)
       or ("payments"."kind" = 'client_application' and "payments"."application_id" is not null and "payments"."org_id" is null))
);
--> statement-breakpoint
ALTER TABLE "billing_rate_cards" ADD COLUMN "client_fee_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_profiles_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_rate_card_id_billing_rate_cards_id_fk" FOREIGN KEY ("rate_card_id") REFERENCES "public"."billing_rate_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "payments_application_idx" ON "payments" USING btree ("application_id","status");--> statement-breakpoint
/*
 Every application that already exists predates the paywall and was
 sponsored by the agency that opened it. Charging those travellers now
 would put a payment screen in the middle of a case somebody is halfway
 through, so each is settled at zero against a `backfill` provider —
 distinguishable from a real payment forever, and never confused for one.
*/
INSERT INTO "payments" ("kind", "status", "amount_minor", "currency", "application_id", "payer_id", "provider", "provider_ref", "paid_at")
SELECT 'client_application', 'paid', 0, 'USD', a."id", a."traveler_id", 'backfill', 'pre-paywall', now()
FROM "applications" a;
