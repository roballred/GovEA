# Capability: Feature Management

## What It Does
The system must allow administrators to enable and disable optional modules without code changes or restarts so each organization sees only the parts of GovEA it needs.

## Personas
- **CMS Administrator** — enables features as the organization's needs grow; disables unused features to reduce complexity

## Behaviors
- View the current module list in Settings with each module's enabled or disabled state
- Enable a module and have it become available immediately in navigation and route access
- Disable a module and have it disappear from navigation without deleting its underlying data
- Apply module visibility consistently across desktop and mobile navigation
- Redirect direct navigation to a disabled module away from that route

## Rules
- Disabling a feature does not delete its data — re-enabling restores full functionality
- Only Admins can manage features
- Feature changes take effect without a server restart

## Implementation Status
- **v1:** Org-level module toggles are implemented for the current module set.
- **Future:** Dependency management, required-module rules, and broader feature-flag behavior remain future work.

## Links
- Depends on: IAM — Role-Based Access Control
- Related: Site Settings
