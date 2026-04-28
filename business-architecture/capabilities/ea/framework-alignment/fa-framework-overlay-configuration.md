# Capability: Framework Overlay Configuration

## What It Does

The system must allow administrators to enable, disable, and configure optional framework overlays for an organization. Configuration controls whether framework mappings, ADM phase labels, and framework-specific reports appear in the user experience.

## Personas

- **CMS Administrator** — needs to configure framework overlays without code changes or database access
- **Enterprise Architect (Central IT)** — may define recommended overlays for an instance or reference organization
- **Agency EA Coordinator** — needs confidence that enabling an overlay will not force new compliance burden on local users

## Behaviors

- Enable or disable a framework overlay per organization
- Choose which framework concepts or views appear in the UI
- Restrict framework-heavy labels to architect-facing or admin-facing surfaces
- Record configuration changes in the audit trail
- Preserve existing mappings when an overlay is temporarily disabled

## Rules

- Framework overlays are disabled by default.
- Enabling an overlay must not change existing content visibility or permissions.
- Disabling an overlay hides framework UI affordances but should not delete mapping data.
- Overlay configuration must be auditable.

## Implementation Status

Partially implemented.

Current shipped slice:

- Org admins can enable or disable the TOGAF framework overlay from settings
- The overlay is off by default for new organizations
- Disabling the overlay hides framework UI without deleting saved mapping data

Not yet shipped:

- Per-framework options beyond the single TOGAF toggle
- Per-entity or per-report overlay controls
- Admin-defined framework bundles or reference sources

## Links

- Depends on: Admin Configuration, IAM Audit Trail, Feature Management
- Related: Framework Reference Management, Framework Mapping, ADM Phase Alignment
- Personas served: CMS Administrator, Enterprise Architect, Agency EA Coordinator
