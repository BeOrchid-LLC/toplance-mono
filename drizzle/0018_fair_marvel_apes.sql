CREATE TYPE "public"."invitation_kind" AS ENUM('client', 'staff');--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "kind" "invitation_kind" DEFAULT 'client' NOT NULL;