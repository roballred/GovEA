# Capability: Admin & Configuration

**Scope:** v1

## What It Does
The system must provide administrators with the tools needed to configure, monitor, and maintain the site without requiring code changes or server access. In the current product this is an early admin toolkit rather than a complete operations surface.

## Personas
- **CMS Administrator** — configures and maintains the system on behalf of their organization

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Site Settings | [ac-site-settings.md](./ac-site-settings.md) | Theme selection and appearance configuration; broader org settings are future work |
| Persona Type Management | [ac-persona-type-management.md](./ac-persona-type-management.md) | Manage persona type categories as taxonomy terms |
| Persona Tags | [ac-persona-tags.md](./ac-persona-tags.md) | Manage persona tag values as taxonomy terms |
| Admin Dashboard | [ac-admin-dashboard.md](./ac-admin-dashboard.md) | Live coverage grid, needs-attention signals, recent activity, and domain summaries |
| Feature Management | [ac-feature-management.md](./ac-feature-management.md) | Enable and disable optional modules without code |
| Email Configuration | [ac-email-configuration.md](./ac-email-configuration.md) | SMTP settings for transactional email delivery |
| Security Settings | [ac-security-settings.md](./ac-security-settings.md) | Password policy, session timeout, and account lockout |
| Backup & Export | [ac-backup-export.md](./ac-backup-export.md) | Export and import configuration and content |

## Success Criteria

The following outcomes indicate Admin & Configuration is working well for a 1–3 person government IT department 6 months after deployment:

- An administrator can manage the currently supported settings and admin surfaces without touching a config file or restarting the server
- When a GovEA update is applied, the administrator can verify the system is healthy using the Admin Dashboard — no CLI or log file access required
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
- Platform governance responsibilities such as tenant lifecycle, instance-admin promotion, and break-glass access belong to IAM Instance Administration, not this capability group

## Implementation Status
- Implemented today: admin dashboard, user management, audit visibility, taxonomy and persona metadata management, org connections, theme selection, security settings (#612), and email configuration (#606)
- Future work: broader site settings, feature toggles, backup/export (#529), and operational SMTP transport (#528 follow-up)

## Links
- Depends on: IAM
- Related: Content Management
