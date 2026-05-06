# Product Priority Shortlist

Last groomed: 2026-05-06

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

Recent merges materially changed the product surface:

- PR #312 shipped the first instance-level platform configuration surface, turning `/instance` into a real operating console rather than only an audit/provisioning shell.
- PR #314 and PR #316 shipped the Executive Summary and Heatmap Analysis reports, giving GovEA stronger stakeholder-facing reporting on top of the existing repository.
- PR #357 shipped application and capability impact analysis, moving traceability from passive navigation toward real decision support.
- PR #356 shipped application custom fields plus CSV import/export, reducing one of the biggest practical barriers to getting real portfolio data into the product.
- PR #376 shipped a Mermaid-based diagram view on the capability map page, broadening how users can understand repository relationships without changing the underlying model.
- PR #387 shipped a Goals layer above Strategic Objectives, correcting an important planning-model blur before more reporting and roadmap behavior compounds it.
- PR #393 shipped the capabilities pilot for the shared taxonomy/base-item direction, proving cross-entity reuse beyond the earlier application-only slice.
- PR #370 and the recent persona documentation passes strengthened the roadmap definition for integration and real government-practice fit, even where product implementation has not started yet.

What this means for prioritization:

- GovEA has now shipped most of the shortlist that was current at the end of April. The next best work is no longer "add the first report" or "define the instance surface" because those slices now exist.
- The highest-leverage gap has shifted from feature presence to repository trust: completeness, confidence, decision traceability, and data freshness.
- The repo also now has enough stakeholder-facing surface area that weak data quality or weak persona validation will be more damaging than another isolated demo-friendly page.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) / PR |
|---|---|---|---|
| 1 | Ship repository completeness drill-downs and a plain-language confidence summary | Reporting, heatmaps, impact views, and executive summaries now depend on users trusting the underlying repository. GovEA has early coverage signals, but not yet the fuller completeness workflow or stakeholder-facing confidence cues described in the repository-modelling capability docs. | `rm-repository-completeness`, `fd-repository-confidence-summary`, PR #357, PR #316, PR #314 |
| 2 | Add architecture debt tracking and make ADRs a stronger decision-support surface | Impact analysis now surfaces consequences, but GovEA still lacks a first-class way to record persistent constraints, debt, and tradeoff accumulation. That leaves a gap between "what is affected" and "what should leadership worry about next." | `rm-architecture-debt`, `po-architecture-decisions`, PR #357 |
| 3 | Start the operational integration foundation: REST API plus the first Tier 1 sync slice | Custom fields and CSV import/export help initial data load, but they do not solve staleness. The integration roadmap is now better defined, and the next meaningful trust move is to reduce manual reconciliation with operational systems. | `int-rest-api`, `integration/`, PR #356, PR #370 |
| 4 | Extend the shared item/taxonomy foundation beyond the current applications-and-capabilities pilots | GovEA now has proof that shared taxonomy assignment works across more than one entity, but the rollout is still too narrow. The next platform move is to keep future classification and metadata work from turning into bespoke per-entity wiring again. | #383, PR #393, `docs/design/base-item-foundation.md` |
| 5 | Validate assumed personas and start a lightweight product feedback loop for the new analysis surfaces | Repository modelling and integration are still driven by assumed personas in several capability files. With executive reporting, impact analysis, and map views now shipped, the cost of building the wrong next analytic feature has gone up. Validate before compounding. | Persona docs, `docs/research/`, issue #103, PR #314, PR #357, PR #376 |

## Product Manager Notes

- The old shortlist is materially stale: platform configuration, executive reporting, heatmaps, and impact analysis are already shipped in `main`.
- The new priority stack is intentionally trust-heavy. GovEA has crossed the point where more views are less valuable than better confidence in what those views are saying.
- The most pragmatic sequence is: repository confidence -> debt/decision capture -> integration freshness. That is the shortest path from "useful demo" to "credible working repository."
- Treat the shared item/taxonomy foundation as a platform multiplier, not a side quest. Recent custom-field work and the new capabilities pilot proved the demand; the next step is making reuse systematic across more entities.
- Keep persona validation attached to these roadmap items, especially for repository-modelling and integration, where several capabilities still explicitly carry assumed-persona risk.

## Documentation Follow-up

This grooming pass also updates product docs to match current repo reality:

- `docs/product-priorities.md`: replaced the stale late-April shortlist with a post-PR-#376 sequence based on what is actually shipped in `main`.
- `README.md`: updated active work and near-term priorities so they stop pointing at already-completed items.
- `capabilities.md`: refreshed the target-surface table so near-term priorities reflect the current product baseline.
- `business-architecture/capabilities/ea/repository-modelling/repository-modelling.md`: end-to-end traceability now reads as partially implemented rather than absent.
- `business-architecture/capabilities/ea/repository-modelling/rm-end-to-end-traceability.md`: implementation status now acknowledges the shipped application/capability impact analysis slice while preserving the remaining roadmap.
