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

## Rules
- Content type changes must not destroy existing content — removing a field hides it, it does not delete stored data
- At least one field must be designated as the display title for each content type
- Content type names must be unique within an organization
- Content types must be scoped to an organization
- Built-in content types (Organization, Persona, Capability, Application, ADR) are editable but not deletable in v1

## Links
- Depends on: IAM — Role-Based Access Control
- Related: Content Authoring, Content Relationships, Taxonomy Management
