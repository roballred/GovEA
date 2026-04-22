# Product Priority Shortlist

Last groomed: 2026-04-22

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

Recent merges strengthened the product in five areas:

- Mission-to-technology traceability, repository-wide search, and viewer visibility rules are now shipped.
- The product tour improved first-run orientation for admins, contributors, and viewers.
- Direct Service/Application and Objective/Application shortcuts were removed, making Capability the consistent bridge from mission/service context to technology.
- Instance administration moved from backend foundation to a usable console with org inventory, user management, audit view, org suspension, and audited break-glass sessions.
- Framework Alignment is now documented as an optional overlay, but implementation has not started.

New signal since the prior grooming pass:

- PR #257 is open and mergeable. It implements the second city demo dataset, updates the dev/demo login roster, and includes the glossary source pre-population fix described in #258.
- Because #252 is now in review rather than untouched backlog, the immediate product-manager action is to validate and merge PR #257 instead of starting a new implementation slice for that same work.

The next work should turn the shipped foundations into stronger demos, stakeholder-facing answers, and focused product polish.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) / PR |
|---|---|---|---|
| 1 | Review, validate, and merge the City of Lakeside demo PR | PR #257 completes the highest-leverage multi-org demo slice and also fixes the glossary reference-source edit bug; it should be verified for seed idempotency, dev-only instance-admin gating, and Lakeside tenant boundaries before merge | PR #257, #252, #258 |
| 2 | Ship one stakeholder-facing direct-answer view | Search and traceability are shipped, but adoption improves when a Department Director or elected official can ask a plain-language question and get a briefing-ready answer | #221, related #218, #219, #220 |
| 3 | Build the executive roadmap timeline | Planning data exists, but leadership demos still need a clearer view of what is changing, when, and why it matters | #218 |
| 4 | Define and seed the TOGAF overlay demo path before implementation | Framework Alignment is documented as optional; a demo dataset lets the team validate the overlay story without making TOGAF mandatory | #245, #247 |
| 5 | Clean up create/edit dialog naming and tooltip consistency | This is a small visible UX quality issue surfaced after recent UI work; fixing it reduces friction and makes the product feel more coherent in demos | #253 |

## Product Manager Notes

- Treat PR #257 as the first action item, not a new build request. The useful next step is review: run seed/reset validation, check the dev login roster, verify production does not expose the instance-admin shortcut, and confirm the glossary source edit fix.
- If PR #257 merges cleanly, close #252 and #258, then promote the direct-answer view (#221) to the next implementation slice.
- For stakeholder-facing views, start narrow. A guided answer for one question such as "what supports permitting?" is more useful than another broad dashboard.
- Keep the executive roadmap work connected to the same stakeholder story; it should answer briefing questions, not only improve internal planning views.
- Do not start framework overlay implementation until #245 has an accepted first slice. The likely first slice is framework mapping plus one TOGAF-aligned report.
- Keep the UX consistency work small and opportunistic; it should not displace demo-data review or stakeholder-answer work.

## Documentation Follow-up

This grooming pass keeps the active priority document aligned with current GitHub state:

- #252 is now represented by open PR #257 rather than only as future backlog.
- #258 is tracked as a bug fixed by PR #257 and should be closed after merge verification.
- The remaining top priorities stay unchanged because no newer issue or PR displaced the stakeholder-answer, roadmap, TOGAF overlay, or dialog-consistency work.
