# Capability: DevOps Tool Integration

## What It Does

The system must connect EA architecture records to the delivery pipeline — surfacing which applications are actively being changed, which capabilities are under development, and which architecture decisions are being validated or violated in real sprints. Without this, architecture and delivery operate on separate timescales: architects produce roadmaps, and delivery teams work in two-week cycles that the roadmap never reflects.

The specific pain this solves: architects discover that delivery has already built or changed something architecturally significant only when the sprint is done. This capability makes EA an active participant in delivery, not a post-hoc documentation exercise.

## Implementation Status

**Not implemented.** No DevOps tool connectors exist. This document is the design specification for that future work.

## Personas

- **Domain Architect** — needs to know which active initiatives are producing code against which capabilities; currently learns about this informally or not at all
- **Enterprise Architect (Central IT)** — needs to see which in-flight programmes are creating new applications or modifying existing ones, so that architectural standards and ADRs remain relevant to active work
- **Agency EA Coordinator** — needs to connect initiative records in GovEA to the actual work being done in Jira or Azure DevOps, not just what was planned

## Behaviors

- Link a GovEA Initiative or Application record to one or more Jira projects, Azure DevOps projects, GitHub repositories, or GitLab projects
- Surface on the linked record: active sprints, open epics, recent deployments, and repository activity in the past 30 days
- Flag initiatives in GovEA that are marked as active but show no delivery activity in the linked DevOps project in the past 60 days — potential stalled programmes
- Flag applications with recent deployment activity that have no linked initiative in GovEA — delivery happening outside the EA roadmap
- Surface Architecture Decision Record (ADR) references: when an ADR is mentioned in a commit message, PR title, or issue description (by ADR number or slug), link that activity to the corresponding GovEA ADR record
- Provide a delivery activity feed on the application detail page — a reverse-chronological list of deployments, merged PRs, and sprint completions from linked repositories

## Rules

- DevOps integration is read-only from GovEA's perspective: GovEA surfaces delivery data but does not write back to project management tools
- Links between GovEA records and DevOps projects are created by Contributors or Admins, not auto-discovered; the system suggests matches but does not create links without confirmation
- Delivery activity data is not stored permanently in GovEA; it is fetched on-demand or cached with a configurable TTL (default: 4 hours)
- ADR reference detection uses structured patterns (`ADR-001`, `adr/auth-token-storage`) only — it does not scan commit text for semantic similarity
- Access to linked DevOps projects requires OAuth or PAT credentials configured per org; the system does not expose those credentials in any API response

## Implementation Notes

- Jira REST API and Azure DevOps REST API are the primary targets; GitHub API and GitLab API are secondary
- ADR slug detection requires a consistent naming convention in the GovEA ADR record; this convention should be documented as part of the ADR authoring guidance
- Delivery activity feed is a read-through cache, not a persisted data store — this limits storage impact and avoids staleness without complex sync logic

## Links

- Depends on: `po-application-portfolio`, `pl-initiatives`, `po-architecture-decisions`
- Related: `int-itsm-cmdb.md`, `int-rest-api.md`
