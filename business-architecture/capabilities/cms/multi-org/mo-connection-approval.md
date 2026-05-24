# Capability: Cross-Org Link Approval

## What It Does
The system must allow an organization to review, approve, or reject incoming cross-org link requests. An incoming link is a proposal from another org asserting that one of their content items relates to one of yours. Approval is always required before a link becomes active, and in the current prototype those decisions happen directly on capability and persona detail pages.

## Personas
- **Agency EA Coordinator** — reviews incoming link requests from other agencies or central IT; approves links that accurately represent the relationship; rejects requests that are inaccurate or inappropriate
- **CMS Administrator** — may manage approval workflow on behalf of their organization
- **Enterprise Architect (Central IT)** — approves or rejects agency links to enterprise capabilities; uses the approval interface to maintain accuracy of the enterprise capability map

## Behaviors
- Display pending incoming cross-org link requests on supported content detail pages, showing the source org and linked content
- Allow an Admin in the target org to approve a pending request — sets link status to `active`
- Allow an Admin in the target org to reject a pending request with an optional reason
- Display approved and rejected link state back on the participating content items
- Allow the source org to withdraw a pending or approved link at any time

## Rules
- Only the target organization can approve or reject an incoming link — the source org cannot approve their own requests
- Approving a link does not change the visibility of either content item
- Rejected requests can be resubmitted — rejection is not permanent
- Withdrawing an approved link removes it from both content items immediately
- Approval decisions are logged in the audit trail
- Notification feeds, approval history views, and target-side revocation remain future work

## Implementation Status
Shipped (v1). Approve / reject of incoming cross-org link requests happens inline on capability and persona detail pages. Approvals and rejections write to the audit trail. Dedicated approval inbox, history view, and target-side revocation flows remain future work.

## Links
- Depends on: Cross-Org Linking, Org Connections, IAM — Role-Based Access Control
- Related: IAM — Audit Trail
