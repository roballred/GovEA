# Capability: Framework Reference Management

## What It Does

The system must allow authorized users to record external architecture framework references, such as TOGAF, NIST, ISO, state EA models, or agency-specific standards, as reference material that can inform GovEA mappings and reports.

Reference material is not authoritative GovEA product definition. It is an input that helps users understand how GovEA content relates to external methods, standards, or governance expectations.

## Personas

- **Enterprise Architect (Central IT)** — maintains the enterprise's chosen framework references and wants agencies to align to them consistently
- **Agency EA Coordinator** — wants to understand which external concepts local content should map to without reading framework documents from scratch
- **CMS Administrator** — needs to manage framework reference entries and source citations without editing code

## Behaviors

- Create and maintain a framework reference entry with name, version, owner, source URL, and summary
- Mark a reference as active, inactive, or draft
- Distinguish reference sources from GovEA's authoritative capability definitions
- Attach reference entries to mappings, reports, or glossary definitions
- Show source attribution wherever framework references are used

## Rules

- Reference entries must cite their source.
- Reference entries must not be treated as GovEA capability definitions.
- Restricted or licensed framework text should be linked or summarized, not copied wholesale.
- Deactivating a reference should not delete historical mappings that used it.

## Implementation Status

Not implemented. GovEA has glossary source-definition support today and a shipped TOGAF overlay slice, but there is still no general framework reference-management surface for admins.

## Links

- Depends on: Glossary, Taxonomy Management, Audit Trail
- Related: Framework Mapping, Framework Overlay Configuration
