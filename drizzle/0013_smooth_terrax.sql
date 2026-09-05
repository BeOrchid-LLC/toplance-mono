CREATE INDEX "applications_corridor_idx" ON "applications" USING btree ("corridor_id");--> statement-breakpoint
CREATE INDEX "applications_assignee_idx" ON "applications" USING btree ("assignee_id");