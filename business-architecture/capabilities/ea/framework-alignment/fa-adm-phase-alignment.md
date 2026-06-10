# Capability: ADM Phase Alignment

## What It Does

The system must allow TOGAF-aware teams to optionally tag GovEA content to Architecture Development Method (ADM) phases so they can understand which records support architecture vision, domain architecture, migration planning, implementation governance, and architecture change work.

ADM phase alignment is a view over existing GovEA content. It is not a mandatory workflow engine and does not require every organization to follow TOGAF.

## Personas

- **Enterprise Architect (Central IT)** — wants a recognizable way to organize architecture evidence across ADM-style work
- **Agency EA Coordinator** — wants to show central IT or auditors how local content supports an architecture cycle without duplicating records
- **CMS Administrator** — needs to enable or disable ADM phase tagging through configuration

## Behaviors

- Tag GovEA records to one or more ADM phases when the TOGAF recipe's taxonomy is installed
- View records grouped by ADM phase for architecture review or planning
- Identify missing evidence for an ADM phase without blocking ordinary GovEA use
- Use ADM phase tags in reports and governance summaries

## Rules

- ADM phase tagging is optional and organization-scoped.
- ADM phases must not replace GovEA workflow statuses.
- ADM phase views should be architect-facing by default.
- Non-architect stakeholder views should continue to use plain-language labels.

## Implementation Status

Partially implemented — taxonomy-backed per ADR-0002 (#665/#671 arc).

Current shipped slice:

- ADM Phase ships as an optional taxonomy type installed by the TOGAF recipe; capabilities and initiatives can be tagged through the ordinary taxonomy UI
- The ADM Coverage report groups tagged records by phase and discloses untagged gaps rather than hiding them
- ADM Phase carries `audience: 'framework'`, so phase labels stay out of viewer-role and stakeholder-facing views by default (ADR-0001's no-jargon guarantee)

Not yet shipped:

- Phase gates or any workflow behavior (deliberately out of scope — ADM phases are a classification lens, not a process engine)
- Governance summaries driven by phase tags beyond the ADM Coverage report

## Links

- Depends on: Framework Mapping, Framework Overlay Configuration
- Related: Planning & Roadmap, Architecture Decision Records, Principles
