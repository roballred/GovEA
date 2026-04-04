# Capability: Responsive Layout

## What It Does
The system must render correctly on any screen size — desktop, tablet, and mobile — without requiring the user to install software or zoom and scroll horizontally.

## Personas
- **Content Viewer** — may access the site from a phone or tablet, particularly elected officials and external partners who are rarely at a desk

## Behaviors
- Adapt layout and navigation for desktop, tablet, and mobile screen sizes
- Stack content vertically on small screens rather than truncating or overflowing
- Collapse navigation into a mobile-friendly menu on small screens
- Render tables and data views in a scrollable container on small screens rather than cutting off content
- Maintain readable font sizes and touch-friendly tap targets on mobile

## Rules
- No horizontal scrolling on content pages at any standard screen width
- Core content must be readable without pinch-to-zoom on a standard mobile screen
- Responsive behavior is handled via CSS — no separate mobile site or user-agent detection

## Links
- Depends on: Content Display, Navigation
- Related: Portfolio Views, Public & Authenticated Views
