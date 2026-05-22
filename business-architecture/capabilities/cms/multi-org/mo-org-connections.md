# Capability: Org Connections

## What It Does
The system must allow administrators to establish explicit connections between organizations. A connection is a prerequisite for sharing `connections`-visibility content between two orgs. Connections are bidirectional once established.

## Personas
- **CMS Administrator** — creates and manages their organization's connections to other orgs on the instance
- **Agency EA Coordinator** — understands which orgs their agency is connected to and what that connection enables

## Behaviors
- Allow an Admin to browse other organizations on the same installation
- Allow an Admin to create a connection to another org (sets status to `pending`)
- Notify the target org's Admin of the incoming connection request
- Allow the target org's Admin to accept or reject the connection request
- Display active connections and pending requests on a connections management page
- Allow an Admin to remove an active connection
- When a connection is removed, content shared via that connection becomes inaccessible to the disconnected org immediately

## Rules
- A connection requires acceptance by both organizations — neither org is added to a connection without consent
- A user can only manage connections for their own organization
- Central IT admins do not have special authority to force a connection — they request like any other org
- Removing a connection does not delete either org's content; it only removes cross-org visibility

## Implementation Status
Shipped (v1). Org-to-org connection requests, accept/reject, removal, and bidirectional active state are implemented in the admin connections management page. In-app notifications for incoming requests now route through the notification inbox (#610).

## Links
- Depends on: IAM — User Management, Role-Based Access Control
- Enables: Content Visibility, Cross-Org Linking, Cross-Org Link Approval
