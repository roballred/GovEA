# Capability: Persona Type Management

## What It Does
The system must allow organization administrators to manage the taxonomy-backed persona type vocabulary available within their organization. Persona types are modeled as values under the top-level `Persona Type` taxonomy type, and those values drive persona classification and filtering in the personas UI.

## Personas
- **CMS Administrator** — manages the `Persona Type` taxonomy branch so persona classification stays consistent with the organization's language

## Behaviors
- Display persona types through the Taxonomy Management page, not a dedicated standalone persona-type list
- Allow administrators to create a top-level `Persona Type` taxonomy type if it does not exist yet
- Allow administrators to add, edit, and delete persona type values under that taxonomy type
- Use persona type values in the persona create/edit dialog and the type filter on the personas page
- Keep existing persona records stable when a taxonomy value is deleted — the stored `personas.type` text remains until the persona is edited
- Seed common starting values such as Citizen, Staff, Elected Official, and External Partner through the taxonomy seed/bootstrap flow

## Rules
- Persona types are organization-scoped taxonomy values, not a dedicated table or enum
- Only Admins may delete persona type taxonomy terms; Admins and Contributors may create or edit taxonomy terms through Taxonomy Management
- Persona type values must be unique within the `Persona Type` branch for an organization
- Removing a persona type does not cascade to null out existing personas — they retain their stored type label until edited
- The `Persona Type` taxonomy branch is the source of truth for current selectable options in the UI

## Implementation Status
Shipped (v1). Persona type values are managed through the Taxonomy Management page under the `Persona Type` branch; the personas page exposes a type filter and the create/edit dialogs use taxonomy-backed values.

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Taxonomy Management
- Enables: Content Management — Personas
