# Capability: Admin Dashboard

## What It Does
The system must provide administrators with an at-a-glance operational overview when they log in to the admin interface, showing the state of the architecture repository and where attention is needed next.

## Personas
- **CMS Administrator** — uses the dashboard as the starting point for their work session; monitors system health and content quality

## Behaviors
- Display coverage cards for core entity types with total counts
- Highlight entity types that still have draft or proposed content needing attention
- Show initiative counts by status
- Display recent activity from the audit log
- Surface domain-oriented summary information for capabilities where domain data exists

## Rules
- Dashboard data reflects near-real-time repository state
- Dashboard is visible to Admins only in v1
- Dashboard cards and summaries should link to the underlying management surfaces where practical

## Implementation Status
Partially implemented in the current product:
- Live coverage grid across the main EA entities
- "Needs Attention" summaries for draft-heavy areas
- Initiative status breakdown
- Recent activity feed
- Domain summary section

Not yet implemented:
- Broader system-health instrumentation
- Backup, email, and infrastructure status
- Full repository completeness scoring

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Content Workflow, Content Management — Content Relationships
- Related: Site Settings
