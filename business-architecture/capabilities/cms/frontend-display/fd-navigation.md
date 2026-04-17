# Capability: Navigation

## What It Does
The system must provide clear, consistent navigation so that users can find content without knowing the structure of the repository in advance.

## Personas
- **Content Viewer** — uses navigation as the primary way to orient themselves and move between sections of the site

## Behaviors
- Display a primary navigation menu with links to the top-level sections available to the current organization
- Show breadcrumbs on all content pages so users know where they are
- Provide a back navigation path from detail views to list views
- Display the current section clearly in the navigation so users know where they are
- Support navigation via keyboard for accessibility
- Hide disabled modules from navigation for all users in the organization
- Apply navigation behavior consistently across desktop and mobile shells

## Rules
- Navigation must reflect the published content structure — no broken links to unpublished content
- Navigation must be consistent across all pages
- Navigation must be usable on mobile without a horizontal scroll
- If a module is disabled for the organization, direct navigation to its route should fail closed rather than exposing the page shell

## Links
- Depends on: Content Management — Content Workflow
- Related: Content Display, Portfolio Views, Responsive Layout
