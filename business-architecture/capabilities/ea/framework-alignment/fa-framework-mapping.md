# Capability: Framework Mapping

## What It Does

The system must allow users to map GovEA records to concepts from an installed framework vocabulary. For TOGAF, mappings may include architecture domains, content categories, architecture building block concepts, governance concerns, or other reference categories.

Mappings explain how existing GovEA content relates to external architecture practice without changing the GovEA content model.

## Personas

- **Enterprise Architect (Central IT)** — needs to show that enterprise capabilities, applications, principles, and decisions align to a recognized architecture framework
- **Agency EA Coordinator** — needs to map local architecture content to enterprise or TOGAF concepts only where the mapping is useful
- **Department Director** — indirectly benefits when mapped content can produce clearer, more credible summaries without exposing framework jargon

## Behaviors

- Map a GovEA record to one or more framework concepts
- Capture a short rationale explaining why the mapping exists
- Show mappings on architect-facing detail views without cluttering plain-language stakeholder views
- Filter or report GovEA records by framework concept
- Preserve mappings when the source GovEA record is edited

## Rules

- Framework mapping is optional; unmapped records remain valid GovEA records.
- A mapping must never bypass GovEA's existing traceability rules.
- Mapping labels must be scoped to the enabled framework and organization.
- Mappings should support review and reporting, not become a second source of truth.

## Implementation Status

Partially implemented — taxonomy-backed per ADR-0002 (#665/#671 arc).

Current shipped slice:

- TOGAF Architecture Domain ships as a taxonomy type installed by the TOGAF recipe; capability and application records are classified through the generic entity-taxonomy UI
- Mappings are organization-scoped and the framework vocabulary only exists where the recipe has been installed (recipe presence replaced the old overlay toggle)
- Framework taxonomy types carry `audience: 'framework'`, keeping framework labels out of stakeholder-facing views by default

Not yet shipped:

- Per-mapping rationale (the decommissioned `framework_mappings` table supported one; the taxonomy migration dropped it — restore as a taxonomy-value annotation if practitioners ask for it)
- Mapping additional entity types
- Supporting multiple frameworks or richer concept taxonomies
- Reporting and filtering across arbitrary framework concepts beyond the current TOGAF domain slice

## Links

- Depends on: Framework Reference Management, Content Relationships, Taxonomy Management
- Related: TOGAF-Aligned Reporting, ADM Phase Alignment, End-to-End Traceability
