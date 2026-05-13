# Capability: Physical Metamodel

## What It Does

Captures the organization's physical data model as a first-class set of objects inside GovEA: the entities (Hubs in Data Vault terms) that represent subject things, the attributes (Satellites) that characterize them, the links between entities (Data Vault Links), and the business keys that identify each entity. Each object carries the physical-layer metadata a database administrator needs to generate the corresponding physical table — physical table name, server, database, schema, plus type tags appropriate to its role. Cross-object semantic relationships ("is related," "instantiates," "characterized by," "shares") are tracked separately from the structural metadata so the same model can be queried as a graph for downstream analysis.

The objective is not to replace a dedicated data modelling tool. The objective is to make the model an addressable part of the broader architecture repository, so a Data Architect can answer "what is this entity, who owns it, what physical table is it stored in, and what does it relate to" without leaving GovEA.

## Personas

- **Enterprise Data Architect** — needs an authoritative store of the metamodel that survives turnover in the Data Modeler / DBA team; needs to defend the model's scorecard, not necessarily draw every diagram
- **Data Modeler** — needs the metadata captured at modelling time to survive into the physical layer, so the hand-off to a DBA does not lose definitions, naming, or owner attribution

> ⚠️ Enterprise Data Architect and Data Modeler are **Assumed** personas. The behaviors below reflect one SME's stated practice; validation through direct user research with additional practitioners is required before treating the design as settled.

## Behaviors

- Create, edit, and delete **Entities** with: name, description, owners (multi-persona), workflow status (draft / published / archived), federation visibility (org / connections / instance), and physical Hub table name plus server / database / schema
- Create, edit, and delete **Attributes** with the same base metadata plus physical Satellite table name and a physical attribute type tag (Effectivity, Multi-Active, Record Tracking, Status Tracking)
- Create, edit, and delete **Links** (Data Vault Link tables) with the same base metadata plus physical Link table name and a physical relationship type tag (Same-As, Hierarchical)
- Create, edit, and delete **Business Keys** with name, description, owners, data type, and a non-nullable reference to the owning entity (the Hub the business key instantiates)
- Manage cross-object semantic relationships in three kinds:
  - entity ↔ entity — "is related" (undirected; canonical-ordered pair)
  - entity ↔ attribute — "is characterized by" / "characterizes"
  - attribute ↔ attribute — "shares" (undirected; canonical-ordered pair)
- View the fourth kind — entity ↔ business key "instantiates / is instantiated by" — surfaced via the existing structural FK (each business key has a non-null owning entity)
- View linked items as inline panels on the detail page of each object (Entity detail shows related entities, characterizing attributes, and instantiating business keys; Attribute detail shows shares-with attributes; Business Key detail shows owning entity)
- Edit cross-object relationships on a dedicated `relationships` sub-page per object so the basic-fields edit form is not bloated with multi-pickers

## Rules

- All metamodel objects belong to an organization and follow the standard content workflow: draft → published → archived
- Viewer-role users see only published objects; the federation read filter is applied via the standard `canReadFederatedEntity` helper
- A business key cannot exist without an owning entity; the database enforces this with a non-nullable foreign key. Deleting an entity cascades to its business keys — this is intentional model integrity, not data loss
- The owning entity of a business key must belong to the same organization as the business key itself; a guessed cross-org entity ID is rejected server-side
- All cross-object relationship kinds enforce src/tgt type validity server-side. Invalid (sourceType, targetType, kind) combinations are rejected, not just hidden in the UI
- Symmetric relationship kinds (entity ↔ entity "is related"; attribute ↔ attribute "shares") are stored as undirected canonical pairs (smaller UUID stored first). The database constraint prevents two rows for the same undirected pair
- Self-relationships are silently filtered out at the server-action layer (an entity cannot be related to itself; an attribute cannot share with itself)
- Cross-object relationship operations replace the relationship set atomically — the form sends the desired final state, the server computes the diff
- Only Contributors and Admins can mutate objects or their relationships; only Admins can delete
- Audit log entries are written for every create / update / delete and for every relationship-set replacement

## Implementation Status

**Shipped (v1):** Schema, CRUD server actions, owner-junction tables, and the full set of UI pages (hub at `/data`, per-resource index / new / detail / edit / relationships) landed in GovEA via:

- [#471](https://github.com/roballred/GovEA/pull/471) — schema + CRUD foundation. Four tables + four owner junctions + two enum types
- [#472](https://github.com/roballred/GovEA/pull/472) — cross-object semantic relationships. Three relationship tables + server actions + relationship-edit sub-pages

Persona seeds for Enterprise Data Architect and Data Modeler ship as dev fixtures from #471.

## Links

- Depends on: `cms/iam`, `iam-user-management` (owners are personas, which require persona management)
- Enables: `da-chen-visualization`
- Related: `rm-end-to-end-traceability`, `rm-architecture-debt`
