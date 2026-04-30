# Capability: Instance Administration

## What It Does
The system must support a distinct instance-scoped operating role for platform administration across the whole GovEA deployment. This role governs tenants, platform access, and cross-org operational controls without automatically becoming the working owner of every organization's EA repository.

## Personas
- **Instance Administrator** — operates the GovEA instance as a shared platform and needs platform-wide controls with clear guardrails

## Behaviors
- View a platform dashboard with tenant counts, user counts, active break-glass sessions, and recent instance-level events
- View all organizations registered on the instance, including status and basic metadata
- View a cross-org user inventory and grant or remove `instance_admin` from eligible users
- Suspend and unsuspend organizations with an explicit reason captured in the audit log
- View instance-level audit events separately from org-scoped audit events
- Grant time-limited break-glass access to a specific organization for support or incident investigation
- Revoke break-glass access before expiry when the investigation is complete

## Rules
- `instance_admin` is stored separately from the org-scoped user role and does not replace it
- Instance admin does not automatically grant create, edit, publish, or delete rights across every org's EA content
- Org-scoped configuration such as themes, enabled modules, and framework overlays remains with the organization's Admin role
- Break-glass access must be time-limited, explicitly granted, and fully audited
- The system org cannot be suspended through the normal instance-admin UI
- Instance-level actions must be distinguishable from org-level actions in the audit trail

## Implementation Status
- **v1:** Platform dashboard, org inventory, org detail, cross-org user view, org suspension, instance-admin promotion/demotion, instance audit view, and audited break-glass sessions are implemented.
- **Future:** Org creation, platform defaults, endpoint and integration configuration, and richer tenant-governance controls should be added here rather than folded into org-admin settings.

## Links
- Depends on: User Management, Role-Based Access Control, IAM Audit Trail
- Related: Multi-Organization Federation
