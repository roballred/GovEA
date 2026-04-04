# Capability: Theming

## What It Does
The system must allow administrators to control the visual presentation of the front-end and admin interface through themes — without writing code for routine customization. Agencies should be able to align the tool with their branding standards.

## Personas
- **CMS Administrator** — selects and configures themes; applies agency branding
- **Content Viewer** — experiences the themed front-end; expects a consistent, professional appearance

## Behaviors
- Select an active front-end theme from available installed themes
- Select an active admin theme independently of the front-end theme
- Configure basic theme settings from the admin UI — primary color, font, logo placement
- Preview a theme before activating it
- Bundle and serve CSS and JavaScript assets efficiently — no manual asset pipeline management
- Support Liquid and Markdown templates for content rendering customization
- Allow placement configuration — control where content parts and fields render on a page without code

## Rules
- GovEA ships with a default theme that meets accessibility standards (WCAG 2.1 AA minimum)
- Theme changes take effect immediately without a restart
- Custom theme development is supported but not required — the default theme must be fully functional out of the box
- Theme customization via the admin UI is limited to safe options — arbitrary CSS injection is not exposed to Contributors
- Only Admins can manage themes

## OrchardCore Reference
- `OrchardCore.Themes` — theme management and switching
- `OrchardCore.Resources` — centralized script and stylesheet declaration
- `OrchardCore.Placements` — shape placement configuration
- `OrchardCore.Liquid` — Liquid template engine for content rendering
- `OrchardCore.Shortcodes` — shortcode processing in content

## Links
- Depends on: Admin & Configuration — Site Settings, IAM — Role-Based Access Control
- Related: Content Display, Responsive Layout, Public & Authenticated Views
