ALTER TABLE "notifications" ADD COLUMN "email_due_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "notifications_email_due_idx" ON "notifications" USING btree ("email_due_at");