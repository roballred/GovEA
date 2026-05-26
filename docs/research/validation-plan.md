# Persona Validation Plan

**Issue:** [#384](https://github.com/roballred/GovEA/issues/384)
**Related:** [`stakeholder-assumption-register.md`](./stakeholder-assumption-register.md), [`stakeholder-interview-guide.md`](./stakeholder-interview-guide.md), [`business-architecture/feedback-log.md`](../../business-architecture/feedback-log.md), [#103](https://github.com/roballred/GovEA/issues/103)

This document is the **operating plan** for moving GovEA personas from `Assumed` to `Validated`. The persona files under `business-architecture/personas/` define each persona; this plan defines how we go and test them.

Standards.md §&ldquo;Persona Validation Status&rdquo; gates implementation work that depends solely on assumed personas. This plan is how we lift that gate.

---

## Current state (2026-05-26)

All 16 personas under `business-architecture/personas/` carry **Validation Status: Assumed**. None are yet Validated. That is honest, not a problem &mdash; the problem is that several near-term backlog items (#547, #573, #88, #563, #614) depend on persona-grounded decisions and the gate has not yet been lifted.

The two extended-design-conversation personas (`enterprise-data-architect`, `data-modeler`) are partially-grounded in a single SME (Nichole). They will move to Validated when corroborated by at least one additional practitioner; that bar is in the persona file already.

---

## Validation bar

A persona moves from `Assumed` to `Validated` when **at least one** of the following is true and recorded in the persona file:

1. At least one **structured interview** (recorded notes or transcript) with a real person who fits the persona profile, in a state or local government context, confirms the persona&apos;s goals, pain points, and critical insight without major contradictions.
2. At least one **direct observation** of someone in the role using a tool that solves a similar need (their current EA tool, a spreadsheet, a CMDB, etc.) corroborates the pains the persona claims.
3. For the two SME-conversation personas (`enterprise-data-architect`, `data-modeler`): one additional practitioner corroborates the SME&apos;s framing.

A single conversation moves a persona to Validated; the next conversations sharpen specifics, surface variations, and feed `feedback-log.md`.

If an interview **disconfirms** a major persona claim, the persona file is updated and a corresponding backlog issue is filed before any implementation work proceeds against that persona.

---

## Priority order

Sequenced by how many open or near-term backlog items each persona unblocks. Validating from the top of this list down has the highest leverage.

### Tier 1 &mdash; gating multiple backlog items

| Persona | Backlog items currently dependent | Priority assumption(s) to test (see register) |
|---|---|---|
| **Elected Official** | #547 (public-read), #614 (slices already shipped), #556 epic descendants | GA-1, RT-1, RT-2, RT-3, RC-1, RC-2 |
| **Budget & Performance Analyst** | #563 (financial dimensions), #573 (DA quality), guided answers scope | GA-3, RT-2, RT-4, RC-3 |
| **Enterprise Architect (Central IT)** | #103 (feedback capture), #538 (duplicate-candidate report &mdash; already shipped, validation now retrospective), every repository-modelling decision | RM-1, RM-3, IN-1, IN-3 |
| **Agency EA Coordinator** | #538, #543 (cross-org seeding), federation work | RM-2, RM-5, IN-4 |

### Tier 2 &mdash; gating one backlog item or shaping next-quarter design

| Persona | Backlog items currently dependent | Priority assumption(s) |
|---|---|---|
| **Programme Director** | #87 (change notifications &mdash; substrate shipped, behavior validation), #88 (maturity assessment) | IN-1, IN-4 |
| **Domain Architect** | #581 (domain ownership &mdash; partial), open glossary/menu-language work | RM-4 |
| **Enterprise Data Architect** + **Data Modeler** | #573, #363 (DA metamodel conversation) | (corroborate SME framing &mdash; no register row yet, but the persona file&apos;s "Moves to Validated when" bar applies) |
| **Early-Maturity Practice Lead** | Starter-content + onboarding follow-ups (#587 descendants) | (no register row yet; record fresh assumptions from first interview) |

### Tier 3 &mdash; nice to validate, low gating risk

`Consultant / SI`, `Junior EA Analyst`, `Department Director`, `Business Stakeholder`, `Content Viewer`, `Instance Administrator`, `CMS Administrator`. These influence smaller surfaces or are validated indirectly when adjacent personas are interviewed.

---

## Interview pipeline

Use [`stakeholder-interview-guide.md`](./stakeholder-interview-guide.md) for stakeholder personas (Elected Official, Budget Analyst). Architect-side personas need their own guide; create one in the same shape when scheduling the first Tier 1 architect conversation.

**Recommended order for the next four conversations:**

1. **Elected Official or chief of staff** &mdash; test the staff-proxy hypothesis (GA-1, RT-1) before any further public-read or stakeholder-view work. Easiest to reach; biggest unknown.
2. **Budget & Performance Analyst** &mdash; test GA-3 (cost-centre / FTE / contract questions). If they don&apos;t map to GovEA&apos;s entity types, Budget-Analyst-targeted features need re-scoping before #563 starts.
3. **Central-IT Enterprise Architect (not the SME)** &mdash; test RM-1 (linkage-maintenance willingness) and IN-1 (where reconciliation pain actually lives). This is the single most consequential architect conversation for the repository-modelling and integration tracks.
4. **Agency EA Coordinator** &mdash; test RM-2 (recognition in central catalogue) and RM-5 (whether &ldquo;capability&rdquo; reads as jargon). Pairs well with #538 / federation conversations.

Each session is 30&ndash;45 minutes. Take notes on **surprises** &mdash; disconfirming an assumption is more valuable than confirming one.

---

## After each interview

1. **Update the persona file.** Change `Validation Status: Assumed` to `Validation Status: Validated` only if the bar above is met, and add a one-line note: who, when, what was confirmed or disconfirmed. Keep the prior `Assumed` paragraph (for history); append the new Validated line above it.
2. **Update [`stakeholder-assumption-register.md`](./stakeholder-assumption-register.md).** Each P1/P2 row that was tested gets a new column entry: `Validated`, `Disconfirmed`, or `Unclear`. Disconfirmed rows fire a backlog issue (next step).
3. **File backlog issues** for any disconfirmed assumption whose feature is shipped or in flight. The issue title should start with `validation:` so they group cleanly.
4. **Log a row in [`feedback-log.md`](../../business-architecture/feedback-log.md).** Date, persona, feature, what didn&apos;t fit, action taken.

---

## Exit criteria for #384

This issue is done when:

- [ ] Tier 1 personas have an interview scheduled or a documented reason they can&apos;t be (e.g. no candidate in network).
- [ ] At least the riskiest assumption per Tier 1 persona (RC-1, RT-2, GA-3, RM-1, IN-1) is marked Validated, Disconfirmed, or Unclear in the register.
- [ ] `feedback-log.md` has at least one real entry per recently-shipped analysis/reporting surface (see the file&apos;s scope section).
- [ ] Any Disconfirmed P1 has a backlog issue filed before the next product-priorities grooming.

The current PR (the one introducing this document) is a **preparation slice only** &mdash; it ships the plan, the register extension, and the empty feedback log structure. The interviews themselves are a human task that closes the rest of #384.

---

## Why this is not in the app

Per #384&apos;s explicit instruction, the in-app feedback capture (Phase 2 of #103) is **out of scope** for this issue. The Phase 1 manual log under `business-architecture/feedback-log.md` is the operating surface until #103 Phase 2 lands. Do not duplicate the future in-app affordance work here.