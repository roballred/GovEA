# Capability: Admin Dashboard

## What It Does
The system must provide administrators with an at-a-glance overview of system health, content status, and repository completeness when they log in to the admin interface.

## Personas
- **CMS Administrator** — uses the dashboard as the starting point for their work session; monitors system health and content quality

## Behaviors
- Display counts of content items by type and workflow state (draft, published, archived)
- Highlight content items with broken required relationships (e.g. Applications with no linked Capability)
- Display recent activity — last 10 content changes with author and timestamp
- Show user account summary — total users, active users, users by role
- Display lifecycle risk summary — Applications in aging, sunset, or decommissioned status
- Show system status — database connectivity, last backup timestamp
- Display content completeness summary — percentage of published content items with all recommended fields populated, broken down by content type

## Rules
- Dashboard data reflects real-time state — no stale cache
- Dashboard is visible to Admins only in v1
- Broken relationship alerts are actionable — clicking through takes the Admin to the affected content item

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Content Workflow, Content Management — Content Relationships
- Related: Site Settings
