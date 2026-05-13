# Persona: Data Modeler

**Validation Status: Assumed** — drafted from the same design conversation that produced `enterprise-data-architect.md`. The role boundary between Data Modeler, Business Analyst, and Database Administrator is described from the SME's practice but not yet corroborated against other organizations. Moves to Validated when at least one interview or direct observation with a working data modeler in a state or local government context confirms the goals, pain points, and the conceptual ↔ logical ↔ physical boundary described below.

## Role Type
Internal — Data & Analytics organization, individual contributor

## Who They Are
The Data Modeler produces conceptual, logical, and physical data models — though "physical" in this persona's scope means the third-normal-form relational model or the dimensional/tabular model for serving. They typically do not produce the intermediary Data Vault layer (DBAs own that) and they typically do not own the conceptual model's authoritative form (Business Analysts share that responsibility). They work day-to-day in modelling tools and care about the structural soundness of what they produce — primary keys, normalization, naming, readability, definitions — measured against a model scorecard.

## Goals
- Produce data models that score well against the Steve Hoberman Data Model Scorecard® — capture requirements, structurally sound, well-named, well-defined, consistent with the enterprise
- Move efficiently between modelling notations as the layer requires (Chen Notation for conceptual / logical, normalized or dimensional for physical serving layers)
- Hand off a model to a Database Administrator with enough metadata that the physical implementation (Data Vault hubs / sats / links, or 3NF tables, or dimensional facts / dims) can be generated rather than re-translated
- Keep entities, attributes, and relationships traceable across layers so a downstream change request can be assessed for impact before it lands

## Pain Points
- Most tools force a single notation; switching between Chen and normalized form means re-drawing or losing definitions
- Naming standards drift when there is no enforced linter or scorecard hook in the tool
- Definitions captured at the conceptual stage tend to get lost by the physical stage; metadata loss is the silent killer of model quality
- Generic structures (abstracting Customer Location to a more reusable Location) are hard to advocate for inside tools optimized for diagram aesthetics rather than reuse
- A model that scores well technically but doesn't match the actual data stored in the resulting tables is worthless — the modeler has no easy way to keep model and data in sync without DBA participation

## Critical Insight
A Data Modeler succeeds when the model they hand off survives contact with the data. Tools that make the diagram pretty without preserving definitions, naming standards, and traceability across layers reward the wrong work. The product should treat the model's metadata — owner, definitions, naming, source-to-target lineage — as a first-class deliverable equal in weight to the diagram itself.

## Relevant Capabilities
- `da-physical-metamodel` — captures the physical-layer model (Data Vault hub / sat / link) with the metadata fields needed to hand off to a DBA
- `da-chen-visualization` — supports the modeler's preferred notation for conceptual / logical work and for explaining the physical model back to stakeholders
- `ea/data-architecture` (group) — the broader Data Architecture capability set
