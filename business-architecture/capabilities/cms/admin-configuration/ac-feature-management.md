# Capability: Feature Management

## What It Does
The system must allow administrators to enable and disable optional modules without code changes or restarts so each organization sees only the parts of GovEA it needs.

## Personas
- **CMS Administrator** — enables features as the organization's needs grow; disables unused features to reduce complexity
- **Instance Admin** — disables features across the entire GovEA installation when a capability should be unavailable to every tenant

## Behaviors
- View the current module list in Settings with each module's enabled or disabled state
- Enable a module and have it become available immediately in navigation and route access
- Disable a module and have it disappear from navigation without deleting its underlying data
- Apply module visibility consistently across desktop and mobile navigation
- Redirect direct navigation to a disabled module away from that route
- Disable a module at the instance level and have it become unavailable to every organization, regardless of each org's local setting
- Show org admins when a feature is locked off globally so the local settings UI matches the effective behavior

## Rules
- Disabling a feature does not delete its data — re-enabling restores full functionality
- Org-level feature changes are available to Admins
- Instance-wide feature changes are available only to Instance Admins
- Feature changes take effect without a server restart

## Implementation Status
- **v1:** Org-level module toggles are implemented for the current module set.
- **Current product:** Instance Admins can now disable modules for the entire instance, forcing them off for every organization without deleting data.
- **Future:** Dependency management, required-module rules, and broader feature-flag behavior remain future work.

## Links
- Depends on: IAM — Role-Based Access Control
- Related: Site Settings, IAM — User Management
