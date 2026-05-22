# Capability: End-to-End Traceability

## What It Does

The system must allow any user to follow a chain of relationships across the full architecture — from strategic objectives through capabilities to applications and technology — in either direction, and must surface where those chains are broken or incomplete.

## Implementation Status

**Partially implemented.** GovEA already ships read-only traceability views for objectives, capabilities, and services, plus impact-analysis panels on application and capability detail pages. What remains unbuilt is the fuller cross-layer traversal surface described here: reverse traversal UI, broken-chain indicators, cross-agency views, and a unified repository-wide impact workflow.

## Personas

- **Enterprise Architect (Central IT)** — needs to see the full impact of a proposed change or decommission before it happens; wants to identify which agencies have redundant applications serving the same capability
- **Agency EA Coordinator** — needs to demonstrate that their agency's technology investments are grounded in real capability needs; needs to see which capabilities have no supporting applications (gaps), not just which applications exist
- **Department Director** — needs a single navigable view showing how their department's strategy connects down to the specific applications and people their teams depend on; currently this information is scattered across tools and requires architect interpretation

> ⚠️ Enterprise Architect and Agency EA Coordinator are **Assumed** personas. Traceability behaviors below reflect persona goals and pain points as currently understood and must be validated before implementation.

## Behaviors

- From any strategic objective, navigate to linked initiatives, then to the capabilities those initiatives affect, then to the applications supporting each capability
- From any application, navigate upward to linked capabilities, then to the personas those capabilities serve, then to any strategic objectives or initiatives connected to those capabilities
- From any persona, see the full set of capabilities defined for them and the applications enabling each capability
- Impact panel: select any object and see all directly and indirectly connected objects, grouped by type (objectives, capabilities, applications, personas, ADRs)
- Broken chain indicator: surface objects where a required link is missing, with severity assigned by type:
  - `critical` — published application with no linked capability (active governance gap)
  - `high` — capability with no linked application (no evidence of delivery)
  - `medium` — capability with no linked persona (justification chain incomplete)
  - `low` — persona with no linked capability (documentation gap, not a delivery gap)
- Broken chain indicators feed into the unified priority signal summary on the admin dashboard (see `rm-architecture-debt` for the unified view definition)
- Cross-agency view (Enterprise Architect only): across connected organizations, show which capabilities are served by multiple independent applications — potential rationalisation signals

## Rules

- The core chain constraint (every Application links to a Capability; every Capability links to a Persona) is enforced at publish time and cannot be bypassed
- Traceability navigation is read-only — no editing occurs within the trace view
- Cross-agency traceability is available only to Enterprise Architect role and only where federation connections have been established and content is marked as `connections` or `instance` visibility
- Broken chain indicators are visible to Contributors and Admins; they do not surface to Viewers (Viewers only see published, complete content)
- Draft objects are excluded from impact panel traversal results for Viewer-role users — any object without a published version is treated as non-existent in traversal, regardless of relationship links
- The traversal visibility gate described in the Federation Behavior section is a pre-ship security requirement; the impact panel must not ship until a security test matrix covering all role × visibility × federation-state combinations has been completed and reviewed by a human

## Federation Behavior

Traversal respects content visibility at every hop. A relationship link is only followed if the user is permitted to see the target object under `mo-content-visibility` rules. No traversal path can expose content that the user could not already reach through normal navigation.

**Within-org traversal (all roles):** Follow all relationship links within the owning organization. No restrictions beyond standard role-based access.

**Outbound cross-org traversal (all roles):** When a local object has an approved cross-org link (via `mo-cross-org-linking`) pointing to content in another org, the impact panel follows that link if the target content is visible to the current user — i.e., the target is marked `connections` (and a connection exists) or `instance`. This is not a special case: it is simply traversal following a relationship the user can already see.

**Inbound cross-org traversal (Enterprise Architect only):** When traversing from an enterprise-owned object, the impact panel shows other orgs' objects that have linked to it — but only if those objects are visible at `connections` or `instance` visibility. An agency's `org`-visibility content is never reachable from outside that org, even if a cross-org link exists. This is the mechanism behind the "cross-agency view" behavior.

**Broken chain indicators across org boundaries:** Broken chain indicators are calculated within the owning org only. The Enterprise Architect does not see broken chains in agency repositories via the traceability view — only in their own org. Cross-agency gaps surface through the cross-agency view (redundancy and rationalisation signals), not as broken chain alerts.

**What Enterprise Architects do NOT see via traversal:**
- Agency content marked `org` visibility, even if a cross-org link exists
- Draft content from any org other than their own
- Broken chains or completeness gaps in other orgs' internal repositories

## Implementation Notes

- The core chain (Personas → Capabilities → Applications) is already enforced in the data model and publish workflow
- Shipped today: read-only traceability routes for objectives, capabilities, and services, plus application/capability impact panels for change and decommission analysis
- What is not yet implemented: repository-wide reverse traversal UI, broken chain indicators, cross-agency views, and a unified impact workspace across all object types
- Technology layer (infrastructure, platforms) is a natural extension of this chain but is not in scope until the Technology Lifecycle capability set is defined
- The traversal visibility gate must be validated with a security test matrix covering all role × visibility combinations before the impact panel ships (see ARB finding #129)
- **Query performance:** Traversal depth is bounded at configurable depth (default 3, hard cap 5). Required indexes on relationship tables and a visited-node guard against cycles are pre-ship requirements. See `rm-query-performance-decision.md` for the full performance ADR (resolves ARB finding #134).

## Links

- Depends on: `cm-content-relationships`, `po-capability-map`, `po-application-portfolio`, `mo-content-visibility`, `mo-cross-org-linking`, `mo-org-connections`
- Related: `rm-repository-completeness`, `pl-strategic-objectives`, `pl-initiatives`, `pl-roadmap`
