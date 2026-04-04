# Capability: Feature Management

## What It Does
The system must allow administrators to enable and disable optional modules and features without code changes or restarts. Only the features an agency needs are active.

## Personas
- **CMS Administrator** — enables features as the organization's needs grow; disables unused features to reduce complexity

## Behaviors
- View a list of all available features with their current enabled/disabled state
- Enable a feature and have it become immediately active
- Disable a feature and have it become immediately inactive
- Display feature dependencies — warn when enabling a feature that requires another feature to be active first
- Display which features are required and cannot be disabled

## Rules
- Core features (IAM, Content Management) cannot be disabled
- Disabling a feature does not delete its data — re-enabling restores full functionality
- Only Admins can manage features
- Feature changes take effect without a server restart

## Links
- Depends on: IAM — Role-Based Access Control
- Related: Site Settings
