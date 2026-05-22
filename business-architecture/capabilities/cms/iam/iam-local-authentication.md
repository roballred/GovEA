# Capability: Local Authentication

## What It Does
The system must allow users to sign in with an email address and password stored locally. This is the fallback authentication method and the only method available when SSO is not configured.

## Personas
- **CMS Administrator** — uses local auth when SSO is unavailable; manages local accounts
- **Content Viewer** — may use local auth if not provisioned via SSO

## Behaviors
- Sign in with email and password
- Sign out and invalidate the session
- Reset a forgotten password via an email link
- Lock an account after repeated failed login attempts
- Admin can force a password reset on a user's next login

## Rules
- Local authentication is always available — it cannot be disabled, even when SSO is configured
- Passwords must meet minimum complexity requirements (configurable by Admin)
- Password reset links expire after a configurable time window
- Sessions expire after a configurable period of inactivity

## Implementation Status
Shipped (v1, partial). Email + password sign-in, sign-out, and session invalidation are in place. Password complexity is configurable via per-org Security Settings (#612). Forgot-password email reset depends on the SMTP transport (#528 follow-up) and ships with the stub sender today; the flow is wired but emails are not delivered until SMTP lands.

## Links
- Depends on: User Management
- Related: SSO Authentication, Role-Based Access Control, IAM Audit Trail
