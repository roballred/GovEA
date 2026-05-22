# Capability: BI & Analytics Platform Integration

## What It Does

The system must expose EA repository data to enterprise analytics platforms — Power BI, Tableau, Qlik — so that EA insights can be sliced, visualised, and embedded in the dashboards that leadership already uses, without requiring manual data exports.

The 2026 market research shows BI integration is partially available in LeanIX and ABACUS only. Most tools require manual export to spreadsheets before any custom analysis is possible. This forces EA teams to maintain two workflows: one for the repository and one for the analytics that justify EA's value.

The specific pain this solves: a Department Director asks for a capability heat map coloured by application risk. The EA team can produce it — but only by exporting data to Excel, running pivot tables, and recreating a Power BI report manually. Every time the repository changes, the report is wrong until someone repeats the export.

## Implementation Status

**Not implemented.** This document is the design specification for that future work.

## Personas

- **Enterprise Architect (Central IT)** — needs to feed EA data into existing enterprise analytics without running a separate export workflow after every repository update
- **Budget & Performance Analyst** — needs EA data (capability-to-application mapping, application risk, cost by domain) accessible in the analytics platform they already use for portfolio reporting
- **Department Director** — needs EA insights in the dashboard they check, not in a separate EA tool they are not logged into

## Behaviors

- Expose a read-only analytical dataset from GovEA consumable by BI platforms:
  - Power BI Dataset / Power BI connector (primary government target)
  - Tableau Web Data Connector
  - Generic OData feed for Qlik and other standards-compliant BI tools
- Dataset includes: Applications, Capabilities, Personas, Services, Objectives, Initiatives, ADRs, and relationship junction tables, with all non-sensitive metadata fields
- Dataset refreshes on a configurable schedule (default: nightly); on-demand refresh available to Admin
- Enable pre-built report templates: GovEA ships a set of starter Power BI report templates (capability heat map by risk, application portfolio by lifecycle status, initiative progress by capability domain) that connect to the GovEA dataset out of the box
- Support row-level security: BI consumers see only the data their GovEA role permits — Viewer-equivalent filters apply to the dataset, preventing non-authenticated BI access from surfacing draft or org-only content

## Rules

- The analytical dataset is read-only; no BI platform can write back to GovEA through the dataset connection
- Content visibility rules (draft vs. published, org vs. instance visibility) apply to the dataset: draft content never appears in the analytical export
- The dataset connection requires an API token scoped to a service account, not an individual user credential; token rotation is managed in org-level settings
- The dataset must not include personally identifiable information beyond name and role; user email addresses and authentication details are excluded from the analytical export

## Implementation Notes

- Power BI's semantic model (formerly SSAS) allows GovEA data to be exposed as a live DirectQuery source rather than an imported dataset; this is preferred for large estates where daily import would be slow
- The OData standard provides the broadest BI tool compatibility and should be the underlying protocol for all connectors, with Power BI and Tableau providing connector wrappers on top
- Row-level security at the BI layer requires either dataset-level filtering (simpler, enforced at export time) or report-embedded access tokens (more complex, enforced at query time); dataset-level filtering is the v1 target

## Links

- Depends on: `po-application-portfolio`, `po-capability-map`, `pl-strategic-objectives`, `pl-initiatives`, `ac-admin-dashboard`
- Related: `int-rest-api.md`
