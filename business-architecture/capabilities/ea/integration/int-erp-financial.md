# Capability: ERP & Financial System Integration

## What It Does

The system must connect application portfolio records to financial actuals — surfacing what each application costs the organisation to run — so that rationalisation decisions and investment cases are grounded in real numbers rather than estimates.

The 2026 market research shows ERP and financial integration is largely absent from EA tools. Only SAP-native platforms provide it, and only for SAP customers. Government EA practitioners routinely produce application portfolio analyses with no cost data, because the cost data lives in financial systems the EA tool cannot reach.

The specific pain this solves: an architect presenting an application rationalisation case cannot say what consolidating two applications would save, because nobody has linked the application records to the cost centres and budget lines that fund them. The financial analysis is always done separately, in spreadsheets, after the architecture work is finished.

## Implementation Status

**Not implemented.** This document is the design specification for that future work.

## Personas

- **Enterprise Architect (Central IT)** — needs cost data attached to application records to produce credible rationalisation cases; currently this requires separate financial analysis that takes weeks
- **Budget & Performance Analyst** — needs to see the cost of the technology portfolio aligned to capability outcomes; currently technology spend and capability benefit are in separate systems with no shared identifier
- **Department Director** — needs to understand what their department's applications cost, not just what they do; decisions about consolidation or replacement require financial context

## Behaviors

- Connect Application records in GovEA to cost lines in ERP or financial systems:
  - SAP S/4HANA (primary for large government organisations)
  - Oracle Financials / Oracle ERP Cloud
  - Workday Financial Management
  - Generic GL/Cost Centre import via CSV or API for organisations without a listed ERP
- Surface on each linked Application record: annual run cost, last-reported cost period, cost centre owner, and cost category (licence, infrastructure, support, development)
- Aggregate cost across capability domains: total portfolio cost by domain, surfaced on the capability map and the admin dashboard
- Surface cost in the application risk portfolio view: retiring applications whose run cost exceeds a configurable threshold are flagged for urgent rationalisation attention
- Enable cost-per-capability analysis: sum the run cost of all applications linked to a capability, so the EA team can answer "what does this capability cost us to deliver?"

## Rules

- Financial data is read-only in GovEA; GovEA does not write back to ERP or financial systems
- Cost data is surfaced only to Admin and Contributor roles by default; a per-org setting allows Viewers to see cost summaries (off by default)
- Cost data is never exposed to Viewers in the plain-language stakeholder view without explicit Admin enablement
- Currency and fiscal year conventions are configurable per org
- If cost data is older than one fiscal year, it is marked as stale and displayed with a warning; architects should not rely on cost estimates from a prior budget cycle without confirmation

## Implementation Notes

- Many government ERP deployments are on-premises or in GovCloud; integration must support both SaaS API and on-premises API endpoints
- CSV/spreadsheet import is a required fallback for organisations that cannot expose ERP APIs to an external system — this covers a significant portion of the state and local government market
- Cost aggregation queries across the application portfolio must be performant at realistic estate sizes (500–5,000 application records); pre-computed cost summaries are preferred over live joins

## Links

- Depends on: `po-application-portfolio`, `po-capability-map`, `ac-admin-dashboard`
- Related: `int-ppm.md`, `int-rest-api.md`
