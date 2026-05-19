# Persona Journey — Programme Director

**Persona file:** [`business-architecture/personas/programme-director.md`](../../business-architecture/personas/programme-director.md)
**Capability anchors:** [`fd-traceability-views`](../../business-architecture/capabilities/cms/frontend-display/fd-traceability-views.md), [`fd-portfolio-views`](../../business-architecture/capabilities/cms/frontend-display/fd-portfolio-views.md), planning-initiatives; candidate new — dependency-impact-analysis, change-notifications.
**Walk audited:** 2026-05-19 — twelfth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #577](https://github.com/roballred/GovEA/issues/577))
**Persona validation status:** Assumed.

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `victor@govea.dev` (Viewer — the closest read-only proxy for a non-author programme manager).

The persona file explicitly distinguishes this walk from the [Department Director walk](department-director.md) ([#557](https://github.com/roballred/GovEA/issues/557)) by **delivery sequencing focus** (this sprint / this quarter) and the canonical question *"what breaks if I decommission Y?"* This walk's lens is the persona's stated need for **self-service dependency lookup and impact analysis**.

## Canonical journey

1. Sign in as Viewer.
2. Open Strategic Objective detail (validate [#561](https://github.com/roballred/GovEA/issues/561) fix is in place; primary dependency surface for the persona).
3. Open Roadmap; assess EA vs. programme schedule alignment.
4. Open an Application with `lifecycle_status = decommissioned` (Legacy Permitting System); look for "what breaks if I decommission this?" impact data.
5. Try a self-service dependency-lookup via Guided Answers.
6. Look for change-notification / subscription affordances.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in | **Works (with friction)** | Same dashboard landing as prior Viewer walks. Covered by [#548](https://github.com/roballred/GovEA/issues/548) in epic [#556](https://github.com/roballred/GovEA/issues/556). |
| 2 | Strategic Objective detail | **Works** ✅ | [PR #561](https://github.com/roballred/GovEA/pull/561) fix confirmed live. `/objectives/[id]` now renders correctly with success metric, time horizon, linked capabilities, value streams, applications, initiatives. Previously crashed; the fix closes [#558](https://github.com/roballred/GovEA/issues/558). |
| 3 | Roadmap | **Works** | Same finding as Department Director walk — strong timeline + impact-language surface. No programme-scope filter (covered separately by [#549](https://github.com/roballred/GovEA/issues/549) and the financial-dimension question [#563](https://github.com/roballred/GovEA/issues/563)). |
| 4 | Application detail with lifecycle=decommissioned (Legacy Permitting System) | **Partial** | Shows "Decommissioned" status, plain-language description ("In-house permitting system built in 2008. Retired in favour of Accela."), linked Capabilities, Strategic Objectives, Initiatives, and a qualitative **"Decommission Impact: Medium Risk"** label. Does not aggregate dependency information into a single panel the persona can act on. Persona's canonical question — *"what breaks if I decommission this before the replacement is live?"* — is reachable only by ad-hoc browsing of linked entities. Gap [#578](https://github.com/roballred/GovEA/issues/578). |
| 5 | Self-service dependency lookup | **Missing** | `/answers?q=Legacy+Permitting+System` returns *"No published content found"* — the guided-answer view doesn't index Applications by name in the same way it indexes Capabilities / Services / Initiatives. Even if it did, the persona's question is impact-shape, not search-shape — text search returns the record; what's needed is *what depends on the record*. Same gap [#578](https://github.com/roballred/GovEA/issues/578). |
| 6 | Change-notification / subscription | **Missing (out of scope for now)** | No subscribe-to-changes affordance anywhere. Persona pain point #4 ("EA roadmaps and programme roadmaps rarely match — maintained in separate systems with no synchronisation"). Out of scope for this issue — depends on email configuration shipping first ([#528](https://github.com/roballred/GovEA/issues/528)). Flagged for follow-up in [#578](https://github.com/roballred/GovEA/issues/578)'s "Out of scope" section. |

**Tally:** 1 confirmed-fixed ✅ · 2 works · 1 partial · 2 missing.

## Findings

### Gap filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#578](https://github.com/roballred/GovEA/issues/578) | Medium-High (persona-foundational) | No self-service dependency-impact view. Persona's canonical question *"what breaks if I decommission Y?"* is unanswerable by self-service today. Suggested an "Impact Analysis" panel on Application detail with three computed sections: "If you decommission this..." / "What this depends on" (out of scope today; would require new schema) / "Last changed." |

### Confirmation: PR #561 fix is live

The Department Director walk ([#557](https://github.com/roballred/GovEA/issues/557)) blocked at step 3 (objective detail crash). This walk reproduces that same step end-to-end without error. The Drizzle alias-length fix is in place and the underlying strategic-alignment chain works for all readers.

### Existing gaps that apply equally

- Viewer Experience epic ([#556](https://github.com/roballred/GovEA/issues/556)) — applies wholesale to this persona too.
- [#549](https://github.com/roballred/GovEA/issues/549) — `/traceability` top-level entry; PD persona benefits from a "show me my programme's traces" landing.
- [#553](https://github.com/roballred/GovEA/issues/553) — publish/last-updated dates; PD's pain point #4 ("EA roadmaps and programme roadmaps maintained separately with no sync") gets partially better when content carries freshness signals.
- [#559](https://github.com/roballred/GovEA/issues/559) — print/presentation export; PD persona prepares status briefings.
- [#528](https://github.com/roballred/GovEA/issues/528) — email configuration; enables change-notifications (PD pain point #4).

### Persona-validation note

Persona is **Assumed**. The persona file's distinction-from-Department-Director table is sharp and the canonical question ("what breaks if I decommission Y?") is well-framed — these are conservative enough to act on without further validation. The bigger question — *"would real IT programme managers actually adopt GovEA as their dependency-lookup surface vs. asking colleagues?"* — is the adoption test [#578](https://github.com/roballred/GovEA/issues/578) is meant to answer.

## Strong positives — particularly relevant to this persona

- **"Decommission Impact" qualitative label** on Application detail is exactly the kind of plain-language framing the persona prefers. Even if it doesn't yet enumerate the specific dependencies, the *framing* is right — operational/delivery language, not architectural metadata.
- **"Orphaned Capabilities" roll-up** on Application detail surfaces the highest-stakes impact question (would-be-stranded capabilities) without making the PD compute it manually.
- **Initiative ↔ Application "retire" / "build" labels** make the replacement relationship explicit. Legacy Permitting System detail shows "Referenced in Initiatives (1): Accela Implementation, retire, active" — exactly the data a PD needs to confirm the replacement is in flight.
- **Strategic Objective detail now works** ([PR #561](https://github.com/roballred/GovEA/pull/561)). The full investment-to-objective chain is reachable end-to-end.

## Cumulative state after twelve walks

- **4 / 16 personas remaining.**
- This walk produced only **one net-new gap** ([#578](https://github.com/roballred/GovEA/issues/578)) — pattern is now stable: each walk surfaces 1–2 net-new and confirms several from the cumulative pile.
- The PR #561 confirmation validates the audit-as-quality-check loop: a structural bug found by walking → fix surfaced → fix validated by the next walk that needs the path.

## Recommended follow-up

1. **[#578](https://github.com/roballred/GovEA/issues/578) is the highest-leverage data-architecture-to-delivery integration in the audit so far.** Persona's stated need is precise; capability lay-up exists; the gap is a single computed view aggregating data that already exists in the model.
2. **Next persona walks (4 remaining):**
   - [`domain-architect`](business-architecture/personas/domain-architect.md) — subject-area model lens; would exercise capability-domain navigation deeply.
   - [`consultant-si`](business-architecture/personas/consultant-si.md) — outside-systems-integrator perspective; multi-tenant / data-handoff concerns.
   - [`early-maturity-practice-lead`](business-architecture/personas/early-maturity-practice-lead.md) — small EA practice setup lens; would exercise onboarding/seeding decisions.
   - [`business-stakeholder`](business-architecture/personas/business-stakeholder.md) — applies symmetrically to Viewer/Elected-Official but with a different question shape.

   Recommend `domain-architect` next — exercises capability-domain navigation (which has been touched but never centered) and likely surfaces gaps around domain-level governance views the audit hasn't probed.
