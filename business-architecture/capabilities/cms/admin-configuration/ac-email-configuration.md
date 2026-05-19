# Capability: Email Configuration

## What It Does
The system must allow administrators to configure outbound email so that transactional messages — password resets, notifications, and system alerts — are delivered reliably.

## Personas
- **CMS Administrator** — configures SMTP settings; tests email delivery; troubleshoots delivery failures

## Behaviors
- Configure SMTP server, port, authentication credentials, and TLS settings from the admin UI
- Send a test email to verify configuration is working
- Set the From name and From address used on all outbound email
- View a log of recent outbound email attempts and their delivery status
- Display a warning on the admin dashboard if email is not configured

## Rules
- Email configuration is optional — the system functions without it, but password reset and notifications will be unavailable
- SMTP credentials are stored encrypted — never displayed in plaintext after saving
- Only Admins can access email configuration
- The test email must be sent to the Admin's own address — not an arbitrary address

## Implementation Status

**Not yet implemented.** No SMTP / email configuration surface exists under `apps/govea/src/app/(admin)/**`. `/dashboard` does not surface an "email not configured" warning. No email-sending dependency in `package.json`. Confirmed during the CMS Administrator persona journey audit ([#526](https://github.com/roballred/GovEA/issues/526)). Tracked at [#528](https://github.com/roballred/GovEA/issues/528).

## Links
- Depends on: IAM — Role-Based Access Control
- Related: Site Settings, IAM — Local Authentication
