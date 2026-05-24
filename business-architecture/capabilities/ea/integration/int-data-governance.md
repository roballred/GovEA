# Capability: Data Governance Platform Integration

## What It Does

The system must connect EA records to data governance platforms — surfacing data assets, lineage, classification, and stewardship alongside the applications and capabilities they belong to — so that architects can see data governance context without requiring architects to maintain a parallel catalogue.

Most EA tools that claim data governance integration provide it only partially: HOPEX and ABACUS have the deepest coverage, but even they require substantial custom configuration. GovEA's integration target is to make data governance context visible in the architecture view without replacing the data governance platform.

The specific pain this solves: EA teams produce capability and application records without knowing what data those systems hold, how it flows, or who governs it. Data teams maintain a separate catalogue (Collibra, Purview) without knowing which capabilities depend on the data they classify. The two teams work in isolation.

## Implementation Status

**Not implemented.** This document is the design specification for that future work.

## Personas

- **Enterprise Architect (Central IT)** — needs to surface data governance context in architecture decisions, particularly for applications under regulatory scrutiny (privacy, records management, security classification)
- **Domain Architect** — needs to understand what data a capability consumes and produces before recommending an application for that capability
- **Agency EA Coordinator** — needs to link their agency's applications to the data classifications and stewardship assignments maintained in the enterprise data governance platform

## Behaviors

- Connect Application and Capability records in GovEA to data assets in:
  - Microsoft Purview (primary government target)
  - Collibra Data Intelligence Platform
  - Alation Data Catalog
  - Informatica CDGC
- Surface on each linked Application record: data assets held or consumed, classification labels (e.g., Official, Sensitive, Protected), steward name and contact, and last-classified date
- Surface on each linked Capability record: data domains that the capability touches, derived from the applications linked to it
- Flag applications whose data governance records are stale (last classified more than 12 months ago) in the portfolio risk view
- Enable data-impact queries: from a data governance platform asset, show which GovEA capabilities and applications depend on it

## Rules

- Data governance integration is read-only in GovEA; GovEA does not create, update, or delete records in the data governance platform
- Sensitive classification labels are surfaced in full to Admin and Contributor roles; Viewers see only that a classification exists, not the specific label
- Data asset linkage is architect-confirmed; the system suggests matches by application name or CI reference but does not create links automatically
- Data governance credentials are stored as org-level configuration and are never exposed in API responses

## Implementation Notes

- Microsoft Purview is the most common data governance platform in government M365 deployments and should be the first implementation target
- Data classification label vocabularies differ across platforms; GovEA should store the label as a raw string from the source platform rather than mapping to an internal taxonomy, to avoid classification drift
- Bi-directional linking (showing GovEA records inside Purview) is a v2 concern; v1 is GovEA consuming data governance context, not publishing to it

## Links

- Depends on: `po-application-portfolio`, `po-capability-map`
- Related: `int-api-management.md`, `int-rest-api.md`
