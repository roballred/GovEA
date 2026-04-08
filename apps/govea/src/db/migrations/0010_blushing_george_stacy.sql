CREATE TABLE IF NOT EXISTS "adr_applications" (
	"adr_id" uuid NOT NULL,
	"application_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adr_capabilities" (
	"adr_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adr_initiatives" (
	"adr_id" uuid NOT NULL,
	"initiative_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adr_objectives" (
	"adr_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "value_stream_personas" (
	"value_stream_id" uuid NOT NULL,
	"persona_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "objective_applications" (
	"objective_id" uuid NOT NULL,
	"application_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "initiative_applications" (
	"initiative_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"impact" text
);
--> statement-breakpoint
ALTER TABLE "value_streams" DROP CONSTRAINT "value_streams_stakeholder_persona_id_personas_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adr_applications" ADD CONSTRAINT "adr_applications_adr_id_adrs_id_fk" FOREIGN KEY ("adr_id") REFERENCES "public"."adrs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adr_applications" ADD CONSTRAINT "adr_applications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adr_capabilities" ADD CONSTRAINT "adr_capabilities_adr_id_adrs_id_fk" FOREIGN KEY ("adr_id") REFERENCES "public"."adrs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adr_capabilities" ADD CONSTRAINT "adr_capabilities_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adr_initiatives" ADD CONSTRAINT "adr_initiatives_adr_id_adrs_id_fk" FOREIGN KEY ("adr_id") REFERENCES "public"."adrs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adr_initiatives" ADD CONSTRAINT "adr_initiatives_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adr_objectives" ADD CONSTRAINT "adr_objectives_adr_id_adrs_id_fk" FOREIGN KEY ("adr_id") REFERENCES "public"."adrs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adr_objectives" ADD CONSTRAINT "adr_objectives_objective_id_strategic_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."strategic_objectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "value_stream_personas" ADD CONSTRAINT "value_stream_personas_value_stream_id_value_streams_id_fk" FOREIGN KEY ("value_stream_id") REFERENCES "public"."value_streams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "value_stream_personas" ADD CONSTRAINT "value_stream_personas_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objective_applications" ADD CONSTRAINT "objective_applications_objective_id_strategic_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."strategic_objectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objective_applications" ADD CONSTRAINT "objective_applications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "initiative_applications" ADD CONSTRAINT "initiative_applications_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "initiative_applications" ADD CONSTRAINT "initiative_applications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adrs" ADD CONSTRAINT "adrs_superseded_by_adrs_id_fk" FOREIGN KEY ("superseded_by") REFERENCES "public"."adrs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "value_streams" DROP COLUMN IF EXISTS "stakeholder_persona_id";