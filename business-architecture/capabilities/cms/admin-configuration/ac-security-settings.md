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

## Links
- Depends on: IAM — Role-Based Access Control, IAM — Local Authentication
- Related: Site Settings, IAM — SSO Authentication
