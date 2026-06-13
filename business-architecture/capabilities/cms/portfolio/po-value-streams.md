# Capability: Value Stream Authoring

## What It Does

The system must allow contributors to define and maintain the organization's value streams — end-to-end sequences of stages that describe how government capabilities combine to deliver a measurable outcome to a specific stakeholder. Value streams make the connection between technology and mission explicit: each stage identifies the capabilities enabled at that point, so a reader can follow the full chain from persona need through capability to the applications that make delivery possible.

Value streams are authoring records, not just display artefacts. Creating and maintaining them is a deliberate architectural activity: an architect decides what the government delivers, who receives it, and which capabilities enable each step of that delivery.

## Implementation Status

**Implemented.** Full CRUD for value streams and stages. Stage ordering, stage-level capability assignment, direct (stream-level) capability mapping, persona linkage, and objective linkage are all shipped.

Schema: `value_streams`, `value_stream_stages`, `value_stream_stage_capabilities`, `value_stream_capabilities` (direct stream-level links, #734), `value_stream_personas` (`apps/govea/src/db/schema/value-streams.ts`)

Server actions: create, edit, delete, add/edit/delete/reorder stages, add/remove capability per stage (`apps/govea/src/actions/value-streams.ts`); `linkValueStreamCapability` / `unlinkValueStreamCapability` for direct stream-level links (`apps/govea/src/actions/links.ts`)

Admin UI: list view, a read-only detail view (ordered stages, stage capability badges, linked capabilities and personas), and a dedicated edit view (`/value-streams/[id]/edit`) where Contributors/Admins manage details, stages, stage capabilities, stream-level capabilities, and personas. Detail view authoring was moved to the edit view in #726 so the detail page stays read-oriented. (`apps/govea/src/app/(admin)/value-streams/`)

## Personas

- **Enterprise Architect (Central IT)** — uses value streams to communicate how the capability portfolio delivers outcomes to government service recipients; this is the EA practitioner's primary tool for making the mission-technology link legible
- **Agency EA Coordinator** — maintains their agency's value stream records as a sub-set of the enterprise view
- **Department Director** — reads value streams to see how their department's services map to enabling capabilities

> RBAC roles (Admin / Contributor / Viewer) are not personas. See [`iam-role-based-access-control.md`](../iam/iam-role-based-access-control.md); role behavior is reflected in `## Rules` below.

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
| Capabilities (direct) | Many-to-many | `value_stream_capabilities` | Capabilities that apply to the **whole** value stream (#734); shown in the stream-level Business Capabilities panel |
| Capabilities (via stages) | Many-to-many | `value_stream_stage_capabilities` | Capabilities active at a **specific stage**; shown as badges on each stage |
| Strategic Objectives | Many-to-many | `objective_value_streams` | Objectives that this value stream supports; linked from the Objective record |
| Services | Many-to-many | `service_value_streams` | Services that deliver through this value stream; linked from the Service record |

**Two kinds of capability link (#734).** A value stream can map to capabilities in two distinct ways, and the two are reported separately so a reader can always tell which is which:

- **Direct (stream-level)** — `value_stream_capabilities`. The capability applies to the entire stream, without forcing the author to repeat it on every stage. Use this for stream-wide concerns and stream-level coverage summaries.
- **Stage-level** — `value_stream_stage_capabilities`. The capability is active at a specific step. This remains the right model when different capabilities are active at different points in the delivery sequence.

Both are first-class. Stage-level mapping is unchanged by #734; the direct link is additive. (Prior to #734 the model supported stage-level links only — this document intentionally changed that.)

## Behaviors

- Create a value stream with name, description, value item, status, and visibility
- Edit all fields on an existing value stream
- Delete a value stream (Admin only; cascades to stages and all junction records)
- Add a stage with name and optional description; new stages are appended at the end
- Edit stage name and description
- Delete a stage (removes all capability assignments on that stage)
- Move a stage up or down in the ordered sequence
- Assign a capability to a stage; remove a capability from a stage
- Link and unlink a capability directly to the whole value stream (stream-level), shown in a Business Capabilities panel distinct from per-stage badges
- Add and remove persona links on the value stream
- View the full value stream with ordered stages and capability badges on the detail page
- Viewers see only published value streams; Contributors and Admins see all statuses

## Rules

- Creating, editing stages, and assigning capabilities (per stage or directly to the stream) requires Contributor or Admin role
- Direct stream-level capability links are organization-scoped: the value stream and the capability must belong to the caller's organization, enforced by the local junction — a stream can never link to another org's capability (consistent with #415 junction-ownership rules)
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
