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

Partially implemented — now realized through taxonomy-backed recipes, not a module toggle (ADR-0002, #665/#675).

Current shipped slice:

- TOGAF is enabled per organization by installing the taxonomy-backed recipe, which creates the Architecture Domain and ADM Phase taxonomy types; there is no separate overlay module or on/off toggle
- Framework taxonomy types carry an `audience: 'framework'` flag, so framework labels and framework-specific reports stay hidden from viewer-role users and stakeholder-facing views by default (preserving ADR-0001's no-jargon guarantee)
- Framework reports appear only when the recipe's taxonomy is present
- Removing the taxonomy hides framework affordances; tagged values live in the generic entity-taxonomy store

Not yet shipped:

- An admin-facing recipe install/uninstall surface (the engine and catalog exist; the UI is a follow-on)
- Per-framework configuration options beyond installing a recipe
- Frameworks other than TOGAF

## Links

- Depends on: Admin Configuration, IAM Audit Trail, Feature Management
- Related: Framework Reference Management, Framework Mapping, ADM Phase Alignment
