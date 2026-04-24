DROP INDEX IF EXISTS "users_org_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");