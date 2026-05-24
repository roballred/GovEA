# Capability: Value Stream Display

## What It Does
The system must allow users to view the organization's value streams — end-to-end sequences of stages that deliver a measurable outcome to a specific stakeholder persona. The value stream display bridges the gap between strategic intent and operational capabilities, making it visible to non-technical stakeholders which capabilities combine to serve each persona.

## Personas
- **Enterprise Architect** — authors and maintains value streams; uses them to communicate portfolio rationale to leadership
- **Agency EA Coordinator** — views value streams to understand how their agency capabilities connect to enterprise-wide outcomes
- **Department Director** — reads value streams to understand what IT investments are enabling their service delivery
- **CMS Administrator** — manages value stream records and stage composition

## Behaviors
- Display a list of value streams with name, stakeholder persona, stage count, status, and visibility
- Allow filtering by status
- Clicking a value stream name navigates to the detail page
- Detail page displays: name, description, value item (what is delivered), stakeholder persona badge, status badge, visibility badge
- Stages are displayed in order as a numbered sequence; each stage shows its name, description, and the capabilities enabled at that stage
- Capabilities within a stage are shown as linked badges
- Admins and contributors can manage stages inline on the detail page (add, remove, reorder via up/down)
- Admins and contributors can assign and remove capabilities per stage

## Rules
- All roles (admin, contributor, viewer) can view value streams and their detail pages
- Only admins and contributors may create, edit, or delete value streams
- Only admins and contributors may add, remove, or reorder stages
- Only admins and contributors may assign or remove capabilities from stages
- A value stream may have zero or more stages in v1 (stages are built incrementally)
- A stage may link to zero or more capabilities
- A capability may appear in multiple value streams and in multiple stages

## Implementation Status
Shipped (v1). Value streams have list and detail pages with stakeholder persona, value item, ordered stages, per-stage capability assignment, and inline stage management for admins and contributors.

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Personas, Content Management — Capabilities
- Related: Strategic Objectives, Initiatives
