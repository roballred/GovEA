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

## Session Invalidation

- Sessions expire after 24 hours and require re-authentication
- Deactivating a user in GovEA blocks new sign-ins immediately (checked in the authentication flow). Existing active sessions continue until they expire (within 24h)
- **Important:** Deactivating a user in the identity provider (e.g. Entra ID) alone does not revoke their active GovEA session. The next login attempt will fail (within 24h at latest due to session expiry), but the current session persists until it expires
- This 24h residual access window is an accepted v1 trade-off
- SCIM-based real-time provisioning sync is out of scope for v1

## Links
- Depends on: User Management, Role-Based Access Control
- Related: Local Authentication, IAM Audit Trail
