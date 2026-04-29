# Capability: Site Settings

## What It Does
The system must allow administrators to configure the basic identity and appearance of the site from the admin UI without touching configuration files. In the current product, this is centered on theme and branding behavior rather than a full organization-settings suite.

## Personas
- **CMS Administrator** — configures site settings at initial setup and updates them as the organization changes

## Behaviors
- Select the active predefined organization theme from the Settings page
- Apply the selected theme immediately across the authenticated shell
- Persist the selected theme as an organization-level setting
- Expose the current appearance configuration without requiring a restart
- Reserve broader organization metadata, locale, and branding settings for future iterations

## Rules
- Site settings changes take effect immediately without a restart
- Only Admins can access or modify site settings
- Site settings in this capability are organization-scoped, not instance-scoped platform settings

## Implementation Status
- **v1:** Theme selection and appearance settings are implemented.
- **Future:** Organization name, URL, timezone, logo, locale, and richer branding controls should be documented and shipped when the broader settings surface exists.

## Links
- Depends on: IAM — Role-Based Access Control, IAM — First-Run Setup
- Related: Admin Dashboard, Email Configuration
