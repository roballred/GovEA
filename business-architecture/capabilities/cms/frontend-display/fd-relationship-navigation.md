# Capability: Relationship Navigation

## What It Does
The system must allow users to traverse the connections between content items — moving from an Application to its Capabilities, from a Capability to its Personas, and back — so that the full EA picture is navigable without a separate diagram tool.

## Personas
- **Content Viewer** — follows relationships to answer questions like "what systems support permitting?" or "who does this capability serve?"

## Behaviors
- Display all related content items on a content detail page with links to navigate to each
- Show reverse relationships — e.g. on a Capability page, show all Applications that link to it
- Display the relationship type clearly so the viewer understands the connection
- Allow navigation in both directions across any relationship
- Show a summary count of related items when the full list is long (e.g. "12 Applications")
- Support inline add/remove relationship management on shipped detail pages for Admin and Contributor users
- Keep relationship panels read-only for Viewer users while preserving the same navigation affordances

## Core Navigable Relationships

| From | To | Direction |
|---|---|---|
| Application | Capability | Forward and reverse |
| Capability | Persona | Forward and reverse |
| ADR | Capability | Forward and reverse |
| ADR | Application | Forward and reverse |
| Objective | Capability / Value Stream / Application | Forward and reverse |
| Initiative | Capability / Objective / Application | Forward and reverse |
| Principle | Capability / Decision | Forward and reverse |

## Rules
- Only published related items are shown to Viewers — unpublished related items are hidden without error
- Relationship navigation must work without JavaScript — links are standard anchor elements even where editor-only controls use client-side enhancement
- Broken relationships (linked item deleted or unpublished) must not surface as errors to the Viewer — they are silently excluded
- Inline relationship edits must respect role and ownership checks before persisting changes

## Implementation Status

**Shipped (v1).** Linked entities (capabilities, personas, applications, ADRs, initiatives, objectives) render as clickable links on every detail page exercised so far. "View map →" and "View traceability →" affordances on capability detail pages provide drill-down paths into richer relationship views. Confirmed during the Content Viewer ([#552](https://github.com/roballred/GovEA/issues/552)) and Department Director ([#557](https://github.com/roballred/GovEA/issues/557)) persona journey audits.

## Links
- Depends on: Content Display, Content Management — Content Relationships
- Related: Portfolio Views, Navigation
