# Capability: Security Settings

## What It Does
The system must allow administrators to configure security policies — password requirements, session behavior, and account lockout rules — to meet the agency's security standards without code changes.

## Personas
- **CMS Administrator** — sets and maintains security policies; ensures the system meets agency IT security requirements

## Behaviors
- Configure minimum password length and complexity requirements (uppercase, numbers, special characters)
- Configure session timeout duration for inactive users
- Configure account lockout threshold — number of failed login attempts before lockout
- Configure account lockout duration
- Require two-factor authentication for specific roles (optional)
- Configure password expiry period (optional)

## Rules
- Security settings apply to local authentication only — SSO password policy is managed by the identity provider
- Changes to security settings apply to future logins and sessions — existing sessions are not immediately terminated
- Only Admins can access security settings
- Minimum password length cannot be set below 8 characters

## Implementation Status

**Not yet implemented.** No security-settings surface exists under `apps/govea/src/app/(admin)/**`. The only password rule today is a hard-coded `PASSWORD_MIN_LENGTH = 8` constant in [`apps/govea/src/lib/password.ts`](../../../../apps/govea/src/lib/password.ts) — no configurable surface, no session timeout, no account lockout, no password expiry, no 2FA. Confirmed during the CMS Administrator persona journey audit ([#526](https://github.com/roballred/GovEA/issues/526)). Tracked at [#527](https://github.com/roballred/GovEA/issues/527).

## Links
- Depends on: IAM — Role-Based Access Control, IAM — Local Authentication
- Related: Site Settings, IAM — SSO Authentication
