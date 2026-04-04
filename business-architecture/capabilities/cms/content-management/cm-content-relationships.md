# Capability: Content Relationships

## What It Does
The system must allow content items to be linked to other content items, enforcing the core GovEA constraint that every Application links to a Capability and every Capability links to a Persona.

## Personas
- **CMS Administrator** — defines and manages relationships between content items
- **Content Viewer** — navigates relationships to understand how applications, capabilities, and personas connect

## Behaviors
- Link a content item to one or more items of another content type (e.g. Application → Capability)
- Display related content items on the detail view of a content item
- Enforce required relationship rules at publish time
- Navigate from any content item to its related items
- Display reverse relationships (e.g. view all Applications linked to a Capability)

## Core Relationship Rules (GovEA)

| From | To | Rule |
|---|---|---|
| Application | Capability | Required — at least one |
| Capability | Persona | Required — at least one |
| ADR | Capability | Optional |
| ADR | Application | Optional |

## Rules
- Required relationships must be satisfied before a content item can be published
- Deleting a content item that is referenced by another item must warn the user and list the dependent items
- Relationships are bidirectional — both sides are visible in the UI

## Links
- Depends on: Content Types, Content Authoring
- Related: Content Workflow, Content Search & Filtering
