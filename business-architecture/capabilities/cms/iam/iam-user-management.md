# Capability: User Management

## What It Does
The system must be able to create, edit, deactivate, and delete user accounts. Administrators manage users entirely through the UI — no CLI or database access required.

## Personas
- **CMS Administrator** — owns this capability; performs all user management tasks

## Behaviors
- Create a new user account with name, email, and role assignment
- Edit an existing user's profile, email, or role
- Deactivate a user account without deleting it (preserves audit history)
- Delete a user account permanently
- View a list of all users with their role and account status
- Search and filter the user list

## Rules
- At least one Admin account must exist per organization at all times — the last Admin for an organization cannot be deactivated or deleted
- Deactivated users cannot log in but their content and audit records are preserved
- User records must be scoped to an organization
- Email addresses must be unique within an organization

## Links
- Depends on: Role-Based Access Control
- Related: SSO Authentication, IAM Audit Trail, First-Run Setup
