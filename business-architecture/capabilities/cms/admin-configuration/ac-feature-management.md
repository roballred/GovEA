# Capability: Feature Management

## What It Does
The system must allow administrators to control optional module availability without code changes or restarts so each organization sees only the parts of GovEA it needs, while instance admins can make a module available or unavailable across the whole GovEA instance.

## Personas
- **CMS Administrator** — enables features as the organization's needs grow; disables unused features to reduce complexity
- **Instance Admin** — controls whether a module is available anywhere on the GovEA instance when a capability should be available to all tenants or unavailable to all tenants

## Behaviors
- View the current module list in Settings with each module's enabled or disabled state
- Enable a module and have it become available immediately in navigation and route access
- Disable a module and have it disappear from navigation without deleting its underlying data
- Apply module visibility consistently across desktop and mobile navigation
- Redirect direct navigation to a disabled module away from that route
- Make a module unavailable at the instance level and have it become unavailable to every organization, regardless of each org's local setting
- Make a module available again at the instance level without restoring or changing each organization's local preference
- Show org admins when a module is unavailable across the instance so the local settings UI matches the effective behavior

## Rules
- Making a module unavailable does not delete its data — making it available again restores full functionality
- Org-level feature changes are available to Admins
- Instance-wide feature changes are available only to Instance Admins
- Feature changes take effect without a server restart
- Organization-level module choices remain separate from instance-wide module availability controls

## Implementation Status
- **v1:** Org-level module toggles are implemented for the current module set.
- **Current product:** Instance Admins can now control module availability for the entire instance, making modules available or unavailable for every organization without deleting data.
- **Future:** Dependency management, required-module rules, and broader feature-flag behavior remain future work.

## Links
- Depends on: IAM — Role-Based Access Control
- Related: Site Settings, IAM — User Management
