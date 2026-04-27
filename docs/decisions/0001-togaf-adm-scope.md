# ADR-0001: TOGAF and ADM Scope Boundary

**Status:** Accepted  
**Date:** 2026-04-26  
**Issue:** [#89](https://github.com/roballred/GovEA/issues/89)

---

## Context

GovEA is built on the [EasyEA](https://github.com/roballred/EasyEA) methodology — a lightweight, people-centered approach to enterprise architecture designed for state and local government practitioners. EasyEA deliberately avoids TOGAF's ADM phase structure in favour of a shorter feedback loop: start with personas, map capabilities to real user needs, and ship decisions incrementally.

TOGAF is, however, the dominant framework in government EA procurement. Market research across seven commercial EA tools found that all seven include TOGAF Governance and Architecture Review as a listed capability, and two tools (OrbusInfinity, Bizzdesign Horizzon) use TOGAF ADM enforcement as their primary government differentiator.

Three positions were considered:

- **Option A — Explicit out-of-scope.** GovEA is EasyEA-only. TOGAF is not supported.
- **Option B — Lightweight alignment.** TOGAF framework concepts are available as optional metadata labels. No ADM workflow enforcement.
- **Option C — TOGAF-structured workflow.** ADM phase tracking as a content workflow variant.

---

## Decision

**GovEA adopts Option B: TOGAF as an optional, org-level overlay with no ADM enforcement.**

Specifically:

1. **The EasyEA methodology is the default and the primary value proposition.** GovEA's workflow (personas → capabilities → decisions → roadmap) is EasyEA-based and is not subordinated to TOGAF concepts.

2. **A TOGAF Framework Overlay is available as an opt-in module.** Org admins can enable it. When enabled, contributors can tag capabilities and applications with TOGAF framework concept labels (e.g. Business Architecture, Application Architecture, Technology Architecture). This is annotation, not enforcement.

3. **ADM phase tracking is explicitly out of scope for v1 and v2.** There is no modelling of ADM phases (Preliminary, A through H, Requirements Management) as workflow states. There are no phase-gated approvals, phase transition rules, or ADM-structured dashboards. Implementing this would require validated demand from real government users who cannot adopt GovEA without it.

4. **The overlay is off by default.** New organisations see GovEA as a pure EasyEA tool. TOGAF labelling is available on request, not imposed.

---

## Rationale

**Against full ADM enforcement (Option C):**  
Research found that "TOGAF scaffolding can become a constraint — teams implementing all of TOGAF lose stakeholder patience before delivering value." The same tools that lead with TOGAF compliance are the ones government teams complain about being too heavy. GovEA's government positioning is strongest as the practitioner-first alternative, not as a lighter version of OrbusInfinity.

**Against complete exclusion (Option A):**  
Many government organisations have TOGAF in their procurement checklist or governance documentation even when they don't enforce it operationally. Refusing any TOGAF alignment creates unnecessary procurement friction. Optional framework labels satisfy the "TOGAF-aligned" checkbox without imposing the workflow overhead.

**For the opt-in overlay (Option B):**  
TOGAF practitioners can classify their GovEA content using familiar vocabulary without changing how GovEA works. EasyEA practitioners are unaffected — the overlay is invisible until an admin enables it. This preserves GovEA's simplicity as the default while removing a common objection.

---

## Consequences

- **Framework mapping UI** is available on capability and application detail pages when the overlay is enabled, allowing contributors to assign TOGAF concept labels and rationale.
- **An Application Landscape report** organised by TOGAF framework layer is available under Reports when the overlay is enabled.
- **No ADR, initiative, objective, or persona fields** will carry TOGAF ADM phase labels unless a future ADR explicitly extends this decision.
- **Any future ADM phase tracking** requires a separate ADR, a validated user need from at least two government organisations, and a design review before implementation begins.
- This ADR should be revisited if GovEA adoption data shows a significant segment of users who cannot proceed without ADM enforcement.

---

## Related

- [EasyEA methodology](https://github.com/roballred/EasyEA)
- [#245](https://github.com/roballred/GovEA/issues/245) — TOGAF framework overlay implementation
- [#89](https://github.com/roballred/GovEA/issues/89) — scope decision issue (closed by this ADR)
- EA Tools Market Research 2026, Section 4: Governance & Compliance
