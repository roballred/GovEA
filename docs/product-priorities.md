# Product Priority Shortlist

Last groomed: 2026-04-23

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

Recent merges strengthened the product in seven areas:

- The second municipal demo organization is now merged, so GovEA has a stronger multi-org and instance-admin demo base.
- Guided stakeholder answers are now shipped through `/answers?q=`, connected from search results, and filtered by viewer publication rules.
- The roadmap now has an executive timeline view in addition to the existing grid, and the viewer filter bug on roadmap data was fixed.
- Dialog naming and ADR tooltip consistency have merged, closing the last visible UX cleanup item from the prior shortlist.
- Mission-to-technology traceability, repository-wide search, and viewer visibility rules remain core shipped foundations.
- Instance administration is a usable console with org inventory, user management, audit view, org suspension, and audited break-glass sessions.
- Framework Alignment is documented as an optional overlay, but implementation has not started.

New signal since the prior grooming pass:

- PR #263 merged and closed #253. Dialog title consistency is no longer a top-five backlog item.
- PR #265 is open and mergeable for #262, adding taxonomy-backed principle sets for Architecture and Data.
- Issue #266 surfaced an important taxonomy safety gap: deleting a Principle Type can orphan existing principles because the reference is stored as plain text.
- Issue #258 still appears open even though its body says it was fixed in PR #257; close it after merge verification if no regression remains.
- Stakeholder-facing visuals are now useful enough for demos, but further leadership-facing work should be validated against real stakeholder confidence needs.

The next work should finish the principle-set slice safely, then move into framework alignment and stakeholder trust only where the scope is narrow and traceable.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) / PR |
|---|---|---|---|
| 1 | Review and merge typed principle sets, then handle taxonomy delete safety | PR #265 closes the principle-set design gap, but #266 shows the follow-up safety work needed before admins can freely manage Principle Type taxonomy values | PR #265, #262, #266 |
| 2 | Define and seed the TOGAF overlay demo path before implementation | The core demo now has richer content and stakeholder views; framework alignment is the next credibility story, but it needs a constrained first slice before schema/UI work starts | #245, #247, related #89 |
| 3 | Validate stakeholder demo personas and confidence needs | Guided answers and the executive timeline shipped from assumed stakeholder needs; before adding more leadership visuals, validate what Department Director, Budget/Performance, and Elected Official users actually trust | #216, #220 |
| 4 | Ship the next stakeholder trust visual: repository confidence summary | After guided answers and the roadmap timeline, the next adoption gap is explaining whether the repository is current enough to trust without exposing internal maintenance noise | #220, related #219 |
| 5 | Decide the next EA analysis slice: application risk, lifecycle, or rationalisation | The portfolio is strong as inventory; the next product value step is decision support that helps leaders see risk, modernization pressure, and investment tradeoffs | #219, #92 |

## Product Manager Notes

- Treat PR #265 as the immediate review item. Validate taxonomy seeding, edit pre-selection, type badges, and the migration note before merge.
- Treat #266 as a near-immediate follow-up to #265. Blocking deletion for in-use taxonomy terms is safer than silently clearing or rewriting principle types.
- For TOGAF, keep the first implementation slice narrow: framework mapping plus one TOGAF-aligned report or demo path is enough to test the overlay story.
- Do not keep building leadership visuals from assumptions alone. #216 should inform whether #220 repository confidence or #219 application risk portfolio comes next.
- If #258 was verified through PR #257, close it as fixed so open bugs reflect current reality.

## Documentation Follow-up

This grooming pass also keeps public docs aligned with current repo state:

- `docs/product-priorities.md`: removes merged #253 from the active top-five list and adds #265/#266 as the immediate principle-set thread.
- `README.md`: active work now reflects typed principle review and taxonomy safety rather than already-merged dialog consistency work.
