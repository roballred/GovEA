# Capability: Front-end Display

## What It Does
The system must present published content to users in a way that is clear, navigable, and useful without EA training — on any device, with or without a login depending on agency configuration.

## Personas
- **Content Viewer** — the primary user of all front-end display capabilities; expects to find information quickly and trust that it is current
- **CMS Administrator** — configures public vs. authenticated access; monitors the front-end experience

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Content Display | [fd-content-display.md](./fd-content-display.md) | Render published content in plain-language, readable layouts |
| Navigation | [fd-navigation.md](./fd-navigation.md) | Menus, breadcrumbs, and consistent site structure |
| Relationship Navigation | [fd-relationship-navigation.md](./fd-relationship-navigation.md) | Traverse links between applications, capabilities, and personas |
| Portfolio Views | [fd-portfolio-views.md](./fd-portfolio-views.md) | Curated overviews: capability map, application portfolio, persona directory, ADR list |
| Responsive Layout | [fd-responsive-layout.md](./fd-responsive-layout.md) | Works on any device without horizontal scrolling or zooming |
| Public & Authenticated Views | [fd-public-authenticated-views.md](./fd-public-authenticated-views.md) | Control what requires login vs. what is publicly accessible |
| Theming | [fd-theming.md](./fd-theming.md) | Theme selection, agency branding, and content rendering customization |

## Rules
- Only published content is ever visible to Viewers — workflow state is the gate
- Core content must render without JavaScript — progressive enhancement only
- Front-end display must be usable by non-technical users without training

## Links
- Depends on: IAM, Content Management
