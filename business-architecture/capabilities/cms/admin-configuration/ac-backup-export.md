# Capability: Backup & Export

## What It Does
The system must allow administrators to export the full site configuration and content so that the system can be backed up, migrated to a new host, or restored after data loss.

## Personas
- **CMS Administrator** — performs exports before upgrades or migrations; restores from backup when needed

## Behaviors
- Export the full site configuration as a JSON recipe file (content types, taxonomy, settings, roles)
- Export all content items as a JSON file
- Export configuration and content together as a single archive
- Import a previously exported archive to restore or migrate the system
- Display the timestamp and size of the last export on the admin dashboard

## Rules
- Exports include configuration and content but never include user passwords or SMTP credentials
- Import is a destructive operation — the admin must confirm before proceeding
- Only Admins can perform exports and imports
- Export files are available for download immediately — no background job required for v1

## Implementation Status

**Not yet implemented.** No operational backup / export surface exists under `apps/govea/src/app/(admin)/**`. The dashboard does not show a last-export timestamp. Distinct from data portability (which is scoped separately as [#86](https://github.com/roballred/GovEA/issues/86) and concerns external-tool consumption rather than operational restore). Confirmed during the CMS Administrator persona journey audit ([#526](https://github.com/roballred/GovEA/issues/526)). Tracked at [#529](https://github.com/roballred/GovEA/issues/529).

## Links
- Depends on: IAM — Role-Based Access Control
- Related: Site Settings, Feature Management, Admin Dashboard
