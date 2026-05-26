# Backlog Milestone Triage &mdash; 2026-05-26

Triage of the 14 open issues that carried no milestone as of 2026-05-26. Recorded here so future grooming can see what was assigned, why, and whether each assignment was contested.

The largest bucket on the board entering this triage was **no milestone (14)**, larger than v0.9 (5), v1.0 (3), v1.5 (3), or v2.0 (8). Triage moves those 14 into milestones based on each issue&apos;s track, persona-validation dependency, and fit with the milestone&apos;s stated definition of done.

Milestone definitions are the source of truth (visible via `gh api repos/roballred/GovEA/milestones`). They are summarised below for triage context only; if they drift, the milestone descriptions on GitHub govern.

---

## Milestone shapes (summary)

| Milestone | Theme | Definition of done (paraphrased) |
|---|---|---|
| **v0.9** | Foundation Cleanup | Pay down debt before declaring v1. Docs match reality. ARB findings resolved or closed. Visual regression on 3 critical paths. Reproducible local bootstrap. **NOT in scope: new feature work.** |
| **v1.0** | Practice-Ready | One Agency EA Coordinator or Enterprise Architect can install, populate, and use GovEA for real work without workarounds. Self-host install guide. Repository CRUD complete. Reports usable. Data export so users trust it. Phase 1 feedback log collecting signal. |
| **v1.5** | Adoption-Validated | GovEA has been used by real practitioners. Persona docs validated. In-product feedback widget. Analysis surfaces operationalized. Adoption & Engagement capability area instrumented. |
| **v2.0** | Platform & Integration | Multi-tenant platform with external systems of record. REST API + Tier 1 sync. ADR + debt in product. Change notifications. TOGAF redesign decision applied. |

---

## Triage decisions

### → v0.9 (Foundation Cleanup)

| Issue | Title (short) | Why v0.9 |
|---|---|---|
| [#482](https://github.com/roballred/GovEA/issues/482) | `docs(process): add docs/AI-SESSION-START.md` | v0.9 explicit goal: &ldquo;docs match reality.&rdquo; The session-bootstrap blob references this file but it doesn&apos;t exist on disk &mdash; every AI session since the reference was added has flown without it. Pure documentation; one PR. |

### → v1.0 (Practice-Ready)

| Issue | Title (short) | Why v1.0 |
|---|---|---|
| [#479](https://github.com/roballred/GovEA/issues/479) | `feat(nav): collapsible groups in the admin sidebar` | Sidebar density blocks new-user comprehension &mdash; a Practice-Ready UX polish. Single PR; persona-friendly to Junior EA / Domain Architect. |
| [#456](https://github.com/roballred/GovEA/issues/456) | `feat(admin): org-wide and instance-wide admin notices` | CMS Administrator persona. Standard admin-console capability for a real EA practice. |
| [#529](https://github.com/roballred/GovEA/issues/529) | `feat(admin): operational Backup & Export` | Pairs with #86 (Data Export). v1.0 def-of-done explicitly names &ldquo;data export so users trust putting their data in&rdquo;; #529 is the operational complement (full backup/restore). |
| [#518](https://github.com/roballred/GovEA/issues/518) | `chore(seed): GovEA Project sample data as continuous documentation` | Recurring habit work; bound it to v1.0 so the dogfood story is fresh for first install. After v1.0 closes, re-open as a v1.5 issue. |

### → v1.5 (Adoption-Validated)

These are the persona-validation-sensitive items the validation plan ([`docs/research/validation-plan.md`](./research/validation-plan.md)) explicitly gates on Tier-1 interviews from #384.

| Issue | Title (short) | Gate |
|---|---|---|
| [#547](https://github.com/roballred/GovEA/issues/547) | `feat(public): public-read access for non-authenticated stakeholders` | Elected Official interview (GA-1 staff-proxy hypothesis) per validation plan Tier 1 |
| [#573](https://github.com/roballred/GovEA/issues/573) | `feat(data-arch): model-quality signals and scorecard summary` | Data Architect / SME corroboration per validation plan Tier 2; needs #363 conversation first |
| [#563](https://github.com/roballred/GovEA/issues/563) | `feat(budget): financial dimensions on apps and initiatives` | Budget Analyst interview (GA-3, RT-4) per validation plan Tier 1 |
| [#556](https://github.com/roballred/GovEA/issues/556) | `epic(viewer-experience)` | 6 of 7 sub-issues closed; closes with #547. Same milestone as its only remaining child. |
| [#499](https://github.com/roballred/GovEA/issues/499) | `Add inherited system glossary for core GovEA concepts` | Adoption-flavored stakeholder work; helps non-EA staff parse the product&apos;s vocabulary. Sequencing depends on what comes out of stakeholder interviews; pairing with v1.5 keeps that link visible. |
| [#55](https://github.com/roballred/GovEA/issues/55) | `feat: data capabilities and data management domain` | Taxonomy expansion for the Data & Analytics capability domain. Distinct from the shipped Data Architecture module (entities/attributes/keys) &mdash; this adds the capability-side domain seeding. Adoption-relevant for orgs that already run data programs; sequence after first pilots. |

### → v2.0 (Platform & Integration)

| Issue | Title (short) | Why v2.0 |
|---|---|---|
| [#409](https://github.com/roballred/GovEA/issues/409) | `feat(capabilities): model Success Criteria as first-class product data` | Data-model expansion adding a new entity type. v1.0 def-of-done explicitly limits new entity types; v1.5 is validation-focused. v2.0 is the right horizon. |
| [#363](https://github.com/roballred/GovEA/issues/363) | `Data Architecture Metamodel` | Design conversation that gates broader DA expansion. v1.5 is &ldquo;validate what exists&rdquo;; further DA modelling is v2.0-shaped work after the metamodel discussion lands. |
| [#351](https://github.com/roballred/GovEA/issues/351) | `feat: add Reference Architecture Capability and Relationships` | TOGAF-adjacent capability expansion that pairs with v2.0&apos;s `#313 TOGAF taxonomy redesign decision`. Reference architectures are a building-block concept whose shape depends on the TOGAF redesign outcome. |

---

## Contested calls (would benefit from human override)

- **#518 dogfood &rarr; v1.0 vs. recurring habit.** Assigning it to v1.0 bounds the work; the dogfood story compounds across milestones, so a recurring designation might be more honest. Compromise: keep in v1.0 for now and re-open as a v1.5 issue when v1.0 closes.
- **#499 inherited glossary &rarr; v1.5 vs v1.0.** Could be v1.0 (basic glossary surface) or v1.5 (validated vocabulary). Picked v1.5 because the inherited / source-of-truth pattern is adoption-shaped, not install-shaped.
- **#55 data capabilities domain &rarr; v1.5 vs v2.0.** Capability-domain taxonomy expansion could land either as adoption seeding (v1.5) or as platform expansion (v2.0). Picked v1.5 because it&apos;s seed-data shaped, not data-model shaped.

---

## What this triage does not do

- **Does not modify milestone definitions.** Several milestone descriptions reference closed issues in their scope lists (e.g. v1.0 lists `#7, #49, #366, #380` which are all closed). Refreshing milestone descriptions is separate grooming work.
- **Does not re-prioritise within milestones.** Order of attack inside v0.9, v1.0, etc. is the priorities-doc&apos;s job.
- **Does not change scope.** Each issue keeps its current title, body, labels &mdash; only the milestone field changes.

---

## After this triage

| Milestone | Open before | Open after |
|---|---|---|
| v0.9 | 5 | 6 |
| v1.0 | 3 | 7 |
| v1.5 | 3 | 9 |
| v2.0 | 8 | 11 |
| No milestone | **14** | **0** |

Every open issue now sits in a milestone. The next planning cycle can read the milestone counts as ground truth.
