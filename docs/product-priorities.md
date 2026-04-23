# Product Priority Shortlist

Last groomed: 2026-04-23

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

Recent merges strengthened the product in six areas:

- The second municipal demo organization is now merged, so GovEA has a stronger multi-org and instance-admin demo base.
- Guided stakeholder answers are now shipped through `/answers?q=`, connected from search results, and filtered by viewer publication rules.
- The roadmap now has an executive timeline view in addition to the existing grid, and the viewer filter bug on roadmap data was fixed.
- Mission-to-technology traceability, repository-wide search, and viewer visibility rules remain core shipped foundations.
- Instance administration is a usable console with org inventory, user management, audit view, org suspension, and audited break-glass sessions.
- Framework Alignment is documented as an optional overlay, but implementation has not started.

New signal since the prior grooming pass:

- PR #257 merged and closed #252. The glossary reference-source bug #258 should be closed if merge verification is complete.
- PR #260 merged and closed #221, moving guided stakeholder answers from backlog to shipped capability.
- PR #261 merged and closed #218, moving the executive roadmap timeline from backlog to shipped capability.
- PR #263 is open and mergeable for #253, covering dialog title consistency and the ADR tooltip.
- Issue #262 adds an important design question: principles likely need typed sets such as Architecture and Data before principle usage grows too far as one flat list.

The next work should consolidate the shipped demo/story improvements, finish the visible UX cleanup, and choose the next product slice carefully rather than continuing to build only broad dashboard surfaces.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) / PR |
|---|---|---|---|
| 1 | Review, validate, and merge the dialog consistency PR | PR #263 is small, mergeable, and closes a visible demo-quality issue; validate dialog titles, the ADR tooltip, and the new tooltip dependency before merge | PR #263, #253 |
| 2 | Define and seed the TOGAF overlay demo path before implementation | The core demo now has richer content and stakeholder views; framework alignment is the next credibility story, but it needs a constrained first slice before schema/UI work starts | #245, #247, related #89 |
| 3 | Decide the principle-set model | Principle usage is implemented, but #262 correctly identifies that Architecture, Data, Security, and similar principle families should not remain a flat undifferentiated list | #262 |
| 4 | Validate stakeholder demo personas and confidence needs | Guided answers and the executive timeline shipped from assumed stakeholder needs; before adding more leadership visuals, validate what Department Director, Budget/Performance, and Elected Official users actually trust | #216, #220 |
| 5 | Ship the next stakeholder trust visual: repository confidence summary | After guided answers and the roadmap timeline, the next adoption gap is explaining whether the repository is current enough to trust without exposing internal maintenance noise | #220, related #219 |

## Product Manager Notes

- Treat PR #263 as the immediate review item, not new implementation work. It is the fastest way to close the remaining item from the prior top-five list.
- For TOGAF, keep the first implementation slice narrow: framework mapping plus one TOGAF-aligned report or demo path is enough to test the overlay story.
- Do the principle-set decision before expanding data governance, AI, security, or integration principle content. Retrofitting types after many principles exist will be noisier.
- Do not keep building leadership visuals from assumptions alone. #216 should inform whether #220 repository confidence or #219 application risk portfolio comes next.
- If #258 was verified through PR #257, close it as fixed so open bugs reflect current reality.

## Documentation Follow-up

This grooming pass also updates the public docs so they do not describe merged work as future work:

- `README.md`: current status and near-term priorities now reflect merged demo data, guided answers, and executive roadmap timeline.
- `capabilities.md`: Planning & Roadmap and Frontend Display summaries now include the shipped timeline and guided-answer capabilities.
