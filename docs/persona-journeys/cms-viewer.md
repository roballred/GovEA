# Persona Journey — Content Viewer

**Persona file:** [`business-architecture/personas/cms-viewer.md`](../../business-architecture/personas/cms-viewer.md)
**Capability anchors:** [`frontend-display`](../../business-architecture/capabilities/cms/frontend-display/) group — `fd-content-display`, `fd-navigation`, `fd-relationship-navigation`, `fd-repository-confidence-summary`.
**Walk audited:** 2026-05-19 — sixth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #552](https://github.com/roballred/GovEA/issues/552))
**Persona validation status:** Assumed (not yet validated with real department heads, budget staff, or external stakeholders).

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `victor@govea.dev` (Riverdale Viewer). This walk deliberately complements the Elected Official walk ([#546](https://github.com/roballred/GovEA/issues/546)) by exercising what that walk skipped: read-only enforcement on content detail pages, relationship navigation, and freshness signals on content (not just dashboard) surfaces.

## Canonical journey

1. Sign in as a Viewer.
2. Open Capabilities list and a Capability detail page — verify read-only enforcement.
3. Open Personas detail page — same.
4. Open Applications detail page — same.
5. Open ADR (Decision) detail page — same.
6. Open Glossary.
7. Use Search and relationship-link navigation.
8. Look for freshness / publish-date signals on every content type.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in (`victor@govea.dev`) | **Works (same friction as EO walk)** | Same admin-shaped dashboard landing as in [#546](https://github.com/roballred/GovEA/issues/546). Already tracked by gap [#548](https://github.com/roballred/GovEA/issues/548). |
| 2a | Capabilities list | **Works** | 13 rows; no "+ New", "Edit", or "Delete" affordances visible. Filters all read-only. |
| 2b | Capability detail (Budget Reporting) | **Works (with gap)** | Detail page renders cleanly with Behaviors, Rules, linked Personas, Applications, Initiatives, ADRs. **No edit buttons.** **No publish/last-updated date** anywhere on the page — only a "Published" status badge. Gap [#553](https://github.com/roballred/GovEA/issues/553). |
| 3 | Persona detail (City Council Member) | **Works (with bug)** | Page renders correctly. Date present: "Created 5/6/2026 · Modified 5/6/2026 · Never reviewed." **But the Tags section shows the "accessibility" chip rendered 18 times in a row** — caused by 19 duplicate `taxonomy_terms` rows. Gap [#554](https://github.com/roballred/GovEA/issues/554). |
| 4 | Application detail (OpenGov) | **Works (with gap)** | Read-only. Status, hosting, capabilities, related ADRs all render. Same date-missing pattern as the capability page. [#553](https://github.com/roballred/GovEA/issues/553) covers. |
| 5 | ADR detail (ADR-001) | **Works (with gap)** | Read-only. Context, Decision, Consequences sections render. **No decision date anywhere** — ADRs especially miss this since the genre exists to record *when* a decision was made. [#553](https://github.com/roballred/GovEA/issues/553) covers. |
| 6 | Glossary | **Works** | Domain filter, plain-language definitions, no edit buttons. Read-only enforcement clean. |
| 7 | Relationship navigation | **Works very well** | Linked Personas, Applications, Initiatives, ADRs on capability detail page all link out correctly. The "View map →" and "View traceability →" links on capability detail pages construct the proper drill-down URLs — so traceability *is* reachable from capability detail, just not from a top-level entry (still tracked by [#549](https://github.com/roballred/GovEA/issues/549)). |
| 8 | Search | **Works** | Same search behavior as covered in the Elected Official walk. `/answers` flow detours through `/search` (still tracked by [#550](https://github.com/roballred/GovEA/issues/550)). |

**Tally:** 4 works · 2 works-with-bug · 2 works-with-gap. No outright blockers.

## Findings

### Gaps filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#553](https://github.com/roballred/GovEA/issues/553) | Medium (persona-foundational) | Capability, Application, and ADR detail pages don't show publish or last-updated dates. Persona explicitly depends on visible currency signals. ADRs especially suffer — no decision date. |
| [#554](https://github.com/roballred/GovEA/issues/554) | Medium (bug + data hygiene) | 19 duplicate `taxonomy_terms` rows for "accessibility" cause persona pages to render the same tag chip 18 times. Missing unique constraint on `(organization_id, parent_id, name)`. Likely affects every duplicated tag value. |

### Existing gaps that apply equally to this persona

The Elected Official walk surfaced four gaps that apply unchanged to `cms-viewer`. Not re-filed:

| Existing | Coverage |
|---|---|
| [#547](https://github.com/roballred/GovEA/issues/547) | No public-read access. Persona's pain point #4 is "login friction — SSO should just work; separate credentials are a barrier." |
| [#548](https://github.com/roballred/GovEA/issues/548) | Viewer lands on admin dashboard. Persona's pain point #5 is "dense, technical outputs designed for architects." |
| [#549](https://github.com/roballred/GovEA/issues/549) | `/traceability` bare URL 404s. Persona's goal "navigate relationships between content" applies. |
| [#550](https://github.com/roballred/GovEA/issues/550) | `/answers` needs direct input; "Capabilitys" typo. |

### What works very well

- **Read-only enforcement is clean and consistent.** Across every content surface I exercised (capability list + detail, persona detail, application detail, ADR detail, glossary), there were zero edit affordances for the Viewer role. No leaked buttons, no broken-state forms. This is unambiguously good — the RBAC at the UI layer is doing its job.
- **Relationship navigation is rich and reliable.** Linked entities throughout the content surfaces are clickable and route correctly. The "View map →" and "View traceability →" affordances on capability detail are particularly useful — they expose the drill-down path that the top-level `/traceability` 404 ([#549](https://github.com/roballred/GovEA/issues/549)) is trying to fix.
- **Persona / Initiative detail pages already show the freshness tri-line** ("Created · Modified · Never reviewed"). That existing pattern is the template for the inconsistency [#553](https://github.com/roballred/GovEA/issues/553) asks to apply uniformly.

### Validation note

Persona is **Assumed**. The findings here are conservative — read-only enforcement and missing publish dates would be true for any non-authoring stakeholder regardless of validation outcomes. The bigger persona-validation questions ("would real department directors actually use this?" "what content do they want first?") are out of scope for what an audit can answer.

## Cumulative tally so far

After six walks ([#519](https://github.com/roballred/GovEA/issues/519), [#526](https://github.com/roballred/GovEA/issues/526), [#535](https://github.com/roballred/GovEA/issues/535), [#541](https://github.com/roballred/GovEA/issues/541), [#546](https://github.com/roballred/GovEA/issues/546), #552):

- **10 / 16 personas remaining.**
- **20+ gap issues filed** across foundational bugs, persona-foundational feature gaps, UX polish, seed coverage, and capability-doc hygiene.
- Three clear themes emerging:
  1. **Viewer-side experience needs structural work** (public access, role-tailored landing, freshness signals, relationship-nav entry points).
  2. **Multi-org federation is functional but has rough edges** (cross-org link visibility, seed coverage, system org in dropdowns).
  3. **Capability docs are uneven on Implementation Status** — admin-configuration and frontend-display both missing the section across multiple files.

## Recommended follow-up

1. **The four "applies equally" Elected Official gaps** ([#547](https://github.com/roballred/GovEA/issues/547), [#548](https://github.com/roballred/GovEA/issues/548), [#549](https://github.com/roballred/GovEA/issues/549), [#550](https://github.com/roballred/GovEA/issues/550)) plus the two new ones from this walk ([#553](https://github.com/roballred/GovEA/issues/553), [#554](https://github.com/roballred/GovEA/issues/554)) form a coherent **Viewer Experience** workstream. Worth scoping as a single epic-level priority before more persona walks add to the pile.
2. **Next persona walk** — I'd suggest [`department-director`](business-architecture/personas/department-director.md). It's the "decision-maker who reads but also asks specific questions" persona — closer to a power user than the EO/CMS-Viewer pair, and it'll exercise paths around services and value-stream navigation that the first six walks haven't touched. Alternative: `budget-performance-analyst` (sibling decision-maker, similar shape).
