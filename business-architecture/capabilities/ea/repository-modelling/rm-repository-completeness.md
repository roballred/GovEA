# Capability: Repository Completeness

## What It Does

The system must continuously signal the health and completeness of the EA object store — showing architects and administrators exactly what is missing, what is stale, and what level of confidence a viewer should place in the repository at any point in time.

A repository where everything appears equally authoritative — regardless of whether it was updated last week or three years ago — is a repository people stop trusting. Completeness signals turn the unknown unknowns into known gaps.

## Implementation Status

**Scaffolded.** Basic coverage signals (entity counts and needs-attention summaries) are surfaced on the Admin Dashboard. The full completeness workflow described in this document — drill-down views, trend lines, domain scoring, publication controls, and staleness thresholds — is not yet implemented. This document is the design specification for that future build.

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
- Allow the Admin to set a **completeness target** per capability domain (e.g., "80% of capabilities linked to at least one application"); the dashboard shows RAG progress toward each target rather than a raw score in isolation — green ≥ target, amber within 15 points below target, red more than 15 points below
- Surface a **"most-needed actions" list** — the top 5 specific objects whose update would most improve the overall completeness score, shown only to Contributors and Admins; this gives architects a concrete starting point rather than a wall of signals to triage. Staleness warnings from this list also feed into the unified priority signal summary on the admin dashboard (see `rm-architecture-debt` for the unified view definition)
- **Completeness publication** (opt-in, off by default):
  - Admin explicitly enables completeness publication in org settings; it is off by default
  - A configurable publication threshold must be set before enabling publication (default 50%; configurable 25–100%); the summary is suppressed automatically if the overall score drops below the threshold
  - The published view shows **plain-language status labels** by default, not raw percentages: `actively maintained` (≥75%), `under development` (40–74%), `getting started` (<40%); admins may optionally enable raw percentage display for authenticated viewers
  - An optional **admin-authored narrative field** allows admins to contextualise the label in plain language (example: "We launched our EA practice in January — this score reflects a practice in its first year, not an architecture in disrepair"); this narrative appears alongside the label in the published view
  - Separate publication controls for authenticated internal viewers and unauthenticated (public) audiences; by default only authenticated users may see the completeness summary

## Rules

- Completeness metrics are calculated at the organization level; cross-org completeness is not exposed across federation boundaries
- The published completeness summary (visible to Viewers) must show only the plain-language label and optional narrative — the drill-down list of incomplete objects is never published; incomplete drafts must not be surfaced to readers
- Staleness is calculated from the last-modified date of the published version, not the draft; updating a draft does not reset the staleness clock until published
- An object with no published version does not contribute to completeness scores — it simply does not exist from the repository's perspective
- Completeness publication is opt-in and off by default; enabling it requires an explicit admin action and a publication threshold to be configured
- Unauthenticated (public) audiences never see completeness summaries unless the admin explicitly enables public visibility as a separate step from enabling authenticated-viewer publication; the two controls are independent
- If the completeness score falls below the configured publication threshold after publication has been enabled, the summary is automatically suppressed until the score recovers; Admins are notified when this occurs

## Implementation Notes

- The admin dashboard (`ac-admin-dashboard`) already surfaces system health and basic content counts; this capability extends it with EA-specific completeness signals
- **Query performance:** Completeness calculations use pre-computed snapshots triggered on write, not live joins. The dashboard reads a single snapshot row (< 500 ms SLO). The trend line reads from a time-series snapshot table with one row per org per day (36-month default retention). Required indexes on content and relationship tables are a pre-ship requirement. See `rm-query-performance-decision.md` for the full performance ADR (resolves ARB finding #134).

## Links

- Depends on: `ac-admin-dashboard`, `cm-content-relationships`, `po-capability-map`, `po-application-portfolio`
- Related: `rm-architecture-debt`, `rm-end-to-end-traceability`
