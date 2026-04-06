CREATE TABLE IF NOT EXISTS "persona_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_org_persona_type" UNIQUE("organization_id","name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "persona_types" ADD CONSTRAINT "persona_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
