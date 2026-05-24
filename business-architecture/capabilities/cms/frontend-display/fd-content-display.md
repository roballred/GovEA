# Capability: Content Display

## What It Does
The system must render viewer-visible content items in a clear, readable layout that non-technical users can understand without EA training or a manual.

## Personas
- **Content Viewer** — reads content items to answer questions about the organization's applications, capabilities, and personas

## Behaviors
- Display a viewer-visible content item with all its fields rendered in a human-readable layout
- Show field labels in plain language — not internal field names or technical identifiers
- Display the last published date so viewers know the content is current
- Show the content type clearly so viewers understand what they are looking at
- Render rich text fields with formatting intact
- Display taxonomy tags with links to filtered views of the same term
- Show related content items with links to navigate to them
- On shipped admin detail pages, show relationship panels inline with the rest of the content rather than sending editors back to separate list views
- Expose edit affordances only to permitted users while keeping the same detail pages useful to Viewers

## Plain-Language Standard

Content displayed to Viewers must avoid EA jargon — specifically terms that assume familiarity with enterprise architecture practice and have no plain-language equivalent apparent from context. Terms to avoid in labels, headings, and descriptive copy:

| Avoid | Use instead |
|---|---|
| Capability | Business capability, or just the capability name |
| Persona | Who this serves, or the role name |
| ADR / Architecture Decision Record | Decision record, or Technology decision |
| Traceability | How this connects to… |
| Lifecycle status | Status (Active / Retiring / Planned) |
| Decommissioned | Retired |
| Value stream | How we deliver… / Service process |
| Taxonomy | Category / Topic |

This list is provisional. It should be validated against real users — specifically the Content Viewer persona — before front-end copy is finalized.

## Rules
- Core workflow-governed content is rendered for Viewers only when published; ADRs and initiatives follow their explicit viewer-status mappings from Content Workflow
- Field labels and content must not expose internal system identifiers or technical metadata
- Content display must not require JavaScript to render — core content is server-rendered
- Editor-only enhancements such as inline relationship management should layer on top of the read-only detail page rather than replacing it

## Implementation Status
Shipped (v1). All seven core content types have detail pages with plain-language field labels, taxonomy chips, related-content panels, and inline edit affordances gated by RBAC. Server-rendered. The plain-language label audit is partially complete; remaining viewer-experience polish is tracked under #556.

## Links
- Depends on: Content Management — Content Authoring, Content Management — Content Workflow
- Related: Navigation, Relationship Navigation, Responsive Layout
