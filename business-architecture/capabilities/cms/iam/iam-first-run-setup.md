# Capability: First-Run Setup

## What It Does
On first launch, the system must guide the administrator through creating the initial Admin account and configuring the database and basic site settings. The system must not be accessible to other users until setup is complete.

## Personas
- **CMS Administrator** — completes first-run setup before handing the system over to other users

## Behaviors
- Detect when no users exist and redirect to the setup wizard automatically
- Collect the initial Admin account name, email, and password
- Collect basic organization name and site settings
- Complete setup and redirect to the admin dashboard
- Block all non-setup routes until setup is complete
- Support headless/automated setup via environment variables for Docker and CI deployments

## Administrator Handoff

First-run setup creates the initial Admin account, but it does not address what happens when that administrator leaves. For a 1–3 person government IT shop, staff turnover is a near-certainty within the product's lifetime. The system must not become inaccessible or unmanageable when the original admin departs.

### Handoff behaviors the system must support

- An existing Admin can create additional Admin accounts at any time through User Management — there is no limit on the number of Admin accounts
- There is no "super admin" or root account that only one person can hold — all Admin accounts are equal
- The outgoing admin does not need to transfer ownership; the incoming admin is granted full access by being assigned the Admin role
- If all Admin accounts become inaccessible (e.g. the only admin leaves without creating a successor), a recovery path must exist that does not require database access — documented in the deployment guide

### What the outgoing admin should document

The system cannot enforce this, but the following should be captured before an admin transitions out:

- Which SSO provider is configured and who manages it at the identity provider level
- Any non-default site settings, feature flags, or email configuration
- The location of the most recent backup and how to restore it
- Any active connections to peer organizations (multi-org federation)

> ⚠️ The recovery path for a fully locked-out instance (no accessible Admin account) is a deployment-level concern, not a UI capability. It must be documented in the deployment guide before v1 ships.

## Rules
- First-run setup runs exactly once — it cannot be re-triggered after an Admin account exists
- The initial Admin account created during setup cannot be automatically deactivated
- Automated setup via environment variables must produce the same result as the UI wizard
- There is no account hierarchy among Admin users — any Admin can create, edit, or deactivate any other non-Admin user

## Implementation Status
Shipped (v1). The `/setup` route auto-runs on a fresh DB and creates the initial Admin + organization, then redirects to the dashboard; non-setup routes are blocked until completion. Headless setup via env vars supports Docker and CI flows. The lockout-recovery path remains a deployment-guide concern and is referenced from the IAM group doc.

## Links
- Depends on: User Management, Role-Based Access Control, Local Authentication
- Related: IAM Audit Trail, Admin & Configuration
