# Capability: Framework Mapping

## What It Does

The system must allow users to map GovEA records to concepts from an enabled framework overlay. For TOGAF, mappings may include architecture domains, content categories, architecture building block concepts, governance concerns, or other reference categories.

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

Partially implemented.

Current shipped slice:

- Capability and application detail pages support TOGAF Architecture Domain mappings
- Mappings can carry an optional rationale
- Mappings are organization-scoped and only visible when the TOGAF overlay is enabled

Not yet shipped:

- Mapping additional entity types
- Supporting multiple frameworks or richer concept taxonomies
- Reporting and filtering across arbitrary framework concepts beyond the current TOGAF domain slice

## Links

- Depends on: Framework Reference Management, Content Relationships, Taxonomy Management
- Related: TOGAF-Aligned Reporting, ADM Phase Alignment, End-to-End Traceability
- Personas served: Enterprise Architect, Agency EA Coordinator, Department Director
