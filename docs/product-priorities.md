# Product Priority Shortlist

Last groomed: 2026-04-28

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

Recent merges materially changed the product surface:

- PR #304 shipped the Application Portfolio risk view, giving GovEA a stronger leadership-facing application surface built from existing lifecycle and capability-link data.
- PR #299 shipped the Reports hub and Architecture Vision output, proving GovEA can generate executive summaries directly from repository content rather than requiring duplicate documentation.
- PR #301 shipped the first TOGAF overlay slice: org-level enablement, framework mappings on capability/application records, and a TOGAF Application Landscape report.
- PR #303 documented the TOGAF/ADM boundary clearly: optional overlay in, ADM workflow enforcement out for v1/v2.
- PR #309 clarified the instance-admin product boundary and made the persona/capability model match the already-shipped `/instance` console.
- PR #310 reconciled several business-architecture docs, but a follow-up pass is still needed because top-level docs had drifted behind the newest product work.

What this means for prioritization:

- GovEA now has stronger admin, reporting, and leadership-demo foundations than it did a week ago.
- The next best work is less about another isolated CRUD slice and more about turning the existing repository into decision support for platform admins, leadership audiences, and real-user feedback loops.
- The repo still has important long-range ARB and market-research issues open, but the highest-leverage next moves are the ones that compound the product areas strengthened by the latest merges.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) / PR |
|---|---|---|---|
| 1 | Define and ship instance-level platform configuration | The `/instance` console is now real, documented, and clearly separated from org admin scope. #308 is the immediate product follow-on that turns instance admin from an audit/provisioning console into a real platform-management surface. | #308, PR #309 |
| 2 | Build the Executive Dashboard for non-architects | PR #304 and PR #299 already proved the underlying summary data and leadership framing. #84 is the clearest next stakeholder-facing screen and the strongest adoption move in the open backlog. | #84, PR #304, PR #299 |
| 3 | Add Impact Analysis on application and capability detail pages | GovEA already has the traceability graph and now has better portfolio/risk storytelling. #83 is the next decision-support feature that helps users act on lifecycle and modernization questions instead of just viewing linked records. | #83 |
| 4 | Add Heatmap Analysis views | With the application risk portfolio shipped, #82 becomes a natural companion view for portfolio exposure, maturity, and domain-level pattern detection using the same core data. | #82, PR #304 |
| 5 | Start lightweight user feedback capture for practice fit | The product now has enough breadth that wrong assumptions will compound unless feedback is captured systematically. #103 has a low-cost Phase 1 that can start immediately without waiting for a full in-app workflow. | #103 |

## Product Manager Notes

- Treat #308 as the most concrete next product-management task. The repo now has a documented instance-admin boundary but not yet a clearly owned platform-config surface.
- #84, #83, and #82 form a coherent sequence, not three isolated ideas: executive summary -> decision-support drill-down -> portfolio pattern visualization.
- #306 is worth keeping warm as an input to future analysis and reporting work, but it is narrower than the five items above unless real users confirm it is blocking capability modelling today.
- The ARB/research issues in the 90s and 130s still matter, but many are capability-definition or scope-decision work. The shortlist above favors moves that build directly on what the latest merged code already made possible.
- Ship the Phase 1 manual feedback log from #103 before designing a full feedback table/UI. The process signal is more urgent than the schema.

## Documentation Follow-up

This grooming pass also updates product docs to match current repo reality:

- `docs/product-priorities.md`: replaced the stale hardening shortlist with the current product-development sequence.
- `README.md`: now reflects the shipped application risk portfolio, reports hub, and TOGAF overlay/reporting slice.
- `capabilities.md`: now marks Application Risk Portfolio and the first framework-alignment slice accurately.
- `business-architecture/capabilities/ea/framework-alignment/*.md`: implementation status now matches the shipped TOGAF overlay, mapping, and reporting behavior.
- `business-architecture/capabilities/cms/frontend-display/fd-application-risk-portfolio.md`: now explicitly records the shipped v1 implementation status.
