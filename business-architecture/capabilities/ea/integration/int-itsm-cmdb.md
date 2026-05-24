# Capability: ITSM & CMDB Synchronisation

## What It Does

The system must maintain a live, reconciled view of the application estate by exchanging data with IT Service Management (ITSM) and Configuration Management Database (CMDB) platforms. Application records in GovEA must reflect what operations actually manages — not what was documented at procurement — and incidents, changes, and configuration drift surfaced in ITSM must be visible in the EA context where they matter.

The specific pain this solves: architects spend significant time reconciling the EA repository against the CMDB by hand, identifying which applications are still active, which have changed ownership, and which are missing from the architecture altogether. That reconciliation work is what this capability removes.

## Implementation Status

**Not implemented.** No ITSM or CMDB connectors exist. Application records are created and maintained manually. This document is the design specification for that future work.

## Personas

- **Enterprise Architect (Central IT)** — needs confidence that application records reflect the operational estate; currently the CMDB and EA repository diverge within weeks of a change event
- **Agency EA Coordinator** — needs to surface applications that exist in the CMDB but have no corresponding EA record — unknown unknowns that invalidate capability coverage claims
- **Junior EA Analyst** — currently performs manual reconciliation between CMDB exports and GovEA; this capability replaces that workload with a governed sync

## Behaviors

### CMDB Synchronisation
- Import application and infrastructure component records from ServiceNow CMDB (primary target) and BMC Helix (secondary)
- Map CMDB CI types to GovEA object types: application CIs → Application records; infrastructure CIs → Technology records (when Technology Lifecycle is built)
- Detect and surface discrepancies: CIs in the CMDB with no corresponding GovEA record, and GovEA application records with no matching CI
- On each sync, produce a reconciliation summary showing: new CIs discovered, retired CIs flagged, changed ownership or lifecycle state, and unresolved conflicts where the CMDB and GovEA disagree
- Allow architects to review and accept, reject, or defer each proposed change — sync does not automatically overwrite architect-authored content without confirmation

### ITSM Integration
- Pull open incidents and change requests linked to an application CI and surface them on the application's GovEA detail page as an operational health panel
- Flag applications with active P1/P2 incidents in the portfolio risk view
- Surface change request volume as a signal in the application portfolio (high change frequency may indicate architectural instability or active transformation)
- Write back: when a GovEA architect marks an application as retiring or decommissioned, create a corresponding change request ticket in ServiceNow for the operations team

### Gap Detection
- Surface applications present in the CMDB but absent from GovEA as a completeness signal on the admin dashboard
- Surface applications in GovEA marked as published and active whose corresponding CMDB CI is marked as retired — potential ghost applications
- Feed both signals into the unified priority signal summary (see `rm-repository-completeness`, `rm-architecture-debt`)

## Rules

- CMDB sync is read-dominant: GovEA consumes operational data from the CMDB; it does not become the authoritative source for CI records
- Architect-authored fields (description, domain, capability links, behaviors) are never overwritten by sync — only operational metadata (ownership, lifecycle state, last-change date) is updated from the CMDB
- All sync operations are logged in the audit trail with the source system, the field changed, and the before/after value
- Conflict resolution is explicit: when GovEA and the CMDB disagree on a field value, the architect must resolve the conflict manually; automated overwrite is not permitted
- CMDB credentials and API tokens are stored in org-level settings and are never exposed in the UI or API responses; instance admins may configure instance-wide defaults
- Sync frequency is configurable per org (default: daily); real-time webhook-driven sync is a v2 concern pending scale validation

## Implementation Notes

- ServiceNow Table API is the primary integration surface; BMC Helix CMDB REST API is the secondary target
- The GovEA application record schema must be extended to store the CMDB CI identifier (`cmdb_ci_sys_id` for ServiceNow) as a stable cross-system reference
- Reconciliation logic should be a background job, not a synchronous request, to avoid timeout constraints on large estates
- The conflict-resolution UX is the most complex part of this capability — it must present diffs clearly without overwhelming non-technical administrators

## Links

- Depends on: `po-application-portfolio`, `rm-repository-completeness`, `rm-architecture-debt`, `ac-admin-dashboard`
- Related: `int-devops.md`, `int-cloud-discovery.md`, `int-rest-api.md`
