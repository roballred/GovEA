CREATE TABLE IF NOT EXISTS "objective_capabilities" (
	"objective_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "objective_value_streams" (
	"objective_id" uuid NOT NULL,
	"value_stream_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategic_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"success_metric" text,
	"time_horizon" text,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'org' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objective_capabilities" ADD CONSTRAINT "objective_capabilities_objective_id_strategic_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."strategic_objectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objective_capabilities" ADD CONSTRAINT "objective_capabilities_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objective_value_streams" ADD CONSTRAINT "objective_value_streams_objective_id_strategic_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."strategic_objectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objective_value_streams" ADD CONSTRAINT "objective_value_streams_value_stream_id_value_streams_id_fk" FOREIGN KEY ("value_stream_id") REFERENCES "public"."value_streams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
