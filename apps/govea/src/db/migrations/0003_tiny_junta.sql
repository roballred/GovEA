CREATE TYPE "public"."visibility" AS ENUM('org', 'connections', 'instance');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('pending', 'active', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('pending', 'active', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('implements', 'extends', 'maps_to');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cross_org_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_org_id" uuid NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"target_org_id" uuid NOT NULL,
	"target_entity_type" text NOT NULL,
	"target_entity_id" uuid NOT NULL,
	"link_type" "link_type" NOT NULL,
	"status" "link_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_org_id" uuid NOT NULL,
	"to_org_id" uuid NOT NULL,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_org_connection" UNIQUE("from_org_id","to_org_id")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "visibility" "visibility" DEFAULT 'org' NOT NULL;--> statement-breakpoint
ALTER TABLE "capabilities" ADD COLUMN "visibility" "visibility" DEFAULT 'org' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "visibility" "visibility" DEFAULT 'org' NOT NULL;--> statement-breakpoint
ALTER TABLE "adrs" ADD COLUMN "visibility" "visibility" DEFAULT 'org' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_org_links" ADD CONSTRAINT "cross_org_links_source_org_id_organizations_id_fk" FOREIGN KEY ("source_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_org_links" ADD CONSTRAINT "cross_org_links_target_org_id_organizations_id_fk" FOREIGN KEY ("target_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_org_links" ADD CONSTRAINT "cross_org_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_connections" ADD CONSTRAINT "org_connections_from_org_id_organizations_id_fk" FOREIGN KEY ("from_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_connections" ADD CONSTRAINT "org_connections_to_org_id_organizations_id_fk" FOREIGN KEY ("to_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_connections" ADD CONSTRAINT "org_connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_id_organizations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
