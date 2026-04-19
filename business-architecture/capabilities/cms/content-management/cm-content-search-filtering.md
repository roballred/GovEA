# Capability: Content Search & Filtering

## What It Does
The system must allow users to find content items quickly using list-level filtering, taxonomy context, and an embedded repository-wide search experience that works without an external search service in v1.

## Personas
- **CMS Administrator** — searches across all content to manage the repository
- **Content Viewer** — searches and filters to find published content relevant to their question

## Behaviors
- List-level filtering and search within the current screen
- Repository-wide search across shipped EA entity types from a shared search surface
- Filter content by content type
- Filter content by taxonomy term
- Filter content by workflow state (Admins and Contributors only)
- Filter content by owning department or organization
- Display filtered results with content type, title, and workflow state where those fields are available

## Rules
- Viewers can only search and filter content visible to their role. For the core workflow-backed model that means published content only; for planning entities and ADRs, Viewer search follows the documented role-to-status mappings.
- Repository-wide search must work without an external search service in v1
- Filters are additive — multiple filters narrow results
- Empty filters return all content matching the current screen and role context

## Links
- Depends on: Content Authoring, Content Workflow, Taxonomy Management
- Related: Content Relationships, IAM — Role-Based Access Control
