CREATE TABLE IF NOT EXISTS "entity_taxonomy_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "taxonomy_type_id" uuid NOT NULL,
  "selection_mode" text DEFAULT 'single' NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "entity_taxonomy_definitions"
    ADD CONSTRAINT "entity_taxonomy_definitions_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "entity_taxonomy_definitions"
    ADD CONSTRAINT "entity_taxonomy_definitions_taxonomy_type_id_taxonomy_terms_id_fk"
    FOREIGN KEY ("taxonomy_type_id") REFERENCES "public"."taxonomy_terms"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "etd_org_entity_type_uniq"
  ON "entity_taxonomy_definitions" ("organization_id", "entity_type", "taxonomy_type_id");

CREATE TABLE IF NOT EXISTS "entity_taxonomy_values" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "taxonomy_term_id" uuid NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "entity_taxonomy_values"
    ADD CONSTRAINT "entity_taxonomy_values_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "entity_taxonomy_values"
    ADD CONSTRAINT "entity_taxonomy_values_taxonomy_term_id_taxonomy_terms_id_fk"
    FOREIGN KEY ("taxonomy_term_id") REFERENCES "public"."taxonomy_terms"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "etv_entity_term_uniq"
  ON "entity_taxonomy_values" ("entity_type", "entity_id", "taxonomy_term_id");

CREATE TEMP TABLE taxonomy_term_dedupe ON COMMIT DROP AS
SELECT id, keep_id
FROM (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY organization_id, parent_id, slug
      ORDER BY created_at, id
    ) AS keep_id,
    row_number() OVER (
      PARTITION BY organization_id, parent_id, slug
      ORDER BY created_at, id
    ) AS rn
  FROM taxonomy_terms
) ranked
WHERE rn > 1;

UPDATE taxonomy_terms child
SET parent_id = dedupe.keep_id
FROM taxonomy_term_dedupe dedupe
WHERE child.parent_id = dedupe.id;

DELETE FROM persona_tags tag
USING taxonomy_term_dedupe dedupe
WHERE tag.tag_id = dedupe.id
  AND EXISTS (
    SELECT 1
    FROM persona_tags existing
    WHERE existing.persona_id = tag.persona_id
      AND existing.tag_id = dedupe.keep_id
  );

UPDATE persona_tags tag
SET tag_id = dedupe.keep_id
FROM taxonomy_term_dedupe dedupe
WHERE tag.tag_id = dedupe.id;

DELETE FROM entity_taxonomy_values value
USING taxonomy_term_dedupe dedupe
WHERE value.taxonomy_term_id = dedupe.id
  AND EXISTS (
    SELECT 1
    FROM entity_taxonomy_values existing
    WHERE existing.organization_id = value.organization_id
      AND existing.entity_type = value.entity_type
      AND existing.entity_id = value.entity_id
      AND existing.taxonomy_term_id = dedupe.keep_id
  );

UPDATE entity_taxonomy_values value
SET taxonomy_term_id = dedupe.keep_id
FROM taxonomy_term_dedupe dedupe
WHERE value.taxonomy_term_id = dedupe.id;

DELETE FROM entity_taxonomy_definitions definition
USING taxonomy_term_dedupe dedupe
WHERE definition.taxonomy_type_id = dedupe.id
  AND EXISTS (
    SELECT 1
    FROM entity_taxonomy_definitions existing
    WHERE existing.organization_id = definition.organization_id
      AND existing.entity_type = definition.entity_type
      AND existing.taxonomy_type_id = dedupe.keep_id
  );

UPDATE entity_taxonomy_definitions definition
SET taxonomy_type_id = dedupe.keep_id
FROM taxonomy_term_dedupe dedupe
WHERE definition.taxonomy_type_id = dedupe.id;

DELETE FROM taxonomy_terms term
USING taxonomy_term_dedupe dedupe
WHERE term.id = dedupe.id;

CREATE UNIQUE INDEX IF NOT EXISTS "taxonomy_terms_type_slug_uniq"
  ON "taxonomy_terms" ("organization_id", "slug")
  WHERE "parent_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "taxonomy_terms_value_slug_uniq"
  ON "taxonomy_terms" ("organization_id", "parent_id", "slug")
  WHERE "parent_id" IS NOT NULL;
