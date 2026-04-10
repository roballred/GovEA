# Capability: Repository Completeness

## What It Does

The system must continuously signal the health and completeness of the EA object store — showing architects and administrators exactly what is missing, what is stale, and what level of confidence a viewer should place in the repository at any point in time.

A repository where everything appears equally authoritative — regardless of whether it was updated last week or three years ago — is a repository people stop trusting. Completeness signals turn the unknown unknowns into known gaps.

## Personas

- **Enterprise Architect (Central IT)** — needs to report the state of the enterprise capability map with honesty; a completeness view allows them to say "we have 80% of capabilities mapped to at least one application" rather than making claims that can be challenged; currently has no mechanism to produce this picture without manual audit
- **Agency EA Coordinator** — needs to know which parts of their agency's architecture are genuinely documented and which are placeholder content; completeness signals guide where to focus maintenance effort
- **CMS Administrator** — needs a single operational view showing repository health alongside system health; currently the admin dashboard shows system status but not content quality

## Behaviors

- Display a completeness dashboard showing, for each object type (Capabilities, Applications, Personas, ADRs, Initiatives, Objectives):
  - Total count
  - % published (visible to Viewers)
  - % with all required relationships complete (e.g., Capabilities linked to at least one Application and one Persona)
  - % updated within a configurable staleness window (default: 12 months)
- Drill down from any completeness metric to the specific objects that are incomplete, unpublished, or stale — clickable list, not just a percentage
- Show a trend line for each metric over time so that progress (or regression) is visible
- Surface a "completeness score" per capability domain — which areas of the architecture are well-maintained and which are gaps
- Allow the Admin to configure the staleness threshold (default 12 months; configurable to 3, 6, 12, or 24 months)
- Publish a read-only completeness summary to Viewers — showing high-level scores without exposing the drill-down list of incomplete objects (the gap list is internal; the score is publishable)

## Rules

- Completeness metrics are calculated at the organization level; cross-org completeness is not exposed across federation boundaries
- The published completeness summary (visible to Viewers) must show only aggregate scores, not the list of incomplete objects — incomplete drafts should not be surfaced to readers
- Staleness is calculated from the last-modified date of the published version, not the draft; updating a draft does not reset the staleness clock until published
- An object with no published version does not contribute to completeness scores — it simply does not exist from the repository's perspective

## Implementation Notes

- The admin dashboard (`ac-admin-dashboard`) already surfaces system health and basic content counts; this capability extends it with EA-specific completeness signals
- Completeness calculations require joining across object types and their relationship tables — performance implications should be evaluated before implementation
- The trend line feature requires storing historical completeness snapshots; decide before implementation whether these are computed at query time or stored at a scheduled interval

## Links

- Depends on: `ac-admin-dashboard`, `cm-content-relationships`, `po-capability-map`, `po-application-portfolio`
- Related: `rm-architecture-debt`, `rm-end-to-end-traceability`
- Personas served: Enterprise Architect, Agency EA Coordinator, CMS Administrator
