# Capability: Site Settings

## What It Does
The system must allow administrators to configure the basic identity and behavior of the site — organization name, URL, timezone, and branding — from the admin UI without touching configuration files.

## Personas
- **CMS Administrator** — configures site settings at initial setup and updates them as the organization changes

## Behaviors
- Set and update the organization name displayed throughout the site
- Set the site URL used for email links and canonical references
- Configure the default timezone for date and time display
- Upload a logo for use in the admin interface and front-end
- Set a site description used in metadata
- Configure the default language and locale

## Rules
- Site settings changes take effect immediately without a restart
- Organization name and site URL are required — the system should prompt for these during first-run setup
- Only Admins can access or modify site settings

## Links
- Depends on: IAM — Role-Based Access Control, IAM — First-Run Setup
- Related: Admin Dashboard, Email Configuration
