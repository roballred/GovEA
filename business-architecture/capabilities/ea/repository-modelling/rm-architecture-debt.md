# Capability: Architecture Debt Tracking

## What It Does

The system must allow architects to identify, record, and track conditions in the architecture that constrain future options — applications past their supported lifecycle, capabilities with no enabling technology, outdated decisions that have never been revisited, and deliberate shortcuts taken without a documented plan to resolve them.

Debt that is named and tracked is manageable. Debt that is invisible becomes the reason EA outputs stop being trusted.

## Personas

- **Enterprise Architect (Central IT)** — needs to surface and communicate architectural debt to leadership in plain language; currently has no mechanism to separate "what we know is a problem" from "what we haven't looked at yet"; this conflation erodes trust in EA outputs
- **Agency EA Coordinator** — needs to document known debt in their agency's architecture without it looking like an indictment; debt is normal; the discipline is in tracking it honestly and having a plan

> ⚠️ Enterprise Architect and Agency EA Coordinator are **Assumed** personas. The behaviors below reflect their stated pain points and goals as currently understood. Validation through direct user research is required before implementation begins.

## Behaviors

- Create a debt item linked to one or more applications, capabilities, ADRs, or technology records, with a description, debt type, severity, and optional target resolution date
- Debt types: `lifecycle-risk` (application approaching or past vendor support end), `capability-gap` (capability with no supporting application), `decision-drift` (ADR superseded by practice without formal revision), `known-shortcut` (deliberate technical or architectural compromise), `unreviewed` (object not updated in more than N months)
- Mark an application, capability, or ADR as carrying known debt directly from its edit form — without requiring a separate debt item to be created
- View all debt items for the organization on a single screen, filterable by type, severity, and status
- Link a debt item to an initiative as the resolution path
- Track debt item status: `open`, `in-progress` (linked to an active initiative), `resolved`, `accepted` (acknowledged, no resolution planned, with a documented rationale)
- Surface open debt count on the admin dashboard alongside repository completeness metrics
- Auto-flag applications where the lifecycle status is `end-of-life` or where technology records indicate an end-of-support date has passed

## Rules

- Debt items belong to an organization and follow the standard content workflow: draft → published → archived
- Only published debt items are visible to Viewer-role users — this is intentional; organizations control what they publish about their own architecture challenges
- `accepted` debt items require a written rationale; the system must not allow acceptance without documentation
- Auto-flagged debt (lifecycle-based) appears in a separate "system-detected" queue, distinct from human-created debt items; the distinction must be visible
- Resolving a debt item requires linking it to an initiative or explicitly marking it `accepted` with rationale; it cannot be closed without one or the other
- Debt items must be linked to at least one architecture object; unattached debt items are not permitted

## Federation Behavior

Debt items are always owned by the organization that creates them. Federation does not change ownership.

**Creating debt against cross-org linked objects:** An agency may create a debt item linked to a cross-org object they can see (e.g., "we've linked to the enterprise Licensing capability but have no application implementing it — that gap is our debt to close"). The debt item belongs to the agency, not to the org whose capability is referenced. The referenced cross-org object appears in the debt item's linked objects list as a read-only reference.

**Visibility of debt items across org boundaries:** Debt items follow `mo-content-visibility` exactly. Default visibility is `org` — debt is private to the creating organization. An agency may choose to share debt items at `connections` or `instance` visibility, making them visible to connected orgs or the full instance. This is always an explicit opt-in by the agency.

**What Enterprise Architects see:**
- Debt items they created on enterprise-owned content (at any visibility)
- Debt items from other orgs that those orgs have shared at `connections` or `instance` visibility
- They do not see `org`-visibility debt from agencies, even if that debt references enterprise capabilities they own

**Design principle:** An Enterprise Architect cannot use debt tracking as a surveillance mechanism to discover problems in agencies that have not chosen to share them. The federation model is a professional network, not an audit trail. If agencies know that linking to an enterprise capability automatically exposes their debt to central IT, they will not link — and the entire federation model fails.

**Auto-flagged debt and cross-org objects:** The system-detected debt queue (lifecycle-based flags) only fires against objects the org owns. An agency is never auto-flagged for debt conditions in a cross-org linked object that belongs to another org.

## Links

- Depends on: `po-application-portfolio`, `po-capability-map`, `po-architecture-decisions`, `pl-initiatives`, `mo-content-visibility`, `mo-cross-org-linking`
- Related: `rm-repository-completeness`, `rm-end-to-end-traceability`
- Personas served: Enterprise Architect, Agency EA Coordinator
