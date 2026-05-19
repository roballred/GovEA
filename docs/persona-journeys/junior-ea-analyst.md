# Persona Journey — Junior EA Analyst

**Persona file:** [`business-architecture/personas/junior-ea-analyst.md`](../../business-architecture/personas/junior-ea-analyst.md)
**Capability anchors:** Candidate new — `cm-content-authoring`, `cm-content-workflow`; existing `iam-role-based-access-control`, `ac-feature-management`.
**Walk audited:** 2026-05-19 — ninth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #565](https://github.com/roballred/GovEA/issues/565))
**Persona validation status:** Assumed (not yet validated with real junior architects or EA analysts).

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `carol@govea.dev` (Riverdale Contributor — first walk using a non-Viewer role). This is the **first authoring-side audit** in the journey audit epic. The prior eight walks have all been reader/decision-maker personas; this walk shifts focus to the path of least resistance for someone *creating* and *editing* content.

## Canonical journey

1. Sign in as Contributor.
2. Open Capabilities; create a new capability.
3. Try to create a duplicate by re-using an existing name.
4. Submit the form empty to see required-field handling.
5. Edit an existing capability; cancel after making changes.
6. Open ADRs; inspect the create-form structure for guided-template affordances.
7. Confirm Delete affordances are hidden for Contributor.
8. Look for inline help / onboarding / Tour.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in (`carol@govea.dev`) | **Works** | Same admin-dashboard landing as Viewer walks. Coverage [#548](https://github.com/roballred/GovEA/issues/548). Greeting confirms Contributor identity. |
| 2 | `+ New Capability` opens form | **Works** | Modal with Name / Description / Domain / Capability Type / Parent / Behaviors / Rules / Personas (multi-select). Submit button labelled "Create capability". |
| 3 | Duplicate-name creation | **Works (no guard)** | **No app-level duplicate check** across any of the 7 content-create actions (verified via code grep on `apps/govea/src/actions/*.ts`). Compare to `users`, `orgs`, `connections`, `cross-org links` — all of those reject duplicates explicitly. Gap [#566](https://github.com/roballred/GovEA/issues/566). |
| 4 | Empty-form submit | **Partial** | HTML5 `required` on `name` only triggers the browser's native *"Please fill out this field"* tooltip. Every other field is optional even when an unfilled capability would obviously be incomplete. Gap [#567](https://github.com/roballred/GovEA/issues/567). |
| 5 | Edit → Cancel discards silently | **Works (no guard)** | Modifying any field then clicking Cancel discards the change with no "unsaved changes" confirmation. Gap [#567](https://github.com/roballred/GovEA/issues/567). |
| 6 | ADR create-form structure | **Works very well** | Form fields are **Number / Title / Context / Decision / Consequences / Capabilities** — the Context/Decision/Consequences triad is a genuine guided template, exactly matching the persona's "guided templates and starter patterns" relevant-capabilities entry. |
| 7 | Contributor RBAC enforcement | **Works very well** | Capabilities list, ADR list, and applications list all show only **View / Edit** in the row actions. No Delete affordance leaked for Contributor. Matches the persona's expectation that "Contributor role limits delete access." |
| 8 | Tour / onboarding | **Works** | A "Tour" button in the header opens a 13-step walkthrough. Plain-language framing ("Welcome to GovEA · GovEA is your organization's enterprise architecture workspace. This tour shows you where everything lives and how the pieces connect."). Addresses the persona's pain point #3 ("Onboarding documentation written for experienced architects") at least partially. |

**Tally:** 5 works · 2 works-very-well · 1 works-with-no-guard · 1 partial (HTML5 only). No outright blockers.

## Findings

### Gaps filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#566](https://github.com/roballred/GovEA/issues/566) | High (persona-foundational, pain point #6) | Zero of the 7 content-create actions check for duplicate names. Persona file calls this out by name. Suggested fix: soft-warn at name-blur with optional hard-block where the schema requires uniqueness. |
| [#567](https://github.com/roballred/GovEA/issues/567) | Medium (pain points #1, #4) | No unsaved-changes warning on Cancel; required-field validation is HTML5-native only with no inline guidance. Both reduce the "soft guardrails on authoring" surface the persona needs to self-validate. |

### Strong positives worth preserving

- **Contributor RBAC is faithfully enforced.** No Delete buttons leaked anywhere I exercised. Matches the persona file's expectation directly.
- **ADR form is a real guided template.** Context/Decision/Consequences as required-form sections is exactly the persona's "guided templates and starter patterns" need. Worth replicating for capability / application / persona authoring (capabilities have Behaviors / Rules but no inline structural prompt).
- **The Tour exists and is plain-language.** 13 steps; non-jargon framing. The persona file's pain point #3 calls out onboarding written for experienced architects — the Tour is a meaningful counterweight.
- **Application detail's "Decommission Impact: High Risk" + "Orphaned Capabilities" surface** (carried over from prior walks) is a strong relationship-impact visualisation — exactly what the persona's relevant-capability "see downstream effects before changes propagate" asks for. It's read-only today; an *authoring*-side guard ("you're about to decommission OpenGov — 1 capability becomes orphaned, click to confirm") would close the loop.

### Existing gaps that apply equally

| Existing | Coverage |
|---|---|
| [#548](https://github.com/roballred/GovEA/issues/548) (in epic [#556](https://github.com/roballred/GovEA/issues/556)) | Same admin-dashboard landing problem — Contributor too. |
| [#554](https://github.com/roballred/GovEA/issues/554) | Duplicate `taxonomy_terms` rows surface during authoring whenever a junior analyst is asked to apply a tag. |
| [#538](https://github.com/roballred/GovEA/issues/538) | Cross-org duplication detection — different scope from [#566](https://github.com/roballred/GovEA/issues/566) (across orgs vs. within) but same root concern. The two can share a normalization helper. |

### Persona-validation note

Persona is still **Assumed**. The two gaps filed here (#566 / #567) directly address pain points stated in the persona file, so they're conservative — they hold whether or not the persona is later validated. The bigger validation question — *"would real junior analysts actually prefer GovEA's authoring surface over the spreadsheets they're escaping?"* — is a research question, not an audit question.

## Cumulative state after nine walks

- **7 / 16 personas remaining.**
- This walk produced **2 net-new gaps** plus a notable shift in finding shape: prior reader walks surfaced *access-model* gaps; this walk surfaced *authoring-affordance* gaps. The cumulative epic [#556](https://github.com/roballred/GovEA/issues/556) (Viewer Experience) is the right wrapper for the access-model pile; an authoring-experience wrapper may emerge as more author personas are walked.
- The Contributor walk also produced **two genuinely strong positives** (RBAC enforcement, Tour) that none of the reader walks could surface — useful counter-balance to the running gap count.

## Recommended follow-up

1. **[#566](https://github.com/roballred/GovEA/issues/566) (duplicate-name) is the highest-leverage authoring fix surfaced so far.** Soft-warn pattern is mechanically cheap (~50 lines of async-check + inline note per form) and addresses a pain point named in the persona file verbatim. Recommend folding into the Phase 1 sprint regardless of further author-persona validation.
2. **[#567](https://github.com/roballred/GovEA/issues/567) (unsaved-changes + required-field) is paired** — both improve the *soft guardrails* surface. The unsaved-changes half is mechanically cheaper; the required-field half deserves a design pass to decide per-entity what counts as "complete enough to publish."
3. **Next persona walks: I'd recommend pairing [`data-modeler`](business-architecture/personas/data-modeler.md) and [`enterprise-data-architect`](business-architecture/personas/enterprise-data-architect.md) as the next two walks**, both author-side and both focused on the data-architecture surfaces (`/data` overview, entities, attributes, links, business keys, diagram). They're the most likely to surface concentrated findings in a single capability area that the nine walks so far have skipped entirely. Alternative: [`domain-architect`](business-architecture/personas/domain-architect.md) as a single power-author walk if you'd rather not pair.
