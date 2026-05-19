# Persona Journey — Department Director

**Persona file:** [`business-architecture/personas/department-director.md`](../../business-architecture/personas/department-director.md)
**Capability anchors:** [`frontend-display`](../../business-architecture/capabilities/cms/frontend-display/) group, plus `planning-strategic-objectives` and `planning-initiatives`.
**Walk audited:** 2026-05-19 — seventh persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #557](https://github.com/roballred/GovEA/issues/557))
**Persona validation status:** Assumed (not yet validated with real department heads or deputy directors).

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `victor@govea.dev` (Viewer role — the closest read-only proxy for the persona, which has no specific RBAC role distinct from the broader `cms-viewer` family).

This walk deliberately focuses on the **power-reader / decision-maker** dimensions the prior two viewer walks ([#546](https://github.com/roballred/GovEA/issues/546), [#552](https://github.com/roballred/GovEA/issues/552)) didn't exercise: strategic alignment tracking, initiative status, capability-map visualisation, filter-by-domain, and presentation-readiness.

## Canonical journey

1. Sign in as a Viewer.
2. Open Strategic Objectives — see the list with status / time horizon.
3. Open an Objective detail — see linked capabilities, initiatives, alignment.
4. Open Initiatives — see what's underway, completed, on hold.
5. Open an Initiative detail — see what capabilities and applications it affects.
6. Open a Capability map view.
7. Try filtering content by department / domain.
8. Look for presentation / print export affordances on the persona's primary surfaces.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in | **Works (with friction)** | Same admin-dashboard landing as the prior viewer walks. Covered by [#548](https://github.com/roballred/GovEA/issues/548) in epic [#556](https://github.com/roballred/GovEA/issues/556). |
| 2 | Strategic Objectives list | **Works** | Two objectives visible, linked to Goals + Capabilities + Time Horizon ("FY2026"). No edit affordances. Status / category filters present. |
| 3 | **Objective detail** | **BLOCKED — server crash** | Opening any objective detail page (e.g., `/objectives/cd8652c8-...`) returns "Application error: a server-side exception has occurred." Root cause is **Postgres's 63-character identifier limit** colliding with Drizzle's auto-generated query aliases for the deeply nested `strategicObjectives → objectiveCapabilities → capability → applicationCapabilities → application` chain. Gap [#558](https://github.com/roballred/GovEA/issues/558). Reproduces for any role; not viewer-specific. |
| 4 | Initiatives list | **Works** | Two initiatives visible with status / dates / linked capabilities / linked objectives. "Q1 FY2026 → Q4 FY2026" time-window format is plain-language and useful. |
| 5 | Initiative detail | **Works** | Capabilities, Strategic Objectives, Applications all render. Plain-language status, "Created · Updated" date present. No edit affordances. |
| 6 | Capability map | **Works** | `/capabilities/[id]/map` renders a graph visualisation (6 SVGs) showing capability ↔ objective / application / persona relationships. Plain-language layout. Useful for the persona's presentation needs once print-readiness lands. |
| 7 | Filter by domain (Applications) | **Works (for current scope)** | `/applications` exposes filters for Lifecycle Status / Status / Domain / Hosting Model / Application Type. Domain values match GovEA's `domain` taxonomy ("Community Development", "Finance & Revenue", etc.). For single-org installs this matches the persona's "department" mental model; for multi-agency state installs, "Department" may need to be a separate dimension from "Domain" — flagging as a persona-validation question rather than a gap. **Side-finding:** The "Application Type" filter shows "Core Business System" 8 times due to duplicate `taxonomy_terms` rows — same root cause as [#554](https://github.com/roballred/GovEA/issues/554). |
| 8 | Print / presentation export | **Missing** | `/executive`, `/roadmap`, `/answers`, traceability views all render fine on screen but include the full app shell (sidebar, header, role badge, sign-out) when printed or screenshotted. Several capability docs explicitly call for "printable or presentation-friendly layout" but none of the relevant pages currently provide it. Gap [#559](https://github.com/roballred/GovEA/issues/559). |

**Tally:** 4 works · 1 works-with-friction · 1 blocked (server crash) · 1 missing · 1 partial-with-validation-question.

## Findings

### Gaps filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#558](https://github.com/roballred/GovEA/issues/558) | **High (bug)** | Objective detail page crashes for any user. Postgres 63-char identifier limit colliding with Drizzle's nested `with` clause alias generation. Affects every persona that reads strategic alignment. |
| [#559](https://github.com/roballred/GovEA/issues/559) | Medium (differentiator) | No print / presentation export on roadmap, executive summary, traceability, guided-answer views. Documented in three capability files; not implemented. |

### Existing gaps that apply equally

| Existing | Coverage |
|---|---|
| [#556](https://github.com/roballred/GovEA/issues/556) (epic) | The full Viewer Experience workstream applies to this persona as well — sign-in landing, freshness signals, public access, etc. |
| [#554](https://github.com/roballred/GovEA/issues/554) | Duplicate `taxonomy_terms` rows surface here too — "Core Business System" rendered 8 times in the Application Type filter. Same root cause as the persona-page tag-duplication. |

### Strong positives worth preserving

- **Strategic Objectives → Initiative → Application chain is the right mental model for this persona.** When (#558) lands and the chain works end-to-end, this is exactly what "see how current investments connect to stated strategic objectives" looks like in product form.
- **Capability map view** (`/capabilities/[id]/map`) is genuinely useful for the persona — visual, plain-language, links every related entity in one place. With print-readiness ([#559](https://github.com/roballred/GovEA/issues/559)) it becomes a credible budget-hearing handout.
- **Initiative detail page** is operationally credible — shows capabilities affected, applications being built/retired, strategic objective served, and time window. The whole "what is this project doing for us?" question answers cleanly.
- **Filter density on `/applications`** is genuinely useful for power-readers: 5 distinct filter dimensions, all server-side, all URL-backed. The Department-Director persona's stated pain point #2 is "information scattered across tools, spreadsheets, and documents that are never current" — these filters meaningfully address that for the portfolio view.

### Persona-validation note

Persona is **Assumed**. The walk's findings are conservative (the server-crash and print-readiness gaps are persona-agnostic; they affect any reader). The bigger persona-validation questions ("would real department directors actually want to track strategic objective alignment via GovEA?", "is Domain or Department the right filter dimension at multi-agency scale?") need real interviews.

## Recommended follow-up

1. **Fix [#558](https://github.com/roballred/GovEA/issues/558) before the next persona walk that touches objectives.** It's a server crash, not a UX gap. The other paths to "strategic alignment" all flow through objective detail — `budget-performance-analyst` would hit this immediately.
2. **[#559](https://github.com/roballred/GovEA/issues/559) (print/export) belongs in the Viewer Experience epic [#556](https://github.com/roballred/GovEA/issues/556).** It serves the same set of personas. Worth pulling in.
3. **Next persona walk: [`budget-performance-analyst`](business-architecture/personas/budget-performance-analyst.md)** — same shape as Department Director (decision-maker who reads + asks questions) but with a stronger budget/risk lens. Will exercise the "where is operational or constituent-facing risk concentrated" question and likely expose more strategic-alignment edges once #558 is fixed.

## Cumulative tally so far

After seven walks: **9 / 16 personas remaining.** Six-issue Viewer Experience epic ([#556](https://github.com/roballred/GovEA/issues/556)) plus two new gaps from this walk ([#558](https://github.com/roballred/GovEA/issues/558), [#559](https://github.com/roballred/GovEA/issues/559)). The audit is now consistently producing a mix of **(a) one or two real bugs per walk** that code review missed and **(b) persona-specific feature gaps** the capability docs anticipated but the implementation hasn't reached.
