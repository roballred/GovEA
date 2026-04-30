# Capability: User Management

## What It Does
The system must be able to create, edit, deactivate, and delete user accounts. Administrators manage users entirely through the UI — no CLI or database access required.

## Personas
- **CMS Administrator** — owns this capability; performs all user management tasks
- **Instance Admin** — creates and manages user accounts across tenant boundaries for platform operations and recovery workflows

## Behaviors
- Create a new user account with name, email, and role assignment
- Edit an existing user's profile, email, or role
- Deactivate a user account without deleting it (preserves audit history)
- Delete a user account permanently
- View a list of all users with their role and account status
- Search and filter the user list
- Create a user account from the platform admin console and bind it to a selected organization
- Optionally grant platform-admin access at account creation time when the account is intended for installation-wide operations

## Rules
- At least one Admin account must exist per organization at all times — the last Admin for an organization cannot be deactivated or deleted
- Deactivated users cannot log in but their content and audit records are preserved
- User records must be scoped to an organization
- Email addresses must be globally unique across the instance
- Only Instance Admins can create accounts across organizations or grant `instance_admin`

## Implementation Status
- **Current product:** Org Admins can manage users within their own organization.
- **Current product:** Instance Admins can create accounts into any organization from the platform console, and may optionally grant platform-admin access during account creation.
- **Future:** Broader account-recovery and invitation workflows remain future work.

## Links
- Depends on: Role-Based Access Control
- Related: SSO Authentication, IAM Audit Trail, First-Run Setup, Feature Management
