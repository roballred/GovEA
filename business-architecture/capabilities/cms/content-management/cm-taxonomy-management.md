# Capability: Taxonomy Management

## What It Does
The system must provide an organization-scoped taxonomy system that content items can be tagged against. GovEA currently ships with a seeded Domain vocabulary and a full admin UI for defining additional taxonomy types and values as agencies need them.

## Personas
- **CMS Administrator** — manages taxonomy terms; customizes the default taxonomy to fit the agency
- **Content Viewer** — navigates and filters content by taxonomy term

## Behaviors
- Define taxonomy types (for example `Domain`)
- Add, edit, and delete taxonomy values within a type
- Organize values under a type using parent/child relationships where needed
- Tag content items with taxonomy values
- Filter content lists by taxonomy value
- Seed a standard government Domain vocabulary with 10 starter values
- Create new domain values inline from capability and glossary forms when the needed value does not already exist

## Seeded Domain Values
Administrative Services, Public Safety, Infrastructure & Public Works, Community Development, Health & Human Services, Parks/Recreation/Culture, Transportation, Information Technology, Finance & Revenue, Legislative & Executive

## Rules
- Deleting a taxonomy term does not delete content tagged with it — the tag is removed from the content item
- Taxonomy types and values must be scoped to an organization
- Taxonomy values must be unique within their type for that organization
- The seeded Domain vocabulary is editable — agencies can rename, add, or remove values
- Capability and glossary forms should prefer taxonomy-backed Domain values rather than free-text drift

## Links
- Depends on: Content Types
- Related: Content Authoring, Content Search & Filtering
