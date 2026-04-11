# Capability: Admin & Configuration

## What It Does
The system must provide administrators with a complete set of tools to configure, monitor, and maintain the site — from initial setup through ongoing operations — without requiring code changes or server access.

## Personas
- **CMS Administrator** — the sole user of this capability group; configures and maintains the system on behalf of the organization

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Site Settings | [ac-site-settings.md](./ac-site-settings.md) | Organization name, URL, timezone, and branding |
| Feature Management | [ac-feature-management.md](./ac-feature-management.md) | Enable and disable optional modules without code |
| Admin Dashboard | [ac-admin-dashboard.md](./ac-admin-dashboard.md) | System health, content status, and repository completeness |
| Email Configuration | [ac-email-configuration.md](./ac-email-configuration.md) | SMTP settings for transactional email delivery |
| Security Settings | [ac-security-settings.md](./ac-security-settings.md) | Password policy, session timeout, and account lockout |
| Backup & Export | [ac-backup-export.md](./ac-backup-export.md) | Export and import configuration and content |

## Success Criteria

The following outcomes indicate Admin & Configuration is working well for a 1–3 person government IT department 6 months after deployment:

- An administrator can change site settings, configure email, and update security policy without touching a config file or restarting the server
- When a GovEA update is applied, the administrator can verify the system is healthy using the Admin Dashboard — no CLI or log file access required
- An administrator can export a full backup of content and configuration, and restore it on a new instance, without developer help
- If the primary administrator leaves, a replacement can take over all administrative functions using the Admin Dashboard and User Management — no credentials or institutional knowledge are lost because they are documented in the system

## Upgrade & Migration

GovEA follows a migration-based upgrade model. This section defines expectations for how upgrades are applied and what administrators need to know.

| Concern | Approach |
|---|---|
| Database migrations | Applied automatically on startup via Drizzle; migrations are idempotent and tracked in `_journal.json` |
| Rollback | Roll back by restoring the previous Docker image and database backup; migrations are not automatically reversed |
| Breaking changes | Documented in release notes; migrations that alter existing data are flagged as breaking |
| Configuration drift | Site settings persist in the database — no manual re-entry required on upgrade |
| Release notes | Published with each release; link available from the Admin Dashboard once implemented |

## Rules
- All Admin & Configuration capabilities are accessible to Admins only
- Configuration changes must not require a server restart
- No Admin & Configuration function should require CLI or database access

## Links
- Depends on: IAM
- Related: Content Management
