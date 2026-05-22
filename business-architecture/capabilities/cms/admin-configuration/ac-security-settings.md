# Capability: Security Settings

## What It Does
The system must allow administrators to configure security policies — password requirements, session behavior, and account lockout rules — to meet the agency's security standards without code changes.

## Personas
- **CMS Administrator** — sets and maintains security policies; ensures the system meets agency IT security requirements

## Behaviors
- Configure minimum password length and complexity requirements (uppercase, lowercase, digits, special characters)
- Configure session timeout duration
- Configure account lockout threshold — number of failed login attempts before lockout
- Configure account lockout duration
- Configure password expiry period (optional)

## Rules
- Security settings apply to local authentication only — SSO password policy, session behavior, and MFA enforcement are managed by the identity provider (Entra ID, Okta, PingFederate, etc.)
- **MFA / 2FA is delegated to the client IDP** — GovEA does not implement an in-app second factor. Agencies that require MFA configure it in their SSO provider and require SSO sign-in for the relevant users. This avoids a duplicate MFA surface that fights the agency's existing identity controls, and inherits conditional access (device posture, geofencing, etc.) that the IDP already enforces.
- Changes to security settings apply to future logins and sessions — existing sessions are not immediately terminated
- Only Admins can access security settings
- Minimum password length cannot be set below 8 characters (the system-level floor; an admin can configure higher)

## Implementation Status

**Implemented in #527 / #612.** All policy behaviors above are configurable from `/settings` → Security and enforced end-to-end:

- Password policy (length, complexity) — enforced in `validatePassword(password, policy)` from the per-org `securitySettings`; wired into createUser, editUser, and self-service change-password.
- Session timeout — enforced in the NextAuth jwt callback; per-org `sessionTimeoutMinutes` lowers the 24h ceiling.
- Account lockout — `failedLoginAttempts` + `lockoutUntil` columns on `users`; lockout check runs before password comparison (NIST 800-63B §5.2.2).
- Password expiry — enforced via Next.js middleware redirect to `/change-password`. Edge-safe: the policy snapshot rides on the JWT, refreshed every 5 minutes alongside the active-user check.

**MFA is intentionally NOT implemented in-app.** Per the rule above, MFA is the IDP's responsibility. The application supports SSO via Microsoft Entra ID today; the same SSO surface handles MFA enforcement, conditional access, and device-posture checks. Tracked in the capability for completeness; not a backlog gap.

## Links
- Depends on: IAM — Role-Based Access Control, IAM — Local Authentication
- Related: Site Settings, IAM — SSO Authentication
