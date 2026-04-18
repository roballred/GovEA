ALTER TABLE "persona_types" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "persona_types" CASCADE;--> statement-breakpoint
-- CASCADE above also drops the old persona_tags_tag_id_tags_id_fk constraint.
-- Clear stale persona_tags rows before re-pointing the FK to taxonomy_terms.
DROP TABLE "tags" CASCADE;--> statement-breakpoint
DELETE FROM "persona_tags";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "persona_tags" ADD CONSTRAINT "persona_tags_tag_id_taxonomy_terms_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
