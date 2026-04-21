ALTER TABLE "organizations" ADD COLUMN "is_system_org" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "instance_role" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "break_glass_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_admin_id" uuid NOT NULL,
	"target_org_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "break_glass_sessions" ADD CONSTRAINT "break_glass_sessions_instance_admin_id_users_id_fk" FOREIGN KEY ("instance_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "break_glass_sessions" ADD CONSTRAINT "break_glass_sessions_target_org_id_organizations_id_fk" FOREIGN KEY ("target_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "break_glass_sessions" ADD CONSTRAINT "break_glass_sessions_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
