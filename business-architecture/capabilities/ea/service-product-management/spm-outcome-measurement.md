# Capability: Outcome Measurement

## What It Does

Each service records the outcomes it is supposed to produce and how it is doing against them — adoption, completion rate, satisfaction, cost-to-serve, or whatever the org agrees matters. Today performance conversations about services run on anecdote and complaint volume; this capability gives the Service Owner an agreed measuring stick and gives leadership a plain-language answer to "is this service working?"

This is deliberately *measurement bookkeeping*, not analytics: GovEA records what the outcomes are, their current asserted values, and when they were last reviewed. Live metric pipelines are integration work (int-bi-analytics), not repository work.

## Personas

- **Service Owner** — defines outcomes with their leadership, updates values at review cadence, brings the record to budget conversations
- **Department Director** — reads outcome health without needing the underlying dashboards
- **Elected Official** — sees whether the services constituents depend on are working, in plain language
- **Budget & Performance Analyst** — connects outcome evidence to funding decisions

## Behaviors

- Define named outcomes per service with a target, a current value, and a review cadence
- Record outcome reviews (value, date, reviewer) so the trend and the staleness are both visible
- Roll outcome health up to the service record in plain language (on track / needs attention / stale)
- Flag outcomes whose review date has lapsed rather than letting them silently age

## Rules

- Outcome values are asserted by the owner with provenance, never silently imported — automated feeds come later via integration and must be labeled as such
- A service with no outcomes is a visible portfolio signal, not an error
- Outcome definitions and values respect service visibility — org-private services never leak performance data through reports
- Plain language is mandatory at the report surface: targets and values, not KPI jargon

## Implementation Status

**Not implemented.** No outcome structures exist. The working assumption is to follow the completeness-signals/scorecard pattern already shipped for repository quality (#380) and designed for model quality (#573); budget linkage waits on #563. Gated on persona validation (#668).

## Links

- Depends on: Portfolio — Services (po-services), Service Ownership (spm-service-ownership)
- Enables: Service Portfolio Health (spm-service-portfolio-health), Executive-facing reporting
- Related: Integration — BI & Analytics (int-bi-analytics), Planning — Strategic Objectives (pl-strategic-objectives)
