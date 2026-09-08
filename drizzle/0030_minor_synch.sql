ALTER TABLE "invitations" ALTER COLUMN "org_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "staff_rank" "staff_role";--> statement-breakpoint
CREATE INDEX "invitations_platform_idx" ON "invitations" USING btree ("status") WHERE "invitations"."org_id" is null;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "platform_invite_has_no_org" CHECK (("invitations"."kind"::text = 'platform_staff' and "invitations"."org_id" is null and "invitations"."staff_rank" is not null)
       or ("invitations"."kind"::text <> 'platform_staff' and "invitations"."org_id" is not null and "invitations"."staff_rank" is null));