# Capability: HR & Organisation Design Integration

## What It Does

The system must keep the organisation model in GovEA current as people, roles, and structures change — by connecting to the HR and HCM systems where that data lives. An operating model view that reflects last year's org chart is not an architecture asset; it is a misleading snapshot that erodes trust in the EA repository.

The 2026 market research identifies HR and organisation design integration as **absent from all reviewed commercial EA tools**. No tool has solved this. Government IT has the same problem: org restructures happen faster than the EA team can update the repository, and the result is an operating model section that everyone knows is wrong but nobody has time to fix.

The specific pain this solves: architects build capability maps linked to operating units and roles that no longer exist as named, because the HR system changed months ago and nobody told the EA team.

## Implementation Status

**Not implemented.** This document is the design specification for that future work.

## Personas

- **Enterprise Architect (Central IT)** — needs the operating model view to reflect current org design without requiring a manual update after every restructure
- **Domain Architect** — needs to link capabilities and services to the current teams and roles that own them; ownership records that point to dissolved units or renamed departments are noise
- **Agency EA Coordinator** — responsible for maintaining their agency's architecture records, including which teams own which applications and capabilities; currently does this by checking HR records manually

## Behaviors

- Connect to HR and HCM systems to maintain current organisational unit definitions:
  - Workday HCM (primary target for government organisations that have adopted Workday)
  - SAP SuccessFactors
  - Microsoft 365 and Azure Active Directory organisational hierarchy (as a lower-fidelity proxy where a full HCM integration is not available)
- Sync organisational units, cost centres, and role categories as reference data in GovEA — not as standalone records but as controlled-vocabulary metadata for Application, Capability, and Service records
- Surface changes: when a linked organisational unit is renamed, merged, or dissolved in the HR system, flag all GovEA records that reference it and prompt an architect to confirm whether the record should be updated or the relationship removed
- Enable capability ownership mapping: connect Capability and Service records to the organisational units responsible for delivering them, with the unit name and hierarchy drawn from the HR system

## Rules

- HR integration is read-only in GovEA; GovEA does not write back to the HR system
- Only organisational unit and role-category data is consumed; individual employee records, salary data, and personal information are never imported into GovEA
- Org unit changes do not automatically update GovEA records; they produce a review queue that an architect must action
- HR credentials and API tokens are treated as sensitive configuration and are never exposed in the UI

## Implementation Notes

- Microsoft 365 organisational hierarchy via Graph API is the easiest integration path for the majority of government organisations, even if it provides less resolution than a full HCM system; this should be the first implementation target
- Full HCM integration (Workday, SuccessFactors) is the follow-on target for organisations with a formal operating model practice
- Government HR systems are frequently on-premises or in restricted cloud environments; a CSV-based import from HR system exports is a required fallback, consistent with the ERP integration approach

## Links

- Depends on: `po-capability-map`, `po-application-portfolio`
- Related: `int-erp-financial.md`, `int-ppm.md`
