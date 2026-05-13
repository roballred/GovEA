# Persona: Enterprise Data Architect

**Validation Status: Assumed** — drafted from an extended design conversation with one SME (Nichole) over multiple weeks. Reflects the SME's stated practice and DAMA framing, but has not been confirmed against other practitioners. Moves to Validated when at least one additional interview or direct observation with a real enterprise data architect in a state or local government context corroborates the goals, pain points, and critical insight below.

## Role Type
Internal — Central IT / Data & Analytics organization

## Who They Are
The Enterprise Data Architect owns the data architecture strategy and modelling standards across the organization. They are accountable for the integrity of the metamodel — what data assets exist, how they relate to each other, and what conceptual / logical / physical layers govern their representation. They do not necessarily produce every data model themselves; they oversee Data Modelers and Database Administrators, recommend modelling methodologies (Chen, Crow's Foot, Data Vault, Dimensional), and govern that the methodologies chosen for a given storage layer are appropriate to that layer's purpose. They are typically also the bridge between business analysts framing conceptual entities and DBAs designing physical tables.

## Goals
- Maintain an authoritative metamodel of entities, attributes, relationships, and business keys that the rest of the data team can build against
- Govern the choice of modelling methodology per layer (conceptual, logical, physical) so each model fits its purpose
- Trace conceptual subject areas through logical entities to physical tables — without that traceability, downstream lineage and impact analysis are unreliable
- Review and score completed data models against an explicit scorecard (e.g. Steve Hoberman's Data Model Scorecard®) so quality is measurable
- Surface and govern technical debt in the physical model (space utilization, query performance, schema drift) before it compounds
- Stay aligned with DAMA Knowledge Areas as the canonical scope of "what a data management organization does"

## Pain Points
- Most enterprise data modelling tools optimize for one notation or one methodology; switching layers means switching tools, and traceability across them is manual at best
- Business Intelligence and report development frequently bypass governance — reports get built on data sets whose conceptual ↔ logical ↔ physical lineage is incomplete
- Conceptual entities and glossary terms get conflated, which causes the glossary to drift into doing metamodel work it shouldn't own
- Data Modelers and Database Administrators sometimes disagree on where the boundary between logical model and physical table lives; without an explicit convention this disagreement re-litigates per project
- "Master Data Management" terminology carries connotations that make modern teams uncomfortable; framing matters when surfacing data domains

## Critical Insight
The Enterprise Data Architect rarely needs to be the one drawing the diagram, but they always need to be the one who can defend its scorecard. The product must support modelling activities they do not perform directly — and must let them explain the resulting model in plain language to non-technical stakeholders. If the tool optimizes only for the modeler's screen and forgets the architect's review conversation, the architect stops using it.

## Relevant Capabilities
- `da-physical-metamodel` — authoritative store of entities, attributes, links, and business keys at the physical layer
- `da-chen-visualization` — read-only graph rendering of the metamodel in a Data Architect-familiar notation
- `ea/data-architecture` (group) — the broader Data Architecture capability set this persona depends on
- `rm-architecture-debt` — applies the same severity-tier vocabulary to data-layer debt as to the broader architecture
