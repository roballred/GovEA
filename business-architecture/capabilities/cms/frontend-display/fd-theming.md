# Capability: Theming

## What It Does
The system must allow administrators to control the visual presentation of the product through supported themes without writing code for routine customization. Agencies should be able to align the tool with their branding standards within the boundaries of the shipped theme set.

## Personas
- **CMS Administrator** — selects and configures themes; applies agency branding
- **Content Viewer** — experiences the themed front-end; expects a consistent, professional appearance

## Behaviors
- Select an active theme from the available supported theme set
- Preview a theme before activating it
- Apply the selected theme without redeploying the application

## Rules
- GovEA ships with a default theme that meets accessibility standards (WCAG 2.1 AA minimum)
- Theme changes take effect immediately without a restart
- Theme customization via the admin UI is limited to supported theme selection — arbitrary CSS injection is not exposed to Contributors
- Only Admins can manage themes

## Current Scope
- Predefined theme selection is implemented
- Separate front-end/admin themes, arbitrary branding controls, and template-level rendering customization are future work

## Links
- Depends on: Admin & Configuration — Site Settings, IAM — Role-Based Access Control
- Related: Content Display, Responsive Layout, Public & Authenticated Views
