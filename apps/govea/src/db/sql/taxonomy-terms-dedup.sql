-- ============================================================================
-- taxonomy_terms duplicate-row cleanup + uniqueness guard — issue #554
--
-- Surfaced during the Content Viewer persona journey audit (#552): persona
-- detail pages were rendering the same tag chip 18+ times because successive
-- seed runs (before a dedupe was added to the seed runner) had accumulated
-- duplicate taxonomy_terms rows for the same (organization_id, parent_id,
-- name) tuple. Each persona_tag legitimately linked to one of the duplicates,
-- so the UI faithfully rendered N identical chips.
--
-- This file does two things, in order:
--
--   1. Collapse each duplicate group down to the oldest surviving row.
--      All foreign-key references (persona_tags, entity_taxonomy_values,
--      entity_taxonomy_definitions) are re-pointed to the survivor. The
--      losers are then deleted.
--
--   2. Add a unique index on (organization_id, parent_id, name) using NULLS
--      NOT DISTINCT so the same dedupe pass at the seed layer can never get
--      undermined again. NULL parent_id (top-level taxonomy types) is
--      treated as a real key column, not as "ignore this row."
--
-- Idempotent: re-running on an already-deduped table is a no-op. The seed
-- runner's own dedupe pass remains in place as a belt-and-braces guard.
-- ============================================================================

-- Step 1: collapse duplicate (org, parent, name) groups.
--
-- WITH ranks: identifies the survivor (oldest row by created_at; ties broken
-- by id) and the losers in each group.
WITH ranks AS (
  SELECT
    id,
    organization_id,
    parent_id,
    name,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, parent_id, name
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY organization_id, parent_id, name
      ORDER BY created_at ASC, id ASC
    ) AS survivor_id
  FROM taxonomy_terms
),
losers AS (
  SELECT id AS loser_id, survivor_id
  FROM ranks
  WHERE rn > 1
),
-- Re-point persona_tags onto the survivor (defensive: there might not be any).
fix_persona_tags AS (
  UPDATE persona_tags pt
  SET tag_id = l.survivor_id
  FROM losers l
  WHERE pt.tag_id = l.loser_id
  RETURNING pt.persona_id, pt.tag_id
),
-- Re-point entity_taxonomy_values onto the survivor.
fix_etv AS (
  UPDATE entity_taxonomy_values etv
  SET taxonomy_term_id = l.survivor_id
  FROM losers l
  WHERE etv.taxonomy_term_id = l.loser_id
  RETURNING etv.entity_id
),
-- Re-point entity_taxonomy_definitions.taxonomy_type_id onto the survivor.
fix_etd AS (
  UPDATE entity_taxonomy_definitions etd
  SET taxonomy_type_id = l.survivor_id
  FROM losers l
  WHERE etd.taxonomy_type_id = l.loser_id
  RETURNING etd.entity_type
),
-- Re-parent any child taxonomy_terms whose parent_id pointed at a loser.
fix_children AS (
  UPDATE taxonomy_terms child
  SET parent_id = l.survivor_id
  FROM losers l
  WHERE child.parent_id = l.loser_id
  RETURNING child.id
)
DELETE FROM taxonomy_terms
WHERE id IN (SELECT loser_id FROM losers);

-- After the re-point pass it's safe to dedupe persona_tags too — moving rows
-- onto the survivor may have created identical (persona_id, tag_id) duplicates.
WITH pt_dupes AS (
  SELECT persona_id, tag_id, MIN(ctid) AS keep_ctid
  FROM persona_tags
  GROUP BY persona_id, tag_id
  HAVING count(*) > 1
)
DELETE FROM persona_tags pt
USING pt_dupes d
WHERE pt.persona_id = d.persona_id
  AND pt.tag_id = d.tag_id
  AND pt.ctid <> d.keep_ctid;

-- Same dedupe pass for entity_taxonomy_values — collapsing terms can leave
-- identical (entity_type, entity_id, taxonomy_term_id) triples behind.
WITH etv_dupes AS (
  SELECT entity_type, entity_id, taxonomy_term_id, MIN(ctid) AS keep_ctid
  FROM entity_taxonomy_values
  GROUP BY entity_type, entity_id, taxonomy_term_id
  HAVING count(*) > 1
)
DELETE FROM entity_taxonomy_values etv
USING etv_dupes d
WHERE etv.entity_type = d.entity_type
  AND etv.entity_id = d.entity_id
  AND etv.taxonomy_term_id = d.taxonomy_term_id
  AND etv.ctid <> d.keep_ctid;

-- Step 2: install the uniqueness guard.
--
-- Drop the prior index name if it exists (in case the constraint definition
-- evolves later); CREATE UNIQUE INDEX with IF NOT EXISTS would skip the
-- creation entirely on re-run, but we want this file idempotent against
-- definition changes, so DROP + CREATE is the safer shape.
DROP INDEX IF EXISTS taxonomy_terms_org_parent_name_unique;
CREATE UNIQUE INDEX taxonomy_terms_org_parent_name_unique
  ON taxonomy_terms (organization_id, parent_id, name) NULLS NOT DISTINCT;
