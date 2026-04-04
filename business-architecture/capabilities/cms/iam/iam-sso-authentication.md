# Capability: SSO Authentication

## What It Does
The system must allow users to sign in using their agency's identity provider via OpenID Connect. Microsoft Entra ID is the primary target. SSO is optional — the system works without it.

## Personas
- **CMS Administrator** — configures SSO via the admin UI; no code changes required
- **Content Viewer** — signs in transparently with their existing agency credentials

## Behaviors
- Sign in via OpenID Connect with a configured identity provider
- Automatically provision a user account on first SSO login
- Assign the Viewer role to all SSO-provisioned users by default
- Allow an Admin to promote an SSO user to Contributor or Admin after provisioning
- SSO configuration is enabled by providing credentials in environment variables — no code changes required
- Disable SSO by removing the environment variables — local authentication remains available

## Rules
- SSO is additive — local authentication always remains available alongside it
- SSO users cannot change their password in the system — password management is handled by the identity provider
- If an SSO user is deactivated in the identity provider, their next login attempt must fail
- Only one SSO provider is supported in v1

## Links
- Depends on: User Management, Role-Based Access Control
- Related: Local Authentication, IAM Audit Trail
