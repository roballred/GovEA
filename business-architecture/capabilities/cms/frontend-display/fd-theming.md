# Capability: Theming

## What It Does
The system must allow administrators to control the visual presentation of the authenticated product through built-in themes, while allowing individual users to choose light or dark mode for their own session. Agencies should be able to align the tool with their branding standards without turning routine appearance changes into a code task.

## Personas
- **CMS Administrator** — selects and configures themes; applies agency branding
- **Content Viewer** — experiences the themed front-end; expects a consistent, professional appearance

## Behaviors
- Select an active organization theme from the settings UI
- Apply theme changes immediately in the authenticated shell
- Preserve the selected theme across reloads
- Allow each authenticated user to toggle light or dark mode independently of the org theme
- Preserve dark-mode preference in local storage and restore it before first paint

## Rules
- GovEA ships with a default theme that meets accessibility standards (WCAG 2.1 AA minimum)
- Theme changes take effect immediately without a restart
- Org theme selection is Admin-managed
- Per-user dark mode is user-managed and must not override org branding choices such as sidebar and header identity
- Theme customization via the admin UI is limited to safe options — arbitrary CSS injection is not exposed to Contributors
- Only Admins can manage themes

## Implementation Status
Implemented in the current product:
- Built-in organization theme selection in settings
- Immediate shell updates when switching themes
- Per-user dark mode toggle in the authenticated header
- Preference persistence for both org theme and per-user mode selection

## Links
- Depends on: Admin & Configuration — Site Settings, IAM — Role-Based Access Control
- Related: Content Display, Responsive Layout, Public & Authenticated Views
