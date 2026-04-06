# Capability: Persona Type Management

## What It Does
The system must allow organization administrators to define and maintain the list of persona types available within their organization. Persona types are used to categorize personas (e.g. Citizen, Staff, Elected Official, External Partner) and drive filtering in the personas UI. Each organization controls its own type list independently.

## Personas
- **CMS Administrator** — creates, renames, and removes persona types to match the organization's classification needs

## Behaviors
- Display the current list of persona types scoped to the administrator's organization
- Allow administrators to add a new type by entering a name (duplicate names within the same org are rejected)
- Allow administrators to remove a type; existing personas that used the removed type retain the type value as a text label but it no longer appears in the type selector
- Persona type names are treated as plain text — no enum constraint in the database
- Default types (Citizen, Staff, Elected Official, External Partner) are seeded at bootstrap for new organizations; administrators may delete them
- Type list is used in the persona create/edit dialog and the type filter on the personas page

## Rules
- Only Admins may add or remove persona types — Contributors and Viewers cannot
- Type names must be unique within an organization; instance-level uniqueness is not required
- Removing a type does not cascade to update or null personas — personas retain their stored type string
- No rename operation in v1; to rename, delete the old type and add the new one

## Links
- Depends on: IAM — Role-Based Access Control
- Used by: Content Management — Personas
