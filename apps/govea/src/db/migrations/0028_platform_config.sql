CREATE TABLE "platform_config" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"instance_name" text DEFAULT 'GovEA' NOT NULL,
	"default_theme" text DEFAULT 'govea' NOT NULL,
	"allow_local_auth" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "platform_config" ADD CONSTRAINT "platform_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
