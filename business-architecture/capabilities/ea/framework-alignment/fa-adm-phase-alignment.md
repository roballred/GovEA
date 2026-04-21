# Capability: ADM Phase Alignment

## What It Does

The system must allow TOGAF-aware teams to optionally tag GovEA content to Architecture Development Method (ADM) phases so they can understand which records support architecture vision, domain architecture, migration planning, implementation governance, and architecture change work.

ADM phase alignment is a view over existing GovEA content. It is not a mandatory workflow engine and does not require every organization to follow TOGAF.

## Personas

- **Enterprise Architect (Central IT)** — wants a recognizable way to organize architecture evidence across ADM-style work
- **Agency EA Coordinator** — wants to show central IT or auditors how local content supports an architecture cycle without duplicating records
- **CMS Administrator** — needs to enable or disable ADM phase tagging through configuration

## Behaviors

- Tag GovEA records to one or more ADM phases when a TOGAF overlay is enabled
- View records grouped by ADM phase for architecture review or planning
- Identify missing evidence for an ADM phase without blocking ordinary GovEA use
- Use ADM phase tags in reports and governance summaries

## Rules

- ADM phase tagging is optional and organization-scoped.
- ADM phases must not replace GovEA workflow statuses.
- ADM phase views should be architect-facing by default.
- Non-architect stakeholder views should continue to use plain-language labels.

## Implementation Status

Not implemented.

## Links

- Depends on: Framework Mapping, Framework Overlay Configuration
- Related: Planning & Roadmap, Architecture Decision Records, Principles
- Personas served: Enterprise Architect, Agency EA Coordinator, CMS Administrator
