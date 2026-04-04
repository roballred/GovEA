# Capability: Content Search & Filtering

## What It Does
The system must allow users to find content items quickly across the repository by searching on text and filtering by type, taxonomy, workflow state, and other attributes.

## Personas
- **CMS Administrator** — searches across all content to manage the repository
- **Content Viewer** — searches and filters to find published content relevant to their question

## Behaviors
- Full-text search across all published content (Viewers) or all content (Admins and Contributors)
- Filter content by content type
- Filter content by taxonomy term
- Filter content by workflow state (Admins and Contributors only)
- Filter content by owning department or organization
- Sort results by relevance, name, or last modified date
- Display search results with content type, title, and workflow state

## Rules
- Viewers can only search and filter published content — draft and archived content is never returned in their results
- Search must work without an external search service in v1 — embedded/local search only
- Filters are additive — multiple filters narrow results
- Empty search with filters applied returns all content matching the filters

## Links
- Depends on: Content Authoring, Content Workflow, Taxonomy Management
- Related: Content Relationships, IAM — Role-Based Access Control
