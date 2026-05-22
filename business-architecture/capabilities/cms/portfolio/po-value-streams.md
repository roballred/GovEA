# Capability: Value Stream Authoring

## What It Does

The system must allow contributors to define and maintain the organization's value streams — end-to-end sequences of stages that describe how government capabilities combine to deliver a measurable outcome to a specific stakeholder. Value streams make the connection between technology and mission explicit: each stage identifies the capabilities enabled at that point, so a reader can follow the full chain from persona need through capability to the applications that make delivery possible.

Value streams are authoring records, not just display artefacts. Creating and maintaining them is a deliberate architectural activity: an architect decides what the government delivers, who receives it, and which capabilities enable each step of that delivery.

## Implementation Status

**Implemented.** Full CRUD for value streams and stages. Stage ordering, capability assignment per stage, persona linkage, and objective linkage are all shipped.

Schema: `value_streams`, `value_stream_stages`, `value_stream_stage_capabilities`, `value_stream_personas` (`apps/govea/src/db/schema/value-streams.ts`)

Server actions: create, edit, delete, add/edit/delete/reorder stages, add/remove capability per stage (`apps/govea/src/actions/value-streams.ts`)

Admin UI: list view, detail view with inline stage and persona management (`apps/govea/src/app/(admin)/value-streams/`)

## Personas

- **CMS Contributor** — authors and maintains value stream records; adds stages and assigns capabilities
- **CMS Administrator** — has all Contributor permissions; can delete value stream records
- **Enterprise Architect (Central IT)** — uses value streams to communicate how the capability portfolio delivers outcomes to government service recipients; this is the EA practitioner's primary tool for making the mission-technology link legible
- **Agency EA Coordinator** — maintains their agency's value stream records as a sub-set of the enterprise view
- **Content Viewer** — reads published value streams and their stages through the frontend display

## Record Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | text | Yes | The name of the value stream, e.g. "Residential Permit Application" |
| Description | text | No | Narrative context: what problem this stream solves and for whom |
| Value Item | text | No | What is delivered to the stakeholder at the end of the stream, in plain language |
| Status | enum | Yes | `draft` / `published` / `archived` — standard content workflow |
| Visibility | enum | Yes | `org` / `connections` / `instance` — federation visibility |

## Stages

Each value stream contains an ordered sequence of stages. Stages are the atomic unit of a value stream — each stage represents a step in the delivery sequence. Stage ordering is integer-based and can be adjusted up or down by Contributors and Admins.

| Field | Type | Notes |
|---|---|---|
| Name | text | The name of this step in the delivery sequence |
| Description | text | What happens at this stage; optional |
| Order | integer | Zero-indexed; managed by up/down controls in the UI |
| Capabilities | many-to-many | Capabilities that are active at this stage, linked via `value_stream_stage_capabilities` |

A stage may link to zero or more capabilities. The same capability may appear in multiple stages and across multiple value streams.

## Relationships

| Relationship | Direction | Junction Table | Notes |
|---|---|---|---|
| Personas | Many-to-many | `value_stream_personas` | The stakeholder personas this stream serves; shown on the detail page |
| Capabilities (via stages) | Many-to-many | `value_stream_stage_capabilities` | Capabilities assigned at each stage; not a direct value_stream → capability link |
| Strategic Objectives | Many-to-many | `objective_value_streams` | Objectives that this value stream supports; linked from the Objective record |
| Services | Many-to-many | `service_value_streams` | Services that deliver through this value stream; linked from the Service record |

**Important:** Capabilities are linked to stages, not directly to the value stream. To see which capabilities a value stream involves, a reader must look at the stage-level links. This reflects the fact that different capabilities are active at different points in the delivery sequence — the stage structure makes that visible.

## Behaviors

- Create a value stream with name, description, value item, status, and visibility
- Edit all fields on an existing value stream
- Delete a value stream (Admin only; cascades to stages and all junction records)
- Add a stage with name and optional description; new stages are appended at the end
- Edit stage name and description
- Delete a stage (removes all capability assignments on that stage)
- Move a stage up or down in the ordered sequence
- Assign a capability to a stage; remove a capability from a stage
- Add and remove persona links on the value stream
- View the full value stream with ordered stages and capability badges on the detail page
- Viewers see only published value streams; Contributors and Admins see all statuses

## Rules

- Creating, editing stages, and assigning capabilities to stages requires Contributor or Admin role
- Deleting a value stream requires Admin role
- Deleting a stage does not require Admin — Contributors may delete stages they added
- Visibility defaults to `org`; Contributors may set `connections` or `instance`
- A value stream may have zero or more stages in v1 — stages are built incrementally
- All create, edit, and delete actions are written to the audit log with before/after values
- Viewers never see draft value streams; draft content is invisible to Viewer-role users regardless of visibility setting
- Cross-org federation visibility applies: a value stream marked `connections` is visible to members of connected organisations; `instance` is visible to all authenticated users on the instance

## Authoring vs. Display

The authoring capability (this document) covers creating and maintaining value stream records. The frontend display capability (`fd-value-streams.md`) covers the read-only view that Viewers and Department Directors consume. The key distinction:

| Authoring (this doc) | Display (`fd-value-streams.md`) |
|---|---|
| Create, edit, delete records | Read-only list and detail views |
| Stage management (add, reorder, delete) | Stages shown in order as a numbered sequence |
| Capability assignment per stage | Capabilities shown as linked badges per stage |
| Persona and objective linkage | Persona badge and stakeholder context |
| Draft and archived records visible | Published records only |

## Links

- Depends on: `iam-rbac`, `cm-content-workflow`, `po-capability-map`, `iam-audit-trail`
- Related: `fd-value-streams.md`, `po-application-portfolio`, `pl-strategic-objectives`
