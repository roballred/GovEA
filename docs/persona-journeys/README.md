# Persona Journey Audit — Summary

**Epic:** [#515](https://github.com/roballred/GovEA/issues/515) (Phase 0.5)
**Status:** Complete — all 16 personas walked, 2026-04 to 2026-05.
**Method:** Live browser walks on a fresh dev seed; one canonical end-to-end journey per persona; every gap surfaced filed as its own labelled issue with reproducer, capability anchor, and journey label.

## How to read this

Each report under `docs/persona-journeys/<persona-id>.md` is self-contained: canonical journey, step-by-step outcomes table, gap issues filed, existing gaps cross-referenced, strong positives, persona-validation note. This README is the cross-cutting index — gaps per persona, gaps per capability, the audit's adoption-leverage ranking, and the strongest shipped features the audit confirmed.

Sub-issue closure pattern: each walk's sub-issue closes when the journey doc is written and gaps are filed — **not** when gaps are fixed. Fixing is downstream work; the audit's deliverable is naming the gaps honestly.

## The 16 walks

| # | Persona | Sub-issue | New gaps filed | New gaps now fixed |
|---|---|---|---|---|
| 1 | [Instance Administrator](instance-administrator.md) | [#519](https://github.com/roballred/GovEA/issues/519) | 3 (#520, #521, #522, #523) | All 4 (#520, #521, #522, #523) |
| 2 | [CMS Administrator](cms-administrator.md) | [#526](https://github.com/roballred/GovEA/issues/526) | 5 (#527, #528, #529, #530, #531) + ADR [#591](https://github.com/roballred/GovEA/issues/591) | 1 (#591 docs/ADR landed) |
| 3 | [Enterprise Architect](enterprise-architect.md) | [#535](https://github.com/roballred/GovEA/issues/535) | 3 (#536, #537, #538) | 1 (#536) |
| 4 | [Agency EA Coordinator](agency-ea-coordinator.md) | [#541](https://github.com/roballred/GovEA/issues/541) | 2 (#542, #543) | 0 |
| 5 | [Elected Official](elected-official.md) | [#546](https://github.com/roballred/GovEA/issues/546) | 5 (#547, #548, #549, #550, #556) | 0 |
| 6 | [Content Viewer (CMS Viewer)](cms-viewer.md) | [#552](https://github.com/roballred/GovEA/issues/552) | 2 (#553, #554) | 0 |
| 7 | [Department Director](department-director.md) | [#557](https://github.com/roballred/GovEA/issues/557) | 2 (#558, #559) | 1 (#558 via PR [#561](https://github.com/roballred/GovEA/pull/561)) |
| 8 | [Budget & Performance Analyst](budget-performance-analyst.md) | [#562](https://github.com/roballred/GovEA/issues/562) | 1 (#563) | 0 |
| 9 | [Junior EA Analyst](junior-ea-analyst.md) | [#565](https://github.com/roballred/GovEA/issues/565) | 2 (#566, #567) | 0 |
| 10 | [Data Modeler](data-modeler.md) | [#569](https://github.com/roballred/GovEA/issues/569) | 1 (#570) | 0 |
| 11 | [Enterprise Data Architect](enterprise-data-architect.md) | [#572](https://github.com/roballred/GovEA/issues/572) | 1 (#573) | 0 |
| 12 | [Programme Director](programme-director.md) | [#577](https://github.com/roballred/GovEA/issues/577) | 1 (#578) | 0 |
| 13 | [Domain Architect](domain-architect.md) | [#580](https://github.com/roballred/GovEA/issues/580) | 2 (#581, #582) | 1 (#582 via PR [#585](https://github.com/roballred/GovEA/pull/585)) |
| 14 | [Early-Maturity Practice Lead](early-maturity-practice-lead.md) | [#586](https://github.com/roballred/GovEA/issues/586) | 2 (#587, #588) | 1 (#588 via PR [#594](https://github.com/roballred/GovEA/pull/594)) |
| 15 | [Consultant / SI](consultant-si.md) | [#595](https://github.com/roballred/GovEA/issues/595) | 2 (#596, #597) | 0 |
| 16 | [Business Stakeholder](business-stakeholder.md) | [#599](https://github.com/roballred/GovEA/issues/599) | 1 (#600) | 0 |

**Totals:** 16 walks · ~35 gap issues filed across the audit · 9 gaps closed during the audit (audit-as-quality-check loop) · ~26 open gaps remaining.

## Audit-as-quality-check loop

The walks did not only document gaps — they surfaced and fixed bugs that the prior issue stack had not.

| PR | Closes | Surfaced by |
|---|---|---|
| [#561](https://github.com/roballred/GovEA/pull/561) | #558 — Postgres identifier-length crash on `/objectives/[id]` | Department Director walk; validated by Programme Director walk |
| [#576](https://github.com/roballred/GovEA/pull/576) | #575 — Capability docs lagged shipped reality | Cumulative observation across walks |
| [#585](https://github.com/roballred/GovEA/pull/585) | #582 — TOGAF Architecture Domain not seeded → Application Landscape report rendered empty | Domain Architect walk |
| [#594](https://github.com/roballred/GovEA/pull/594) | #588 — Tour step element/title misalignment; "capabilityies" pluralization typo | Early-Maturity Practice Lead walk |

This pattern is the audit's strongest deliverable beyond the gap index: a walk found a structural bug, the next walk validated the fix.

## Gaps grouped by capability anchor

| Capability | Open gaps surfaced by audit |
|---|---|
| `fd-traceability-views` | [#549](https://github.com/roballred/GovEA/issues/549) (top-level entry), [#578](https://github.com/roballred/GovEA/issues/578) (dependency-impact view), [#600](https://github.com/roballred/GovEA/issues/600) (cross-initiative conflict view) |
| `fd-guided-answer-views` | [#550](https://github.com/roballred/GovEA/issues/550) (input on `/answers`, "Capabilitys" typo) |
| `fd-portfolio-views` | [#559](https://github.com/roballred/GovEA/issues/559) (print/export), [#563](https://github.com/roballred/GovEA/issues/563) (financial dimensions on apps/initiatives) |
| `fd-relationship-navigation` | [#600](https://github.com/roballred/GovEA/issues/600) (initiative-anchored conflict view) |
| `fd-repository-confidence-summary` | (shipped; no audit gaps) |
| `rm-repository-completeness` | [#553](https://github.com/roballred/GovEA/issues/553) (publish/last-updated dates) |
| `rm-architecture-debt` | (shipped; no audit gaps — see PR [#576](https://github.com/roballred/GovEA/pull/576) status update) |
| `rm-end-to-end-traceability` | [#578](https://github.com/roballred/GovEA/issues/578), [#600](https://github.com/roballred/GovEA/issues/600) |
| `ac-feature-management` | [#581](https://github.com/roballred/GovEA/issues/581) (domain-scoped contribution + change notifications) |
| `ac-security-settings` | [#527](https://github.com/roballred/GovEA/issues/527) (UI implementation), [#530](https://github.com/roballred/GovEA/issues/530) (SSO reconciliation) |
| `ac-email-configuration` | [#528](https://github.com/roballred/GovEA/issues/528) (UI implementation) |
| `ac-backup-export` | [#529](https://github.com/roballred/GovEA/issues/529) (operational backup+export+import), [#596](https://github.com/roballred/GovEA/issues/596) (per-entity CSV) |
| `ac-audit-trail` | [#531](https://github.com/roballred/GovEA/issues/531) (org-scope filter UI), [#597](https://github.com/roballred/GovEA/issues/597) (contributor-readable audit) |
| `mo-content-visibility` | (shipped; no audit gaps surfaced) |
| `mo-cross-org-linking` | [#542](https://github.com/roballred/GovEA/issues/542) (system org in dropdown), [#543](https://github.com/roballred/GovEA/issues/543) (reverse-direction seed links), [#537](https://github.com/roballred/GovEA/issues/537), [#538](https://github.com/roballred/GovEA/issues/538) (enterprise-view aggregation) |
| `mo-content-workflow` | [#554](https://github.com/roballred/GovEA/issues/554) (taxonomy duplicates) |
| `pl-initiatives` | [#600](https://github.com/roballred/GovEA/issues/600) (cross-initiative conflict view) |
| Authoring (junction surfaces) | [#566](https://github.com/roballred/GovEA/issues/566) (duplicate-name warning), [#567](https://github.com/roballred/GovEA/issues/567) (unsaved-changes warning) |
| Public-facing | [#547](https://github.com/roballred/GovEA/issues/547) (unauthenticated read), [#548](https://github.com/roballred/GovEA/issues/548) (role-tailored landing), [#556](https://github.com/roballred/GovEA/issues/556) (Viewer experience epic) |
| Data Architecture | [#570](https://github.com/roballred/GovEA/issues/570) (Data Vault naming), [#573](https://github.com/roballred/GovEA/issues/573) (model-quality signals) |
| Candidate-new capabilities | starter-content + first-time-experience ([#587](https://github.com/roballred/GovEA/issues/587)) |

## Adoption-leverage ranking (audit author's view)

Highest-leverage gaps for unlocking adoption, ordered by *number of personas the gap serves × how cleanly the persona files say "this is what I need."*

1. **[#578](https://github.com/roballred/GovEA/issues/578) — Self-service dependency-impact view.** Programme Director + Business Stakeholder + Department Director + Domain Architect + Budget Analyst all need this. The persona files spell out the canonical question (*"what breaks if I decommission Y?"*). Highest single point of leverage in the audit.
2. **[#596](https://github.com/roballred/GovEA/issues/596) — Per-entity CSV import/export.** Consultant + Early-Maturity Practice Lead + Agency EA Coordinator + Enterprise Architect all benefit. The Applications-only pattern is proven and incrementally shippable.
3. **[#556](https://github.com/roballred/GovEA/issues/556) — Viewer/Contributor experience epic.** Elected Official + Content Viewer + Business Stakeholder + Programme Director all live in the Viewer/Contributor experience. A class of work, not a single feature.
4. **[#587](https://github.com/roballred/GovEA/issues/587) — Starter content + first-time experience.** Early-Maturity Practice Lead + Consultant + Agency EA Coordinator. Persona-foundational for the adoption-driver segment.
5. **[#581](https://github.com/roballred/GovEA/issues/581) — Domain-scoped contribution + change notifications.** Domain Architect + Agency EA Coordinator + Consultant. Establishes a class of capability the build doesn't yet have (event substrate).
6. **[#528](https://github.com/roballred/GovEA/issues/528) — Email configuration.** Precondition for change-notifications; CMS Admin walk's most pragmatic ask.
7. **[#600](https://github.com/roballred/GovEA/issues/600) — Cross-initiative overlap / conflict view.** Pairs with [#578](https://github.com/roballred/GovEA/issues/578) for the operational delivery lens.
8. **[#597](https://github.com/roballred/GovEA/issues/597) — Contributor-readable audit log.** Smaller scope; reuses the existing `/audit` surface; reads as a quick win.

## Strongest shipped features the audit confirmed

Worth naming explicitly — these are features whose persona-fit became clearer as the audit progressed.

- **Guided Answer (`/answers?q=…`)** — *"the audit's most persona-foundational shipped feature"* (Business Stakeholder walk). Multi-area plain-language results with "Why relevant" framing. Serves every non-author persona well.
- **Repository Confidence settings** ([`fd-repository-confidence-summary`](../../business-architecture/capabilities/cms/frontend-display/fd-repository-confidence-summary.md)) — "Suppress when published content falls below %" + admin narrative + opt-in unauthenticated visibility. *Exactly* the affordance the Early-Maturity Practice Lead persona file calls for in its critical insight.
- **Architecture debt** ([`rm-architecture-debt`](../../business-architecture/capabilities/ea/repository-modelling/rm-architecture-debt.md)) — the most capable authoring surface in the build; `security_sensitive` auto-flag, multi-object linking, severity + type taxonomy. Serves Enterprise Architect, Domain Architect, Agency EA Coordinator.
- **ADR category filter** (Architecture / Data / Process / Security / Technology) — perfect fit for Domain Architect; under-named in the docs.
- **Architecture Vision report** + **Executive Summary** — leadership-presentation surfaces with honest caveat language. Serve Department Director, Programme Director, Elected Official, Early-Maturity Practice Lead.
- **Product Tour** (13 steps, role-aware, plain-language, dashboard-first) — addresses the blank-canvas pain across multiple personas; would be even stronger with auto-fire on first sign-in (covered by [#587](https://github.com/roballred/GovEA/issues/587)).
- **Roadmap** (plain-language tagline; Timeline/Grid toggle; relationship labels `improve`/`build`/`retire`) — strong stakeholder surface; persistent unmet ask is per-programme scope filter ([#549](https://github.com/roballred/GovEA/issues/549)).

## What the audit did *not* test

- **Real-user task completion times.** Every persona is `Assumed`. The audit tested whether each persona's *stated capabilities* are surfaceable, not whether real people from those roles would *adopt* the tool.
- **Scale.** Walks ran on the Riverdale seed (small org). Performance and information-density behaviour at 500+ applications / 300+ capabilities is exercised by the seed dataset but not walked through the lens of any persona.
- **Federation across the full N-org case.** Cross-org links were exercised between Riverdale + Office of Digital Services. Larger federation patterns (3+ orgs, shared capability hierarchies) were not walked.
- **Mobile.** All walks used a desktop viewport.
- **Accessibility.** No screen-reader or keyboard-only walks. Distinct from the persona-need question; worth a separate audit.

## Next steps

1. The two highest-leverage gaps — [#578](https://github.com/roballred/GovEA/issues/578) and [#596](https://github.com/roballred/GovEA/issues/596) — are also two of the largest-scope. Picking one as the next strategic backlog item closes one of the strongest persona-fit gaps in the audit.
2. The quick wins — [#582](https://github.com/roballred/GovEA/issues/582) (closed by PR [#585](https://github.com/roballred/GovEA/pull/585)), [#588](https://github.com/roballred/GovEA/issues/588) (closed by PR [#594](https://github.com/roballred/GovEA/pull/594)), [#600](https://github.com/roballred/GovEA/issues/600), [#597](https://github.com/roballred/GovEA/issues/597) — are each small, contained, and ship as standalone PRs.
3. **Validate the personas.** Five personas walked produced gap patterns sharp enough that the *assumed* designation feels conservative — Enterprise Architect, Domain Architect, Programme Director, Business Stakeholder, Early-Maturity Practice Lead. Each is a natural candidate for the first round of validation interviews.

---

*The audit's deliverable is naming the gaps honestly. Fixing them is the next chapter.*
