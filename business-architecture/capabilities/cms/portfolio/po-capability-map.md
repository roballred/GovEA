# Capability: Capability Map

## What It Does
The system must allow contributors to define and maintain the organization's business capabilities — the things the organization does, independent of how they are implemented. Capabilities are organized by domain and linked to the applications that support them and the personas that depend on them.

## Personas
- **CMS Contributor** — creates, edits, and publishes capability records
- **CMS Administrator** — has all Contributor permissions; can delete records
- **Content Viewer** — reads published capabilities through the front-end capability map view
- **Department Director** — uses the capability map to understand what the organization does and where technology supports it

## Behaviors
- Create a capability with: name, description, domain, workflow status, and visibility
- Link a capability to one or more personas
- Edit all fields on an existing capability record
- Delete a capability record (Admin only)
- View all capabilities in a table, sortable by name
- Filter capabilities by domain on the front-end capability map view
- Navigate from a capability to its linked applications and personas

## Domain
Free-text field used to group capabilities into top-level areas (e.g., "Citizen Services", "Finance", "HR", "IT"). Domain values are not controlled by a taxonomy in v1 — contributors enter them manually.

## Rules
- Capabilities are the anchor entity in the EasyEA methodology — applications link to capabilities, and capabilities link to personas
- Deleting a capability removes all `application_capabilities` and `capability_personas` junction records via cascade
- Deletion is Admin-only
- All create, edit, and delete actions are written to the audit log
- Visibility defaults to `org`
- Only published capabilities appear in front-end views

## Implementation Status
Fully implemented in v1:
- Schema: `capabilities` table, `capability_personas` junction table (`apps/govea/src/db/schema/capabilities.ts`)
- Server actions: create, edit, delete, get (`apps/govea/src/actions/capabilities.ts`)
- Admin UI: list view, detail view, create/edit forms (`apps/govea/src/app/(admin)/capabilities/`)

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Content Workflow
- Related: Application Portfolio, Frontend Display — Portfolio Views, Personas
