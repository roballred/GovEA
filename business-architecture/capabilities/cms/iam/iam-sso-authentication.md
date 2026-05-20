# Capability: SSO Authentication

## What It Does
The system must allow users to sign in using their agency's identity provider via OpenID Connect (OIDC). Microsoft Entra ID is the current configured provider target, but the capability should remain provider-neutral so Okta, Auth0, or other OIDC providers can be supported through the same sign-in and pre-provisioning model. SSO is optional — the system works without it.

## Personas
- **CMS Administrator** — configures SSO via the admin UI; no code changes required
- **Content Viewer** — signs in transparently with their existing agency credentials

## Behaviors
- Sign in via OpenID Connect with a configured identity provider
- Require a matching pre-created GovEA user account before SSO sign-in is allowed
- Preserve the role and organization binding assigned by the Admin on that pre-created account
- Block non-provisioned SSO identities rather than auto-creating a GovEA account at first login
- Allow an Admin to pre-provision a user as Viewer, Contributor, or Admin before the first SSO sign-in
- SSO configuration is enabled by providing credentials in environment variables — no code changes required
- Disable SSO by removing the environment variables — local authentication remains available

## Rules
- SSO is additive — local authentication always remains available alongside it
- SSO access is invite-based in v1 — a matching active GovEA user record with an organization binding must exist before sign-in
- SSO users cannot change their password in the system — password management is handled by the identity provider
- If an SSO user is deactivated in GovEA or is not pre-provisioned, sign-in must fail
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
