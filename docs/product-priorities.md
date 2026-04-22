# Product Priority Shortlist

Last groomed: 2026-04-22

This note summarizes the top next product moves from the current capability inventory, open issues, and recent merged pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

Recent merges strengthened the product in five areas:

- Mission-to-technology traceability, repository-wide search, and viewer visibility rules are now shipped.
- The product tour improved first-run orientation for admins, contributors, and viewers.
- Direct Service/Application and Objective/Application shortcuts were removed, making Capability the consistent bridge from mission/service context to technology.
- Instance administration moved from backend foundation to a usable console with org inventory, user management, audit view, org suspension, and audited break-glass sessions.
- Framework Alignment is now documented as an optional overlay, but implementation has not started.

The next work should convert those foundations into stronger demo data, stakeholder-facing answers, and focused product polish.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Add the second city demo dataset and updated dev/demo login roster | Instance admin and federation now need richer multi-org data to demonstrate tenant boundaries, separate municipal admin experiences, and dev-only instance-admin login behavior | #252 |
| 2 | Ship one stakeholder-facing direct-answer view | Search and traceability are shipped, but adoption improves when a Department Director or elected official can ask a plain-language question and get a briefing-ready answer | #221, related #218, #219, #220 |
| 3 | Build the executive roadmap timeline | Planning data exists, but leadership demos still need a clearer view of what is changing, when, and why it matters | #218 |
| 4 | Define and seed the TOGAF overlay demo path before implementation | Framework Alignment is documented as optional; a demo dataset lets the team validate the overlay story without making TOGAF mandatory | #245, #247 |
| 5 | Clean up create/edit dialog naming and tooltip consistency | This is a small visible UX quality issue surfaced after recent UI work; fixing it reduces friction and makes the product feel more coherent in demos | #253 |

## Product Manager Notes

- Treat #252 as the highest leverage next slice because it turns the now-shipped instance-admin and federation features into a credible multi-org demo.
- For stakeholder-facing views, start narrow. A guided answer for one question such as "what supports permitting?" is more useful than another broad dashboard.
- Keep the executive roadmap work connected to the same stakeholder story; it should answer briefing questions, not only improve internal planning views.
- Do not start framework overlay implementation until #245 has an accepted first slice. The likely first slice is framework mapping plus one TOGAF-aligned report.
- Keep the UX consistency work small and opportunistic; it should not displace demo-data or stakeholder-answer work.

## Documentation Follow-up

This grooming pass also refreshed:

- `README.md`: current status and near-term priorities
- `capabilities.md`: instance-admin console, product tour, and capability-mediated application links
- `docs/data-model.md`: current schema shape, removed direct joins, instance-admin fields, and org suspension fields
