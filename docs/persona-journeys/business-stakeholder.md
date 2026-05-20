# Persona Journey — Business Stakeholder (EA Consumer)

**Persona file:** [`business-architecture/personas/business-stakeholder.md`](../../business-architecture/personas/business-stakeholder.md)
**Capability anchors:** [`fd-traceability-views`](../../business-architecture/capabilities/cms/frontend-display/fd-traceability-views.md), [`fd-portfolio-views`](../../business-architecture/capabilities/cms/frontend-display/fd-portfolio-views.md), [`fd-relationship-navigation`](../../business-architecture/capabilities/cms/frontend-display/fd-relationship-navigation.md), [`fd-guided-answer-views`](../../business-architecture/capabilities/cms/frontend-display/fd-guided-answer-views.md); candidate new — cross-initiative conflict view.
**Walk audited:** 2026-05-19 — **sixteenth (final)** persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #599](https://github.com/roballred/GovEA/issues/599))
**Persona validation status:** Assumed.

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `victor@govea.dev` (Viewer — closest proxy for a non-author programme manager).

This walk's distinctive lens vs. prior walks:

- **Programme Director** ([#577](https://github.com/roballred/GovEA/issues/577)) — *senior* delivery leadership; quarter / sprint horizon; canonical question *"what breaks if I decommission Y?"*
- **Department Director** ([#557](https://github.com/roballred/GovEA/issues/557)) — investment / strategy at 3-5 year horizon.
- **Elected Official** ([#547](https://github.com/roballred/GovEA/issues/547)) — public-facing accountability; press-meeting prep.
- **Business Stakeholder** — *operational* programme manager between technical delivery teams and senior leadership. Day-to-day question: *"what does this system connect to; what's it retiring; who else is touching it?"*

The persona's critical insight is the most useful test in the audit: *"The Business Stakeholder is the most direct test of whether an EA practice is delivering value. If they cannot get answers from the EA repository without help from an architect, the practice has failed to operationalise its outputs."*

## Canonical journey

1. Sign in as Viewer.
2. Dashboard from a non-architect's perspective — is the surface usable without translation?
3. Roadmap — cross-programme dependency and timeline visibility.
4. Initiatives list / detail — assess overlap-detection between programmes.
5. Application detail — plain-language dependency / lifecycle / decommission framing.
6. Guided Answer (`/answers?q=…`) — self-service answer surface (the persona's defining capability need).
7. Strategic Objective detail — alignment from the consumer's perspective.
8. Cross-initiative impact / conflict surface (the persona's stated pain #4).
9. Glossary — plain-language definitions.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in as Viewer | **Works** | Manual sign-in path (no "Riverdale Viewer" dev shortcut) — same friction as [#548](https://github.com/roballred/GovEA/issues/548). |
| 2 | Dashboard | **Partial** | Density is good; **language is architect-heavy** for this persona — "Completeness trend," "Federation Activity," "Review Health (180-day window)," "Coverage" all require translation. Compare to the Executive Summary surface which is plain-language. Not severe enough to file as a discrete gap; flagged under existing [#556](https://github.com/roballred/GovEA/issues/556) (Viewer/Contributor experience epic). |
| 3 | Roadmap | **Works** ✅ | Strong fit. Plain-language tagline: *"What is changing, when it is changing, and what business impact is expected."* Timeline + Grid view toggle. Each initiative shows status, timeframe, linked capabilities, linked objective. **Persistent gap:** no per-programme scope filter (same as Programme Director walk; [#549](https://github.com/roballred/GovEA/issues/549)). |
| 4 | Initiatives list / detail | **Partial** | List filters by Initiative Type only. Detail shows linked Capabilities, Strategic Objectives, Applications with relationship labels (`improve` / `build` / `retire`). **Missing:** "Other initiatives touching these capabilities / applications" panel — to answer the persona's stated need *"see whether their programme's intended changes overlap with other active initiatives."* Today, the user must click into each linked capability and read its inverse panel separately. Gap [#600](https://github.com/roballred/GovEA/issues/600). |
| 5 | Application detail | **Works (with prior gap)** | Vendor, hosting, capabilities, ADRs, Decommission Impact, Orphaned Capabilities all surface. Plain-language description (*"In-house permitting system built in 2008. Retired in favour of Accela."*) is right for the persona. Dependency-impact gap from Programme Director walk applies equally ([#578](https://github.com/roballred/GovEA/issues/578)) — not re-filed. |
| 6 | Guided Answer | **Works** ✅ | The persona's killer feature. Plain-language search across published capabilities, services, applications, initiatives, objectives. Example: a query for *"Online Permitting"* returns **9 items across 5 areas** — Capabilities, Services, Technology, Active Initiatives, Strategic Objectives — each with a *"Why relevant"* explanation. *Exactly* the *"answers without raising a ticket to the EA team"* affordance the persona's critical insight calls for. |
| 7 | Strategic Objective detail | **Works** ✅ | Confirmed live by Programme Director walk (PR [#561](https://github.com/roballred/GovEA/pull/561) closing [#558](https://github.com/roballred/GovEA/issues/558)). Capability + Initiative + Application alignment chain readable end-to-end. |
| 8 | Cross-initiative impact / conflict | **Missing** | Persona pain point #4 unaddressed at the initiative-anchored shape. Capability-anchored "Referenced in Initiatives" panel partially answers the question for a single capability, but the Business Stakeholder's lens is initiative-outward, not capability-inward. Gap [#600](https://github.com/roballred/GovEA/issues/600). |
| 9 | Glossary | **Works** ✅ | 17 terms with plain-language definitions; defines ADR, Capability, Business Architecture, etc. Helps the non-architect consumer. Strong fit. |

**Tally:** 5 works ✅ · 3 partial · 1 missing · 1 sign-in friction.

## Findings

### Gaps filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#600](https://github.com/roballred/GovEA/issues/600) | Medium-High (persona-named pain) | Cross-initiative overlap / conflict view from an initiative's perspective. Adds an *"Other initiatives touching these capabilities/applications"* panel to the initiative detail page, with optional warning on timeframe + relationship-label conflict (one initiative retires what another improves). Complements [#578](https://github.com/roballred/GovEA/issues/578) (application-anchored impact view) at the initiative anchor. |

### Existing gaps that apply equally

- [#578](https://github.com/roballred/GovEA/issues/578) — Self-service dependency-impact view (Programme Director walk). Application-anchored question; same persona need.
- [#549](https://github.com/roballred/GovEA/issues/549) — Programme-scope filter on Roadmap / Initiatives.
- [#556](https://github.com/roballred/GovEA/issues/556) — Viewer/Contributor experience epic; covers Dashboard jargon for non-architects.
- [#553](https://github.com/roballred/GovEA/issues/553) — publish/last-updated dates; trust signals for the persona.
- [#581](https://github.com/roballred/GovEA/issues/581) — Change notifications. The Business Stakeholder's pain point *"do not find out until delivery is already underway"* would be addressed here.

### Persona-validation note

Persona is **Assumed**. The persona file is the audit's clearest articulation of *"what does success look like for an EA practice?"* — *"The Business Stakeholder is the most direct test of whether an EA practice is delivering value."* The Guided Answer surface alone clears a substantial bar against the critical insight: a programme manager *can* get plain-language answers across five areas without a ticket. Closing [#600](https://github.com/roballred/GovEA/issues/600) + [#578](https://github.com/roballred/GovEA/issues/578) would put the practice's *operational delivery value* into the green.

## Strong positives — particularly relevant to this persona

- **Guided Answer (`/answers?q=…`)** is the audit's most persona-foundational shipped feature. Returns multi-area results with plain-language *"Why relevant"* framing — *exactly* the persona's *"answers without raising a ticket"* affordance. Worth naming this persona explicitly in the [`fd-guided-answer-views`](../../business-architecture/capabilities/cms/frontend-display/fd-guided-answer-views.md) capability doc.
- **Roadmap copy** *"What is changing, when it is changing, and what business impact is expected"* is plain-language and explicitly delivery-framed.
- **Initiative ↔ Application labels** (`improve` / `build` / `retire`) are stakeholder-appropriate verbs. A programme manager reading *"Legacy Permitting System · In-house · retire"* doesn't need an architect to translate.
- **Glossary as a published surface** lowers the per-term translation cost without forcing the persona into framework docs.
- **Application Decommission Impact label** ("Medium Risk", "High Risk") is the kind of qualitative shorthand a programme manager can act on immediately — even before [#578](https://github.com/roballred/GovEA/issues/578) lands the structured impact view.

## Cumulative state after all sixteen walks

- **All 16 personas walked.** ✅
- This walk produced **one net-new gap** ([#600](https://github.com/roballred/GovEA/issues/600)) and re-confirmed several from the cumulative pile.
- **Net-new audit-wide gap count: 24 issues filed** (#527, #548, #549, #553, #554, #556, #558 [closed by #561], #559, #560, #563, #570, #573, #575 [closed by #576], #578, #581, #582 [closed by #585], #587, #588 [closed by #594], #596, #597, #600, plus walk-internal supports).
- **Audit-driven fixes shipped during the audit:** PR [#561](https://github.com/roballred/GovEA/pull/561) (strategic-objective crash fix surfaced by Department Director walk), PR [#576](https://github.com/roballred/GovEA/pull/576) (docs-hygiene capability backfill), PR [#585](https://github.com/roballred/GovEA/pull/585) (TOGAF seed mappings), PR [#594](https://github.com/roballred/GovEA/pull/594) (tour title misalignment + pluralization typos).

## Recommended follow-up

1. **[#600](https://github.com/roballred/GovEA/issues/600)** is incrementally shippable — small enough for a contributor PR, leverages existing initiative-detail surface. Bundles cleanly with [#578](https://github.com/roballred/GovEA/issues/578) into a "dependency / conflict awareness" feature theme.
2. **Audit close-out.** With this walk, Phase 0.5 is complete. The next step is to write `docs/persona-journeys/README.md` summarising the full 16-walk audit per epic [#515](https://github.com/roballred/GovEA/issues/515) acceptance:
   - Tally of gaps per persona.
   - Tally of gaps per capability anchor.
   - Cumulative persona-foundational issues sorted by adoption-leverage.
   - The audit's strongest-positive shipped features and which personas they serve.

   Recommend writing this README in the same PR as this final walk, since it closes the epic.
