# Product Priority Shortlist

Last groomed: 2026-04-22

This note summarizes the top next product moves from the current capability inventory, open issues, and recent merged pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

Recent merges strengthened the product in four areas:

- Mission-to-technology traceability, repository-wide search, and viewer visibility rules are now shipped.
- The product tour improved first-run orientation for admins, contributors, and viewers.
- Direct Service/Application and Objective/Application shortcuts were removed, making Capability the consistent bridge from mission/service context to technology.
- Instance-admin phase 1 shipped: schema, auth/session claim, RBAC helper, middleware guard, system org, and dev seed user.

The next work should convert those foundations into demoable, stakeholder-facing value while closing the most visible operating gaps.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Build the instance admin console and audited break-glass workflow | Phase 1 is merged, so the product now has backend primitives without the operator experience needed to manage orgs, users, audit, and support access safely | #240, #235 |
| 2 | Add the second city demo dataset and updated dev/demo login roster | Multi-org behavior is a core GovEA differentiator, but demos still lean too heavily on one city; this also exercises instance-admin and tenant-boundary assumptions | #252 |
| 3 | Ship one stakeholder-facing direct-answer view | Search and traceability are shipped, but adoption improves when a Department Director or elected official can ask a plain-language question and get a briefing-ready answer | #221, related #218, #219, #220 |
| 4 | Define and seed the TOGAF overlay demo path before implementation | Framework Alignment is now documented as an optional capability group; a demo dataset lets the team validate the overlay story without making TOGAF mandatory | #245, #247 |
| 5 | Clean up create/edit dialog naming and tooltip consistency | This is a small visible UX quality issue surfaced after recent UI work; fixing it reduces friction and makes the product feel more coherent in demos | #253 |

## Product Manager Notes

- Treat #240 as the highest leverage engineering slice because it turns the new instance-admin foundation into an operable product surface.
- Keep #252 close behind #240. A second city will make federation, instance administration, demo logins, and tenant boundaries easier to verify and explain.
- For stakeholder-facing views, start narrow. A guided answer for one question such as "what supports permitting?" is more useful than another broad dashboard.
- Do not start framework overlay implementation until #245 has an accepted first slice. The likely first slice is framework mapping plus one TOGAF-aligned report.
- Keep the UX consistency work small and opportunistic; it should not displace the platform-admin or demo-data work.

## Documentation Follow-up

This grooming pass also refreshed:

- `README.md`: current status and near-term priorities
- `capabilities.md`: instance-admin foundation, product tour, and capability-mediated application links
- `docs/data-model.md`: current schema shape, removed direct joins, and instance-admin tables/fields
