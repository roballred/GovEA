# Capability: Multi-Organization Federation

**Scope:** v1

## What It Does
The system must allow multiple organizations to connect with each other, share appropriate content across organizational boundaries, and link local EA artifacts to enterprise-wide counterparts — while preserving each organization's autonomy and keeping single-org installs simple. In the current product this is a prototype capability: connected-org visibility, approval-based cross-org links, and server-enforced ownership guardrails are shipped, while deeper management workflows and notification/history layers remain in progress.

## Personas
- **Enterprise Architect (Central IT)** — publishes enterprise capabilities and personas at instance level; sees aggregated view of agency adoption across connected orgs
- **Agency EA Coordinator** — connects agency to central IT and peer agencies; controls what the agency shares; links local capabilities to enterprise counterparts; approves or rejects incoming cross-org link requests
- **CMS Administrator** — manages org connections and visibility settings on behalf of their organization

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Org Connections | [mo-org-connections.md](./mo-org-connections.md) | Establish and manage connections between organizations |
| Content Visibility | [mo-content-visibility.md](./mo-content-visibility.md) | Control which content is visible to connected orgs or instance-wide |
| Cross-Org Linking | [mo-cross-org-linking.md](./mo-cross-org-linking.md) | Link local capabilities and personas to enterprise counterparts |
| Cross-Org Link Approval | [mo-connection-approval.md](./mo-connection-approval.md) | Review and approve or reject incoming cross-org link requests |

## Rules
- Single-org installs work identically to today — no federation UI or complexity is shown unless connections exist
- No organization can read another organization's `org`-visibility content, regardless of connection status
- All federation features are opt-in from the agency side — no org can be forced into a connection or a cross-org link
- Content ownership never transfers across org boundaries — linking does not imply sharing or control
- Read access to cross-org content never implies write or delete rights

## Implementation Status
Prototype in the current product:
- Org connection records and connection-aware visibility exist
- Cross-org link requests, approvals, rejections, and source-side withdrawal exist for capabilities and personas
- Remote detail pages are read-only unless the current org owns the record
- Write-protection guardrails are enforced on server-side mutations
- Removing an org connection also removes dependent cross-org links

Still maturing:
- Notification and approval-history surfaces
- Broader test coverage across role and visibility combinations
- Deeper cross-org management UX

## Success Criteria

- A central IT org and an agency can establish a connection, share `instance` or `connections` visibility capabilities, and have the agency link to enterprise counterparts within the same admin session
- Single-org installs continue to work identically with no federation UI surface area exposed
- An org admin can answer "which other orgs are we connected to, and what have we shared?" without leaving the connections page
- Removing a connection immediately revokes cross-org link visibility and prevents new outbound requests
- Cross-org link approval decisions appear in the audit log with actor + timestamp

## Design Principle
Federation must feel like a professional network, not an audit. Agencies connect and share because it is useful to them, not because it is required.

## Links
- Depends on: IAM — Role-Based Access Control, IAM — Audit Trail, Content Management — Content Workflow
- Enables: Cross-Org Linking, Cross-Org Link Approval
- Related: Frontend Display (federation-aware detail pages)
