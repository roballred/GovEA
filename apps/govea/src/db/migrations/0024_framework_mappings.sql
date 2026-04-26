CREATE TABLE "framework_mappings" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "entity_type"     text NOT NULL,
  "entity_id"       uuid NOT NULL,
  "framework"       text NOT NULL,
  "concept_label"   text NOT NULL,
  "rationale"       text,
  "created_by"      uuid REFERENCES "users"("id"),
  "created_at"      timestamp DEFAULT now() NOT NULL,
  "updated_at"      timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "framework_mappings_entity_idx" ON "framework_mappings" ("organization_id", "entity_type", "entity_id");
