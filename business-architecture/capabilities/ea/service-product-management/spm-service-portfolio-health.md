# Capability: Service Portfolio Health

## What It Does

The portfolio-level read across all services: lifecycle distribution, ownerless services, stale outcomes, and missing discovery evidence — in one view a Department Director or EA Coordinator can act on. The application portfolio already has this kind of surface; services, the things constituents actually experience, currently have nothing comparable. This capability makes the service estate legible the way the application estate already is.

## Personas

- **Department Director** — the primary reader: where is the service portfolio aging, what has no owner, what needs investment attention
- **Agency EA Coordinator** — uses the health view to direct repository and architecture effort to the services that need it
- **Elected Official** — high-level: what services exist for whom, and are they healthy, in plain language
- **Service Owner** — sees their service in portfolio context — and sees what "good" looks like across peers

## Behaviors

- Summarize the service portfolio by lifecycle stage, ownership coverage, outcome health, and discovery freshness
- Drill from any portfolio signal to the affected service records (the completeness drill-down pattern, #380)
- Ship as a report preset over the generic report engine where possible, rather than a bespoke page
- Respect role and visibility: viewers see published, viewer-safe content only; org-private services never appear cross-org

## Rules

- Health signals derive from data the other sub-capabilities record — this view computes, it never edits
- An empty or sparse portfolio renders an honest empty state, not fabricated health
- Signals are explainable: every flag states what it means and what would clear it, in plain language
- No ranking of owners or teams — the view directs attention to services, it is not a performance league table

## Implementation Status

**Not implemented.** Depends on lifecycle (spm-product-lifecycle), structured ownership (spm-service-ownership), and outcomes (spm-outcome-measurement) existing first; the report-engine presets (#673 family) and completeness drill-down pattern (#380) are the shipped substrate it would build on. Gated on persona validation (#668).

## Links

- Depends on: Product Lifecycle (spm-product-lifecycle), Service Ownership (spm-service-ownership), Outcome Measurement (spm-outcome-measurement)
- Enables: Executive and stakeholder reporting over the service estate
- Related: Repository completeness drill-downs (#380), group-by-taxonomy report engine (#673), Application Portfolio (po-application-portfolio)
