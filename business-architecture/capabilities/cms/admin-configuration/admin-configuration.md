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

## Rules
- All Admin & Configuration capabilities are accessible to Admins only
- Configuration changes must not require a server restart
- No Admin & Configuration function should require CLI or database access

## Links
- Depends on: IAM
- Related: Content Management
