# Capability: Content Authoring

## What It Does
The system must allow Contributors and Admins to create, edit, and preview content items of any defined content type. The authoring experience must be clear and usable by non-technical staff.

## Personas
- **CMS Administrator** — creates and edits content; manages content on behalf of the organization
- **Content Viewer** — reads published content produced through this capability

## Behaviors
- Create a new content item of any defined content type
- Edit an existing content item
- Preview a content item before publishing
- Save a draft without publishing
- Delete a content item (Admin only)
- Duplicate an existing content item as a starting point for a new one
- Validate required fields and show clear error messages before saving

## Rules
- Contributors can create and edit but not delete content
- Admins can create, edit, and delete content
- Viewers cannot create or edit any content
- Saving always creates a new version — edits never overwrite history
- A content item cannot be published if required fields are empty

## Implementation Status
Shipped (v1). All seven core content types (capabilities, applications, personas, services, value streams, objectives, ADRs) have full CRUD authoring with create/edit dialogs, required-field validation, draft/published workflow, and duplicate-name guard rails (#615/#619).

## Links
- Depends on: Content Types, IAM — Role-Based Access Control
- Related: Content Workflow, Content Versioning, Content Relationships
