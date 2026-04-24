# Product Priority Shortlist

Last groomed: 2026-04-23

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

Recent merges strengthened the product in seven areas:

- The second municipal demo organization is now merged, so GovEA has a stronger multi-org and instance-admin demo base.
- Guided stakeholder answers are now shipped through `/answers?q=`, connected from search results, and filtered by viewer publication rules.
- The roadmap now has an executive timeline view in addition to the existing grid, and the viewer filter bug on roadmap data was fixed.
- Dialog naming and ADR tooltip consistency have merged, closing the last visible UX cleanup item from the prior shortlist.
- PR #268 merged the typed-principle and markdown-rendering slice, so principle sets and prose rendering are now part of the shipped baseline.
- Mission-to-technology traceability, repository-wide search, and viewer visibility rules remain core shipped foundations.
- Instance administration is a usable console with org inventory, user management, audit view, org suspension, and audited break-glass sessions.
- Framework Alignment is documented as an optional overlay, but implementation has not started.

New signal since the prior grooming pass:

- PR #268 merged and superseded PR #265, so #262 is now shipped and docs should treat taxonomy-backed principle sets as implemented.
- Issue #266 is now a true post-merge integrity gap: deleting a Principle Type can orphan existing principles because the reference is stored as plain text.
- Four fresh security and tenancy issues now dominate near-term priority: bare-email auth lookup across orgs (#269), viewer access to unpublished glossary content (#270), the Next.js App Router DoS advisory (#271), and unsafe glossary source URLs (#272).
- Issue #273 is the clear UX follow-up to the markdown-rendering merge: authoring still uses plain textareas even though display now supports markdown.
- Issue #258 still appears open even though its body says it was fixed in PR #257; close it after merge verification if no regression remains.
- Stakeholder-facing visuals are now useful enough for demos, but the immediate backlog should favor security, tenant-boundary correctness, and content-integrity fixes before more demo-surface expansion.

The next work should first harden security and tenancy boundaries around the now-richer content model, then close the taxonomy-integrity gap introduced by the shipped principle-type work.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) / PR |
|---|---|---|---|
| 1 | Fix multi-org auth identity binding | #269 is the highest-risk tenant-boundary issue in the repo: auth and SSO resolve users by bare email even though uniqueness is only guaranteed per organization | #269 |
| 2 | Enforce published-only glossary access for viewers | #270 breaks the Viewer contract and leaks unpublished shared-reference content, which is especially visible now that glossary content is more central to stakeholder-facing views | #270 |
| 3 | Patch the Next.js App Router security advisory | #271 is a framework-level DoS fix with a known patched target release, so it is a straightforward security-hardening move with broad platform value | #271 |
| 4 | Validate glossary source URLs on write | #272 is a stored click-through script-injection vector; it should be closed before glossary usage expands further | #272 |
| 5 | Add taxonomy delete safety for in-use principle types | #266 is the main post-merge integrity gap from the shipped principle-set work and should be fixed before admins manage principle vocabularies more aggressively | #266 |

## Product Manager Notes

- Treat #269 as the main product decision item, not just a bug. The team needs to choose between global unique identity and org-qualified sign-in, then make schema, login UX, and docs agree.
- Treat #270 and #272 as trust-and-safety fixes for the glossary slice. The glossary is now shared reference content, so visibility and outbound-link hygiene need to be explicit.
- Treat #271 as the cleanest platform-hardening task: patch, refresh lockfile, and run build/lint plus targeted auth and server-action regression checks.
- Treat #266 as the principal non-security follow-up. Blocking deletion for in-use taxonomy terms is safer than silently clearing or rewriting principle types.
- Keep #273 close behind the top five. Markdown display shipped, but better authoring should wait until the current security and integrity work is closed.
- If #258 was verified through PR #257, close it as fixed so open bugs reflect current reality.

## Documentation Follow-up

This grooming pass also keeps public docs aligned with current repo state:

- `docs/product-priorities.md`: replaces the stale PR-#265 review framing with the post-#268 security and integrity shortlist.
- `README.md`: treats taxonomy-backed principle sets and markdown-rendered detail pages as shipped, and updates active work to the new hardening priorities.
- `capabilities.md`: marks principles as taxonomy-backed and content display as markdown-rendered so the product summary matches the merged implementation.
- `docs/data-model.md`: documents that `principles.principle_type` is taxonomy-backed text and therefore depends on application-level integrity checks.
