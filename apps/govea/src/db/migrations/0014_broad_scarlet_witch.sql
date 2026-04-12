CREATE TABLE IF NOT EXISTS "glossary_term_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"definition" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "glossary_terms" ADD COLUMN "definition_source" text;--> statement-breakpoint
ALTER TABLE "glossary_terms" ADD COLUMN "definition_source_url" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "glossary_term_sources" ADD CONSTRAINT "glossary_term_sources_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
