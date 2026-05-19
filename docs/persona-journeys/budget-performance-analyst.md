# Persona Journey — Budget & Performance Analyst

**Persona file:** [`business-architecture/personas/budget-performance-analyst.md`](../../business-architecture/personas/budget-performance-analyst.md)
**Capability anchors:** [`frontend-display`](../../business-architecture/capabilities/cms/frontend-display/) group — `fd-application-risk-portfolio`, `fd-executive-roadmap-timeline`, `fd-traceability-views`, `fd-guided-answer-views`, `fd-repository-confidence-summary`.
**Walk audited:** 2026-05-19 — eighth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #562](https://github.com/roballred/GovEA/issues/562))
**Persona validation status:** Assumed (not yet validated with real budget, finance, or performance staff).

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `victor@govea.dev`. This walk is the **budget/risk-lens companion** to the Department Director walk ([#557](https://github.com/roballred/GovEA/issues/557)) — same persona shape (read-only decision-maker who asks specific questions), sharper financial framing.

## Canonical journey

1. Sign in as a Viewer.
2. Open Application Portfolio view — assess risk cues and budget signals.
3. Open an Application detail page — assess "what does this cost / what's the risk?" surface.
4. Open Strategic Objectives → drill into an Objective detail — verify alignment to investments.
5. Open Initiatives — look for cost / investment data alongside status.
6. Open Roadmap — look for risk-vs-investment framing.
7. Use Guided Answers for budget-shaped questions ("which systems are being replaced?", "what is at risk?").
8. Look for presentation / print export.
9. Compare findings against existing gaps; only file what's net-new.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in | **Works (with friction)** | Same admin-dashboard landing — covered by [#548](https://github.com/roballred/GovEA/issues/548). |
| 2 | Application portfolio risk view | **Partial** | The Portfolio toggle on `/applications` shows lifecycle-based risk cards: "2 applications retiring while still supporting active capabilities — review or re-map before decommission." Useful for the persona's "where is risk concentrated?" question. **But no cost dimension** — risk is qualitative only. Application Type filter still has 18× duplicates of "Core Business System" / "Integration Platform" / "Internal Tool" — same root cause as [#554](https://github.com/roballred/GovEA/issues/554). |
| 3 | Application detail (OpenGov) | **Works (with gap)** | Shows lifecycle, hosting, capabilities, ADRs, Decommission Impact ("High Risk" — plain-language, useful), Orphaned Capabilities, Affected Personas. **No cost / contract value / license fee / TCO.** Gap [#563](https://github.com/roballred/GovEA/issues/563). |
| 4 | Strategic Objective detail | **Blocked (server crash)** | Same as Department Director walk: `/objectives/[id]` 500s. Fix in [PR #561](https://github.com/roballred/GovEA/pull/561) (closes [#558](https://github.com/roballred/GovEA/issues/558)). Persona-blocking for "see how investments connect to stated objectives." |
| 5 | Initiative detail | **Works (with gap)** | Capabilities, Strategic Objectives, Applications (with build/retire impact), Timeline. **No estimated investment / spend-to-date / funding source.** Persona's stated goal #2 ("understand how proposed investments connect to strategic objectives") is half-answered — the *connection* is shown, the *investment* is missing. Gap [#563](https://github.com/roballred/GovEA/issues/563). |
| 6 | Roadmap | **Works** | Timeline + Grid toggle, plain-language impact statements, linked capabilities + objectives, status badges (Underway / Complete). Strong surface for "what is changing." No risk-vs-investment framing, but that's a [#563](https://github.com/roballred/GovEA/issues/563) downstream consequence. |
| 7 | Guided Answer | **Works (with detour)** | Same path as prior walks — type a question, click "Get guided answer →" from `/search`. Output is briefing-ready. Detour through `/search` still applies ([#550](https://github.com/roballred/GovEA/issues/550)). |
| 8 | Print / presentation export | **Missing** | Same as Department Director walk — gap [#559](https://github.com/roballred/GovEA/issues/559) (now in epic [#556](https://github.com/roballred/GovEA/issues/556)). Critical for the persona's *"prepare plain-language budget or oversight materials without rebuilding the analysis in PowerPoint."* |

**Tally:** 3 works · 3 works-with-gap · 1 blocked · 1 missing.

## Findings

### Gap filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#563](https://github.com/roballred/GovEA/issues/563) | Medium (design / validation-gated) | No financial dimensions on applications or initiatives. Persona-blocking for "where is the money going" / "what does this cost?" questions. Capability-design question, not a bug — lays out three options and recommends validating the persona before building. |

### Existing gaps that apply equally

Most of this walk's findings are already filed:

| Existing | Coverage |
|---|---|
| [#556](https://github.com/roballred/GovEA/issues/556) (epic) | Full Viewer Experience workstream applies to this persona too. |
| [#558](https://github.com/roballred/GovEA/issues/558) / [PR #561](https://github.com/roballred/GovEA/pull/561) | Objective detail crash. Persona-blocking; depends on the PR landing. |
| [#559](https://github.com/roballred/GovEA/issues/559) | Print / presentation export. Critical for this persona — they're explicitly preparing materials for leadership. |
| [#554](https://github.com/roballred/GovEA/issues/554) | Duplicate `taxonomy_terms` rows. Surfaces here in the Application Type filter (18× "Core Business System" / "Integration Platform" / "Internal Tool"). |
| [#538](https://github.com/roballred/GovEA/issues/538) | Capability duplication detection. Persona's goal #1 includes "duplicated" — current build has no duplication detection. |

### What works very well

- **Application portfolio's plain-language risk cards** are exactly the right shape for this persona. "2 applications retiring while still supporting active capabilities — review or re-map before decommission" is the kind of sentence a budget book wants verbatim.
- **"Decommission Impact: High Risk"** + **"Orphaned Capabilities (1)"** on the application detail page are useful budget signals — they translate technical lifecycle state into operational/budget consequence without requiring an architect to interpret.
- **Initiative detail with explicit build/retire labels** ("Accela: build", "Legacy Permitting System: retire") is the kind of clarity the persona's pain point #4 ("IT can describe systems, but not always the service or objective each system supports") asks for.

### Persona-validation note

The financial-dimension finding ([#563](https://github.com/roballred/GovEA/issues/563)) is **validation-gated**. The persona-as-written wants cost context; whether real state/local government budget analysts would actually want GovEA to be the source of cost data (vs. their existing ERP / finance system) is unknown. [#563](https://github.com/roballred/GovEA/issues/563) lays out three options including "defer until validated" — that's the recommended first step before building schema extensions.

The non-financial gaps surfaced here are all already filed and don't depend on persona validation outcomes — they affect read-only stakeholders broadly.

## Recommended follow-up

1. **[PR #561](https://github.com/roballred/GovEA/pull/561) is the critical-path landing for this persona.** Without it, the entire "investment ↔ objective alignment" question is unanswerable. Recommend merging before any further reader-side walks.
2. **[#563](https://github.com/roballred/GovEA/issues/563) (financial dimensions) is the only net-new finding from this walk.** Mark as validation-gated; don't build until the persona is interviewed.
3. **Cumulative state after eight walks:**
   - **8 / 16 personas remaining** — halfway through the epic.
   - Pattern is now consistent: each walk surfaces 1–2 net-new gaps + confirms several from the cumulative pile.
   - **Viewer Experience epic ([#556](https://github.com/roballred/GovEA/issues/556)) now has 7 member issues** if [#559](https://github.com/roballred/GovEA/issues/559) was added. It's the right unit of work for the next Phase 1 sprint.
4. **Next persona walk: [`junior-ea-analyst`](business-architecture/personas/junior-ea-analyst.md)** — meaningfully different shape (entry-level *author* persona, not a reader). Will exercise the authoring surfaces that all the reader walks have skipped: capability creation, persona authoring, ADR drafting. Expected to surface a different gap profile entirely.
