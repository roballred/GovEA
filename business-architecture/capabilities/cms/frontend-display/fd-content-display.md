# Capability: Content Display

## What It Does
The system must render published content items in a clear, readable layout that non-technical users can understand without EA training or a manual.

## Personas
- **Content Viewer** — reads content items to answer questions about the organization's applications, capabilities, and personas

## Behaviors
- Display a published content item with all its fields rendered in a human-readable layout
- Show field labels in plain language — not internal field names or technical identifiers
- Display the last published date so viewers know the content is current
- Show the content type clearly so viewers understand what they are looking at
- Render rich text fields with formatting intact
- Display taxonomy tags with links to filtered views of the same term
- Show related content items with links to navigate to them

## Rules
- Only published content is ever rendered for Viewers — draft and archived content returns a 404
- Field labels and content must not expose internal system identifiers or technical metadata
- Content display must not require JavaScript to render — core content is server-rendered

## Links
- Depends on: Content Management — Content Authoring, Content Management — Content Workflow
- Related: Navigation, Relationship Navigation, Responsive Layout
