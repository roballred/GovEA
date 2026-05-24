# Capability: Data Architecture

**Scope:** v1

## What It Does

The system must support the practice of Data Architecture as defined by the DAMA Knowledge Areas — capturing the data assets that exist in an organization, the structural model that relates them, and the layered representations (conceptual / logical / physical) that let architects, modelers, and database administrators each work at the level their role expects. The objective is to support a Data Architect and their team in a Data & Analytics organization end to end, not to ship a replacement for any dedicated modelling tool.

> ⚠️ This group is implemented from one SME conversation (Nichole) treated as the subject-matter expert. The Enterprise Data Architect and Data Modeler personas are both **Assumed**. Capabilities here carry elevated implementation risk until those personas are validated through direct user research with additional practitioners.

## Personas

- **Enterprise Data Architect** — owns the metamodel, governs methodology choice per layer, and reviews completed models against a scorecard; cannot personally produce every model
- **Data Modeler** — produces conceptual, logical, and physical models; cares about scorecard-grade structural soundness and metadata fidelity across layers

## Sub-Capabilities

| Capability | File | Status | Description |
|---|---|---|---|
| Physical Metamodel | [da-physical-metamodel.md](./da-physical-metamodel.md) | Shipped (v1) | Data Vault-aligned physical-layer metamodel: entities (Hubs), attributes (Satellites), links, and business keys, with four cross-object semantic relationship kinds |
| Chen Notation Visualization | [da-chen-visualization.md](./da-chen-visualization.md) | Shipped (v1) | Read-only Chen Notation graph rendering of the metamodel so architects can see the full picture rather than navigating object by object |

## Success Criteria

- A Data Architect can describe an organization's physical data model in GovEA — entities, characterizing attributes, links between entities, and business keys that identify each entity — without leaving the product
- The metamodel preserves the metadata a DBA needs to hand off into Data Vault physical generation: physical table name, server, database, schema, physical attribute type, physical link type, data type for business keys
- Cross-object semantic relationships (is related / instantiates / characterized by / shares) survive round-trips between objects and are queryable from either side
- A new modelling layer (conceptual, logical) can be added later without restructuring the physical-layer tables
- Stakeholders who are not Data Architects (e.g. Department Director, City Council Member) can view the model when published without seeing draft-only or sensitive structural detail

## Rules

- Data Architecture objects belong to an organization and follow the standard content workflow: draft → published → archived
- Cross-object semantic relationships must be enforced at the model level: invalid (sourceType, targetType, kind) combinations are rejected server-side, not just at the UI
- Symmetric relationship kinds (entity ↔ entity "is related"; attribute ↔ attribute "shares") are stored as undirected pairs — there is exactly one row per pair regardless of which side initiated it
- The cross-object semantic relationships never exceed organization scope without an explicit federation visibility setting on the participating objects
- A business key cannot exist without an owning entity; cascading delete from entity to its business keys is intentional

## Reference Sources

- **DAMA-DMBOK** — the canonical reference for the Knowledge Areas that scope this group. The SME's framing of v1 was Data Architecture + Data Modeling & Design, deferring the other nine DAMA areas
- **Data Vault 2.0** (Linstedt / Olschimke) — the physical-layer modelling methodology v1 is aligned with. Entities map to Hubs; Attributes map to Satellites; Links map to Links; Business Keys are the natural identifiers of Hubs
- **Chen Notation** — the conceptual / logical notation v1's visualization slice targets. Rectangles for entities, diamonds for relationships, ovals for attributes
- **TOGAF** treatment of DAMA Knowledge Areas as Capabilities — the SME's framing that informed how this work fits inside GovEA's existing capability model

## Out of Scope (v1)

- Conceptual and logical modelling layers as separate first-class object types. v1 is **physical-only**. Conceptual / logical can be added later; the physical-layer tables are designed not to require restructuring when they arrive
- Semantic modelling (IDEF1X) and UML
- Data Vault automation hooks that generate physical DDL from the metamodel. The fields collected in v1 are the necessary precondition for this future work but the generation itself is not in scope
- The Data Model Scorecard® as a tracked artifact inside GovEA. Useful concept; not in v1
- DAMA Knowledge Areas as first-class Capability seeds. Per the SME these are recognized as Level-1 capabilities in TOGAF treatment but seeding them is parked
- Data products (curated datasets / reports / feeds) as a distinct object. Per the SME, reports are out of scope for data management governance in this product

## Implementation Status

**Shipped (v1):**
- `da-physical-metamodel` via PRs [#471](https://github.com/roballred/EasyEA/pull/471) (schema + CRUD, schema actually merged at roballred/GovEA#471) and [#472](https://github.com/roballred/GovEA/pull/472) (cross-object semantic relationships). Four CRUD-able object types with the Data Vault metadata fields the SME specified; three cross-object semantic relationship junctions (entity ↔ entity, entity ↔ attribute, attribute ↔ attribute) plus the structural FK for entity ↔ business-key "instantiates"
- `da-chen-visualization` — `/data/diagram` ships the documented Chen Notation graph with all four filters, live counts, and read-only edit-back links. Confirmed during the Data Modeler persona journey audit ([#569](https://github.com/roballred/GovEA/issues/569))

## Links

- Depends on: `cms/iam`, `cms/admin-configuration`
- Related: `rm-end-to-end-traceability`, `rm-architecture-debt`, `cms/content-management`
