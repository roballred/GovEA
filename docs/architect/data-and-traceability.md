# Data and Traceability Architecture

GovEA's repository model is centered on mission-first traceability. The basic chain is:

```text
Personas -> Capabilities -> Applications
```

The rest of the model adds planning, services, decisions, principles, data architecture, and reporting context around that chain.

For field-level schema detail, see `docs/data-model.md`.

## Core Traceability Model

```mermaid
flowchart LR
  Personas --> Capabilities
  Capabilities --> Applications
  Services --> Personas
  Services --> Capabilities
  Services --> ValueStreams["Value Streams"]
  Goals --> Objectives["Strategic Objectives"]
  Objectives --> Capabilities
  Objectives --> ValueStreams
  Initiatives --> Objectives
  Initiatives --> Capabilities
  Initiatives --> Applications
  ADRs --> Capabilities
  ADRs --> Applications
  ADRs --> Initiatives
  ADRs --> Objectives
  Principles --> Capabilities
  Principles --> ADRs
```

Applications are intentionally surfaced for services and objectives through linked capabilities rather than through direct service-to-application or objective-to-application joins. That keeps mission traceability anchored in capabilities.

## Relationship Patterns

| Pattern | Used for | Notes |
|---|---|---|
| Direct FK | Ownership and parent-child relationships | Example: content records to `organizations` |
| Junction table | Many-to-many relationships | Example: `application_capabilities`, `capability_personas` |
| Junction with metadata | Relationship plus meaning | Example: initiative capability/application impact labels |
| Relationship table without FK to target entity table | Cross-org links | Used where target entity type and organization vary |
| Derived relationship | Read model assembled from existing links | Example: applications shown on service/objective views through capabilities |

## Content Lifecycle

Most publishable content uses `workflow_status`:

| Status | Meaning |
|---|---|
| `draft` | Work in progress; generally hidden from viewers |
| `published` | Viewer-visible when route and visibility allow |
| `archived` | Retained for history but not current |

Some entities use domain-specific statuses:

- ADRs: `proposed`, `accepted`, `deprecated`, `superseded`
- Initiatives: `proposed`, `active`, `on-hold`, `complete`, `cancelled`

This split is intentional for now. Planning entities represent work lifecycle, while most architecture content follows publish/archive semantics.

## Data Architecture Module

The Data Architecture module adds a dedicated metamodel for data architecture work:

| Object | Purpose |
|---|---|
| Data entity | Business data concept or object being described |
| Data attribute | Data element or attribute with physical classification |
| Business key | Identifier associated with a data entity |
| Data link | Data Vault-style relationship/link object |
| Semantic relationship | Cross-object relation among entities and attributes |
| Diagram | Read-only Chen-style visualization of the current metamodel |

Data Architecture is connected to the same organization, role, workflow, and visibility rules as the rest of the repository.

## Taxonomy

Taxonomy is the shared controlled-vocabulary foundation. It supports domain and classification values across several product areas instead of creating one-off vocabulary tables for each entity.

Current uses include:

- capability domains
- persona types
- persona tags
- application type
- capability priority
- objective category
- initiative type
- decision category
- principle scope

When adding a new classification, prefer taxonomy if the value is user-manageable, org-scoped, and likely to be reused across records.

## Audit and Completeness

The repository is designed to be self-auditing:

- mutations should write audit events
- completeness signals identify missing or stale relationships
- repository-confidence summaries convert maintenance state into stakeholder-facing trust cues
- architecture debt records capture known concerns and system-detected lifecycle risk

Completeness and confidence should remain signals for better human judgment, not hidden automation that changes architecture content without review.

## Traceability Rules for New Work

When adding a new content type or major relationship:

1. Identify the persona and capability reason for the data.
2. Decide whether the relationship should be direct, many-to-many, derived, or cross-org.
3. Define viewer visibility and workflow behavior up front.
4. Add audit coverage for writes.
5. Update seed data when the feature should appear in the demo or GovEA Project dogfood org.
6. Update `docs/data-model.md` when the schema surface changes.

New implementation issues and PRs should continue using the traceability convention from `Standards.md`:

```text
Capability: <capability-id>
Persona: <persona name>
```
