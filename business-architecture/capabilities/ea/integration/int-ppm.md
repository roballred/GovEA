# Capability: PPM / Project Portfolio Integration

## What It Does

The system must connect EA roadmaps to funded programme portfolios — surfacing which initiatives have approved funding, which are on track, and which are at risk — so that architecture decisions are grounded in what the organisation is actually resourced to deliver.

The 2026 EA market research identifies PPM integration as a **critical gap** absent from most EA tools. EA roadmaps that do not trace to funded programmes are planning fiction: they show what architects wish were happening, not what the organisation has committed to paying for.

The specific pain this solves: government IT architects produce roadmaps disconnected from the programme management office. The PMO has a separate view of funded projects in Planview or MS Project. Neither tool knows what the other is doing. Architecture decisions get made without knowing whether the initiative that depends on them is funded, stalled, or cancelled.

## Implementation Status

**Not implemented.** This document is the design specification for that future work. This is the highest-priority Tier 2 integration for government EA deployments.

## Personas

- **Enterprise Architect (Central IT)** — needs to align the architecture roadmap with what the organisation has actually funded; without PPM integration, the roadmap is a wish list
- **Domain Architect** — needs to know which of the initiatives they are tracking have approved funding and PMO-confirmed delivery dates, so their architecture work is timed appropriately
- **Department Director** — needs assurance that the architecture timeline they see in GovEA reflects the same schedule the PMO is tracking, not a separate architect view that has drifted from programme reality

## Behaviors

- Connect GovEA Initiative records to PPM tool programme or project records:
  - Planview Enterprise One / Portfolios — primary government target
  - Clarity PPM (Broadcom)
  - Microsoft Project Online / Project for the Web
- Surface on each linked GovEA Initiative: funding status, approved budget, PPM-reported delivery date, current RAG status, and programme manager
- Flag initiatives in GovEA that are marked as active but whose PPM counterpart is on hold, cancelled, or has no approved funding
- Flag PPM programmes with an architectural impact (linked to capabilities in GovEA) that have no corresponding GovEA Initiative — programmes happening outside the architecture view
- Update the GovEA roadmap grid to reflect PPM-confirmed delivery dates alongside architect-authored target dates; show both where they diverge

## Rules

- PPM integration is read-only from GovEA; GovEA does not update programme records in the PPM tool
- Funding amounts are surfaced in GovEA for context but are not the authoritative financial record — the PPM tool remains authoritative
- Confidential programme records (e.g., commercial-in-confidence funding amounts) can be excluded from the sync via programme-level tags configured in the PPM tool
- Links between GovEA Initiatives and PPM programmes are created by Contributors or Admins; the system does not auto-link without confirmation

## Implementation Notes

- Planview REST API is the primary integration target for government; MS Project Online Graph API is a secondary target
- A government deployment may operate GovEA and the PPM tool under different identity providers; the integration layer must support service-account authentication independent of the user SSO session
- Budget data handling must comply with any government data classification requirements that apply to programme financial information

## Links

- Depends on: `pl-initiatives`, `pl-roadmap`, `pl-strategic-objectives`
- Related: `int-erp-financial.md`, `int-devops.md`
