# Capability: Architecture Debt Tracking

## What It Does

The system must allow architects to identify, record, and track conditions in the architecture that constrain future options — applications past their supported lifecycle, capabilities with no enabling technology, outdated decisions that have never been revisited, and deliberate shortcuts taken without a documented plan to resolve them.

Debt that is named and tracked is manageable. Debt that is invisible becomes the reason EA outputs stop being trusted.

## Implementation Status

**Shipped (v1, partial).** `/debt` route is live with the documented severity / status / type filter chips (`lifecycle-risk` / `capability-gap` / `decision-drift` / `known-shortcut` / `unreviewed`) and full CRUD pages (`/debt/new`, `/debt/[id]`, `/debt/[id]/edit`). The severity tier definitions and security-classification guidance below describe the implemented behavior. Confirmed during the Enterprise Data Architect persona journey audit ([#572](https://github.com/roballred/GovEA/issues/572)).

Future work tracked separately:
- Data-layer-specific debt types (query performance, schema drift, space utilization) — see [#573](https://github.com/roballred/GovEA/issues/573).
- Unified priority signal panel on the admin dashboard combining debt + broken-chain + staleness signals — not yet implemented.
- Auto-flagged debt queue distinct from human-created items — not yet implemented.
- Federation behavior per the section below — implementation status unverified by the audit; requires a follow-up walk to confirm.

## Personas

- **Enterprise Architect (Central IT)** — needs to surface and communicate architectural debt to leadership in plain language; currently has no mechanism to separate "what we know is a problem" from "what we haven't looked at yet"; this conflation erodes trust in EA outputs
- **Agency EA Coordinator** — needs to document known debt in their agency's architecture without it looking like an indictment; debt is normal; the discipline is in tracking it honestly and having a plan

> ⚠️ Enterprise Architect and Agency EA Coordinator are **Assumed** personas. The behaviors below reflect their stated pain points and goals as currently understood. Validation through direct user research is required before implementation begins.

## Behaviors

- Create a debt item linked to one or more applications, capabilities, ADRs, or technology records, with a description, debt type, severity, optional target resolution date, and a `security_sensitive` boolean flag
- Debt types — UI labels are plain-language per #133; DB slugs are stable for backwards compatibility:
  - `lifecycle-risk` — **"Lifecycle risk"** — application approaching or past vendor support end
  - `capability-gap` — **"Unsupported capability"** — capability with no supporting application
  - `decision-drift` — **"Drift from a recorded decision"** — ADR superseded by practice without formal revision
  - `known-shortcut` — **"Deliberate trade-off"** — technical or architectural compromise accepted on purpose
  - `unreviewed` — **"Stale / unreviewed"** — object not updated within the configured window
- Severity tiers (defined once here; used by this capability and referenced by `rm-end-to-end-traceability` and `rm-repository-completeness`):
  - `critical` — immediate operational or security risk: an application past end-of-life in active use with no remediation plan; a published capability with zero linked personas
  - `high` — significant constraint on future options: application approaching end-of-life, ADR that contradicts current practice without a formal revision
  - `medium` — known gap without immediate risk: weak application coverage for a capability, a deliberate shortcut without a resolution timeline
  - `low` — documentation debt: outdated descriptions, missing optional relationships, stale content with no active delivery impact
- Mark an application, capability, or ADR as carrying known debt directly from its edit form — without requiring a separate debt item to be created
- View all debt items for the organization on a single screen, filterable by type, severity, and status
- Link a debt item to an initiative as the resolution path
- Track debt item status: `open`, `in-progress` (linked to an active initiative), `resolved`, `accepted` (acknowledged, no resolution planned, with a documented rationale)
- Surface open debt count on the admin dashboard alongside repository completeness metrics
- Surface a **unified priority signal summary** on the admin dashboard: a single ranked list combining open debt items, broken chain indicators (from `rm-end-to-end-traceability`), and staleness warnings (from `rm-repository-completeness`), sorted by severity tier (`critical` first, then `high`, `medium`, `low`). This replaces three separate signal lists — architects see one prioritised action queue, not three panels to check separately
- Auto-flag applications where the lifecycle status is `end-of-life` or where technology records indicate an end-of-support date has passed

## Rules

- Debt items belong to an organization and follow the standard content workflow: draft → published → archived
- Only published debt items are visible to Viewer-role users — this is intentional; organizations control what they publish about their own architecture challenges
- **Security exception:** debt items with `security_sensitive: true` are permanently restricted to Admin and Contributor roles regardless of workflow state. Publishing such an item does not expose it to Viewer-role users. The restriction is enforced by the system; it cannot be overridden by role assignment or visibility settings
- The `security_sensitive` flag defaults to `false`. It must default to `true` when: the debt type is `lifecycle-risk` and the linked technology has a known CVE or an active security advisory on record; or when the item's description or rationale contains the word "CVE", "vulnerability", "exploit", "unpatched", or "advisory" (case-insensitive). The system must surface a prompt at creation time asking the user to confirm the classification; the user may override `true → false` only with an explicit acknowledgment logged to the audit trail
- `accepted` debt items require a written rationale; the system must not allow acceptance without documentation
- `accepted` rationale text is subject to the same `security_sensitive` auto-detection rule — if the rationale text contains sensitive indicators, the item is re-flagged and the user must re-acknowledge the classification before saving
- Auto-flagged debt (lifecycle-based) appears in a separate "system-detected" queue, distinct from human-created debt items; the distinction must be visible
- Resolving a debt item requires linking it to an initiative or explicitly marking it `accepted` with rationale; it cannot be closed without one or the other
- When a user attempts to publish an architecture object that has one or more linked `critical` or `high` severity debt items in `open` status, the system must display a warning and require explicit acknowledgment before publishing proceeds — the publish action is not blocked, but the acknowledgment is mandatory and logged in the audit trail; this prevents silent publication of high-risk content without removing the architect's ability to communicate context alongside known problems
- Debt items must be linked to at least one architecture object; unattached debt items are not permitted

## Security Classification Guidance

This guidance is for architects deciding what debt is safe to publish to Viewer-role users.

**Generally safe to publish:**
- Lifecycle risk linked to a vendor's published end-of-support date (e.g., "Windows Server 2012 reaches EOS in October 2026")
- Capability gaps (a capability with no supporting application) — these describe an architectural gap, not a specific exploitable weakness
- Decision drift (an ADR that has been informally superseded) — describes process debt, not a security exposure
- Known shortcuts where the shortcut itself is not exploitable (e.g., "we deferred the API gateway implementation")

**Should be marked `security_sensitive: true` before publication is considered:**
- Any debt item that names a specific CVE, security advisory ID, or CVSS score
- Patch status of a production system (e.g., "Apache 2.4.49 is unpatched on the permitting server")
- Configuration weaknesses pending remediation (e.g., "MFA not enforced on the finance portal")
- Dependency on an unsupported library where the vulnerability details are non-public or under embargo
- `accepted` rationale that explains why a known vulnerability is being tolerated rather than remediated — this context must never be published

**The test:** would a bad actor learn something useful from this item that they could not already learn from a public vendor advisory? If yes, it is security-sensitive. If the item merely points at a publicly known timeline (end-of-support date, published EOL notice), it may be safe to publish.

**When in doubt, mark it sensitive.** The cost of an unpublished debt item is a slightly less complete public view of the portfolio. The cost of an inadvertently published vulnerability detail in a government system is significantly higher.

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

## Implementation History

The `security_sensitive` flag and the Security Classification Guidance section above were added in response to ARB finding #135 (Omar Singh, Security Architect). These constraints were incorporated in the initial implementation — retrofitting security classification onto an existing debt store would have been significantly harder than building it in from the start.

(Earlier revisions of this doc had a second "Not yet implemented" status block here; superseded by the Implementation Status section near the top of the file. See [#575](https://github.com/roballred/GovEA/issues/575) for the doc backfill that consolidated the two.)

## Links

- Depends on: `po-application-portfolio`, `po-capability-map`, `po-architecture-decisions`, `pl-initiatives`, `mo-content-visibility`, `mo-cross-org-linking`
- Related: `rm-repository-completeness`, `rm-end-to-end-traceability`
