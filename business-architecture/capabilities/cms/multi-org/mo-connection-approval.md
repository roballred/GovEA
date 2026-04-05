# Capability: Cross-Org Link Approval

## What It Does
The system must allow an organization to review, approve, or reject incoming cross-org link requests. An incoming link is a proposal from another org asserting that one of their content items relates to one of yours. Approval is always required before a link becomes active.

## Personas
- **Agency EA Coordinator** — reviews incoming link requests from other agencies or central IT; approves links that accurately represent the relationship; rejects requests that are inaccurate or inappropriate
- **CMS Administrator** — may manage approval workflow on behalf of their organization
- **Enterprise Architect (Central IT)** — approves or rejects agency links to enterprise capabilities; uses the approval interface to maintain accuracy of the enterprise capability map

## Behaviors
- Display a list of pending incoming cross-org link requests, showing: source org, source content item name and type, proposed link type, and date submitted
- Allow an Admin or Contributor to approve a pending request — sets link status to `active`
- Allow an Admin or Contributor to reject a pending request with an optional reason — notifies the requesting org
- Display a history of previously approved and rejected requests
- Notify the requesting org when their request is approved or rejected
- Allow approved links to be revoked at any time by either org's Admin

## Rules
- Only the target organization can approve or reject an incoming link — the source org cannot approve their own requests
- Approving a link does not change the visibility of either content item
- Rejected requests can be resubmitted — rejection is not permanent
- Revoking an approved link notifies both orgs and removes the link from both content items immediately
- Approval decisions are logged in the audit trail

## Links
- Depends on: Cross-Org Linking, Org Connections, IAM — Role-Based Access Control
- Related: IAM — Audit Trail
