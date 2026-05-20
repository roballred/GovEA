# Persona Journey — Early-Maturity EA Practice Lead

**Persona file:** [`business-architecture/personas/early-maturity-practice-lead.md`](../../business-architecture/personas/early-maturity-practice-lead.md)
**Capability anchors:** [`rm-repository-completeness`](../../business-architecture/capabilities/ea/repository-modelling/rm-repository-completeness.md), [`mo-content-workflow`](../../business-architecture/capabilities/cms/multi-org/mo-content-workflow.md), [`ac-feature-management`](../../business-architecture/capabilities/cms/admin-configuration/ac-feature-management.md); candidate new — starter content / first-time experience.
**Walk audited:** 2026-05-19 — fourteenth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #586](https://github.com/roballred/GovEA/issues/586))
**Persona validation status:** Assumed.

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `alice@govea.dev` (Riverdale Admin — practice founder).

Riverdale has pre-seeded content. For this walk I deliberately treated the seeded data as if Alice had built it herself in week 1 and asked: *"could she credibly show this to leadership in week 2?"* For the blank-canvas question (the persona's most acute pain), I read `/setup` + the empty-state behavior in source rather than re-seed.

This walk's distinctive lens vs. prior walks:

- **Enterprise Architect** ([#552](https://github.com/roballred/GovEA/issues/552)) walks an established practice with the full feature set.
- **CMS Administrator** ([#550](https://github.com/roballred/GovEA/issues/550)) configures the platform after the practice is established.
- **Early-Maturity Practice Lead** is the *founder* — empty repo, no team, and a narrow window of organisational patience. The defining question: *"what can I publish credibly in week 2?"*

## Canonical journey

1. Sign in as Admin.
2. Land on Dashboard — first impression for a first-time EA lead.
3. Look for starter / template / quick-start content offerings.
4. Take the Product Tour — orient on the workspace.
5. Open Settings — assess practice-shaping affordances (modules, completeness, confidence).
6. Open Architecture Vision report — assess leadership-presentation surface.
7. Open Executive Summary — assess week-2 demo material.
8. Verify Repository Confidence settings — the persona's "honest about partial" affordance.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in as Admin | **Works** | Dev shortcut "Riverdale Admin" lands as Alice. Same friction as prior walks under [#548](https://github.com/roballred/GovEA/issues/548). |
| 2 | Dashboard first impression | **Works** | Completeness Trend (77% today · 0pt over 6 days), coverage tiles by object type with draft counts, Review Health 180-day window, Capabilities by Domain, Needs Attention, Recent Activity, Initiatives. Strong density of progress signals — exactly what a practice lead wants. **Gap:** no inline first-time CTA for a brand-new empty org; on a fresh `/setup`, all tiles show 0 with no guidance. |
| 3 | Starter / template content | **Missing** | `/setup` creates the org + admin and redirects to `/login` — no offer of starter content, reference taxonomy, or example records. Persona's *"blank-canvas problem"* pain point is unaddressed. Gap [#587](https://github.com/roballred/GovEA/issues/587). |
| 4 | Product Tour | **Works** ✅ | 13-step driver.js tour, role-aware (per-role copy on the final step), plain-language descriptions. Sample: *"Dashboard: See how much of your catalog is published vs. draft and where the gaps are. A good starting point before any governance review."* Excellent fit. **Bug:** tour steps 9-11 have title/element misalignment (Strategy element with "Decisions" title, Roadmap element with "Strategy" title, etc.). Bug [#588](https://github.com/roballred/GovEA/issues/588). |
| 5 | Settings page | **Works** ✅ | Six sections — Appearance / Modules / Framework Overlays / Application Custom Fields / Repository Completeness (configurable staleness window) / **Repository Confidence**. Modules toggle is the *progressive-disclosure* the persona file calls for; turn off pieces the org doesn't use yet. |
| 6 | Architecture Vision report | **Works** ✅ | Sections: Strategic Drivers, Capability Coverage, Stakeholders, Application Portfolio, Architecture Principles, Key Architecture Decisions, Change Roadmap. Footer caveat is **exactly right** for this persona: *"This summary is generated from your GovEA repository… and does not constitute formal TOGAF compliance attestation."* Pluralization bug: *"3 capabilityies linked"* on Strategic Drivers — bug [#588](https://github.com/roballred/GovEA/issues/588). |
| 7 | Executive Summary | **Works** ✅ | Plain-language stakeholder surface — Actively Maintained badge, active/total counts, Coverage Gaps, Portfolio Currency %, Transformation Progress, Recent Updates. Footer: *"Reflects published content only. Draft and archived records are excluded."* Same pluralization typo *"4 capabilityies without supporting technology"* — [#588](https://github.com/roballred/GovEA/issues/588). |
| 8 | Repository Confidence settings | **Works** ✅ | The persona's killer feature. Settings page exposes: opt-in show-to-authenticated-viewers, separate opt-in show-to-unauthenticated-public, **Admin narrative (optional)** field for plain-language framing, and **"Suppress when published content falls below %"** auto-hide threshold. This is the *"publish partial content as in-progress without misrepresenting it"* affordance the persona's critical insight calls for, shipped almost exactly as the persona would ask. |

**Tally:** 6 works · 1 partial (Dashboard for empty state) · 1 missing (starter content).

## Findings

### Gaps filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#587](https://github.com/roballred/GovEA/issues/587) | Medium (persona-foundational) | No starter content + no first-time experience for new EA practices. Two distinct affordances: (1) named "starter pack" content (small canonical city); (2) first-sign-in three-choice gate (tour / starter / from-scratch) + inline empty-state CTAs across catalog pages. The persona's defining pain point is unaddressed. |
| [#588](https://github.com/roballred/GovEA/issues/588) | Low (quality) | Tour steps 9-11 have title/element misalignment in `product-tour.tsx` (Strategy element with "Decisions" title, etc.); *"capabilityies"* pluralization typo in Architecture Vision and Executive Summary reports. Both surface-level but both hit the credibility surfaces this persona depends on. |

### Existing gaps that apply equally

- [#556](https://github.com/roballred/GovEA/issues/556) — Viewer/Contributor experience epic; some of the empty-state CTA work could ride here.
- [#553](https://github.com/roballred/GovEA/issues/553) — publish/last-updated dates; relevant for the persona's progress-narrative.
- [#559](https://github.com/roballred/GovEA/issues/559) — print/presentation export; persona prepares leadership briefings.

### Considered but not filed

- **Auto-fire tour on first sign-in.** Solid idea; included in [#587](https://github.com/roballred/GovEA/issues/587) as part of the first-time experience rather than a discrete issue.
- **CSV/Archi/Sparx import.** Useful but a separate larger workstream; explicitly out of scope in [#587](https://github.com/roballred/GovEA/issues/587).

### Persona-validation note

Persona is **Assumed**. The persona file is precise: *"adopt and champion GovEA only if it lets them show something to leadership within weeks, not months."* Every persona-foundational signal the build already exposes — Architecture Vision report, Repository Confidence settings, the Product Tour — was *evidently designed for this persona even if it isn't named in those features' docs*. The fit is unusually strong. [#587](https://github.com/roballred/GovEA/issues/587) is the missing third leg of the table.

## Strong positives — particularly relevant to this persona

- **Repository Confidence settings ([`fd-repository-confidence-summary`](../../business-architecture/capabilities/cms/frontend-display/fd-repository-confidence-summary.md))** are *the* feature most directly matching the persona's critical insight. The auto-suppress-below-X% setting is a thoughtful guard against publishing prematurely; the admin-narrative field lets the practice lead frame the content honestly without writing it into every page.
- **Architecture Vision report** caveat language is exactly right: *"This summary is generated from your GovEA repository at the time of generation and does not constitute formal TOGAF compliance attestation."* No false-completeness signalling.
- **Product Tour copy** is plain-language and dashboard-first. Sample: *"See how much of your catalog is published vs. draft and where the gaps are. A good starting point before any governance review."* The author of the tour was thinking about a practice lead even if the audience wasn't named.
- **Modules toggle** in Settings supports progressive disclosure — Personas / Value Streams / Services / Principles / Glossary / Data Architecture / Architecture Debt / Roadmap can each be hidden until the org is ready to use them.

## Cumulative state after fourteen walks

- **2 / 16 personas remaining**: consultant-si, business-stakeholder.
- This walk produced **two net-new gaps** ([#587](https://github.com/roballred/GovEA/issues/587) persona-foundational, [#588](https://github.com/roballred/GovEA/issues/588) quality) and confirmed several from the pile.
- Notable cumulative pattern: the build has a *latent fit* for the Early-Maturity Practice Lead that has not been named anywhere in the docs. Multiple shipped features (Confidence summary, Vision report caveat, Modules toggle, Tour) read as if designed for this persona. The walk's main contribution is naming that latent fit — and one clear gap ([#587](https://github.com/roballred/GovEA/issues/587)) standing between it and adoption.
- Audit-as-quality-check loop continues: [#588](https://github.com/roballred/GovEA/issues/588) is a 5-minute fix surfaced only by walking the surfaces a stakeholder would see.

## Recommended follow-up

1. **[#588](https://github.com/roballred/GovEA/issues/588)** is two small, contained fixes (tour off-by-one + pluralization template). Could ship in a single PR alongside any other quality work — both are visible to every stakeholder demo.
2. **[#587](https://github.com/roballred/GovEA/issues/587)** is the strategic capability — and the audit's clearest articulation of *"what stands between a strong fit and actual adoption."* Starter content is concrete and small to scope; the first-time experience layer is a separate, smaller deliverable on top. Either could ship independently.
3. **Next persona walks (2 remaining):**
   - [`consultant-si`](../../business-architecture/personas/consultant-si.md) — outside-systems-integrator perspective; multi-tenant / data-handoff concerns.
   - [`business-stakeholder`](../../business-architecture/personas/business-stakeholder.md) — applies symmetrically to Viewer/Elected-Official but with a different question shape.

   Recommend **`consultant-si`** next — most distinct from prior walks; exercises federation, cross-org visibility, and partner workflows the audit hasn't centred. `business-stakeholder` as the final close-out walk.
