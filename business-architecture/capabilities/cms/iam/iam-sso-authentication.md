# Capability: SSO Authentication

## What It Does
The system must allow users to sign in using their agency's identity provider via OpenID Connect (OIDC). Microsoft Entra ID is the current configured provider target, but the capability should remain provider-neutral so Okta, Auth0, or other OIDC providers can be supported through the same sign-in and pre-provisioning model. SSO is optional — the system works without it.

## Personas
- **CMS Administrator** — has SSO enabled for their organization at deploy time via environment variables; no code changes required. (v1 limitation: tenant SSO binding is not yet self-serve through the admin UI.)
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

## Identity Provider Failover

GovEA's design choice when the configured identity provider is unavailable is **fail open to local authentication**, not fail closed:

- The SSO sign-in path returns an error to the user when the IdP is unreachable or returns an OIDC error
- The local-credentials sign-in form remains visible and functional regardless of IdP state — there is no code path that disables local auth based on SSO health
- A user pre-provisioned with local credentials *and* an SSO identity can sign in either way; an SSO-only user without a local password cannot sign in during an IdP outage (a known v1 trade-off — see Rule above about pre-provisioning)
- Operators are expected to retain at least one admin account with local credentials so administrative access is never gated solely on a single external dependency

This is a deliberate availability choice: the cost of locking every user out of GovEA while their IdP is degraded is judged higher than the cost of permitting local sign-in for accounts that have it. Operators who require strict fail-closed behavior can remove the local-credentials provider at deploy time and accept the resulting availability profile.

## Integration Boundary (v1)

GovEA's integration boundary in v1 is intentionally narrow:

- **In scope:** OIDC sign-in (one configured provider at a time) and outbound SMTP for system mail (when configured under `ac-email-configuration`)
- **Out of scope:** SCIM provisioning sync, IdP group → role mapping, multiple simultaneous SSO providers, IdP-driven user deactivation, customer-side configuration of the SSO binding through the admin UI
- All other inter-system integrations (CMDB, HR, finance, ERP, ITSM, BI) are out of scope for v1 — see the `ea/integration/` capability group for the planned-but-not-built surface

This boundary is explicit so reviewers and operators are not surprised by gaps that are deliberate rather than accidental.

## Session Invalidation

- Sessions expire after 24 hours and require re-authentication
- Deactivating a user in GovEA blocks new sign-ins immediately (checked in the authentication flow). Existing active sessions continue until they expire (within 24h)
- **Important:** Deactivating a user in the identity provider (e.g. Entra ID) alone does not revoke their active GovEA session. The next login attempt will fail (within 24h at latest due to session expiry), but the current session persists until it expires
- This 24h residual access window is an accepted v1 trade-off
- SCIM-based real-time provisioning sync is out of scope for v1

## Implementation Status
Shipped (v1). OIDC sign-in via Microsoft Entra ID is enabled at deploy time through `AUTH_MICROSOFT_ENTRA_ID_*` environment variables; the login page conditionally renders the SSO button based on env presence. Pre-provisioning is enforced — unprovisioned identities are blocked. Self-serve tenant SSO configuration through the admin UI is a follow-up gap surfaced under #530. Failover-mode behavior is tracked under #7.

## Links
- Depends on: User Management, Role-Based Access Control
- Related: Local Authentication, IAM Audit Trail
