# Capability: Content Types

## What It Does
The system must allow administrators to define and configure the structure of content — what fields exist, what types they are, and what rules apply — entirely from the admin UI without writing code.

## Personas
- **CMS Administrator** — defines and maintains content type schemas as the organization's needs evolve

## Behaviors
- Define a content type with a name, label, and set of fields
- Add, edit, and remove fields from an existing content type
- Supported field types: text, rich text, boolean, date/time, number, taxonomy, relation (link to another content type), URL
- Mark fields as required or optional
- Configure field-level validation rules
- Enable or disable workflow and audit trail per content type
- Preview the content type form before publishing the schema

## Data Classification Field

All content types should support an optional **sensitivity classification** field. This is not a full access control system — it is a signal field that surfaces the data sensitivity question before content is published.

Recommended values:

| Value | Meaning |
|---|---|
| Public | Suitable for public-facing display; no sensitivity concerns |
| Internal | For internal agency use; not for public release |
| Restricted | Sensitive content; review before sharing outside the team |

- Classification is set by the contributor at authoring time; it defaults to Internal if not set
- Classification does not gate access in v1 — that is a v2 concern — but it must be visible to Admins and surfaced in the Admin Dashboard
- Agencies with specific data classification standards (e.g. CUI, FOUO) should map those to these three values rather than extending the field in v1

## Rules
- Content type changes must not destroy existing content — removing a field hides it, it does not delete stored data
- At least one field must be designated as the display title for each content type
- Content type names must be unique within an organization
- Content types must be scoped to an organization
- Built-in content types (Organization, Persona, Capability, Application, ADR) are editable but not deletable in v1

## Implementation Status
Partial. The seven core content types (Capability, Application, Persona, Service, Value Stream, Strategic Objective, ADR) are shipped as fixed Drizzle schemas with required/optional fields, validation, and taxonomy-backed relations. Admin-driven schema definition (adding new content types or fields without code changes) is **not yet implemented** — content types are code-defined in v1, not user-defined.

## Links
- Depends on: IAM — Role-Based Access Control
- Related: Content Authoring, Content Relationships, Taxonomy Management
