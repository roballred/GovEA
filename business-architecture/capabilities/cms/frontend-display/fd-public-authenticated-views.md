# Capability: Public & Authenticated Views

## What It Does
The system must allow administrators to control whether content requires a login to view or is publicly accessible without authentication. This supports agencies that want to share their EA work openly with the public.

## Personas
- **CMS Administrator** — configures which content or sections are public vs. login-required
- **Content Viewer** — may access public content without logging in; logs in via SSO or local credentials to access restricted content

## Behaviors
- Configure the site to require login for all content (default) or allow public access to published content
- Allow SSO sign-in from the front-end without navigating to a separate admin login page
- Redirect unauthenticated users to the login page when they attempt to access login-required content
- After login, redirect the user back to the page they originally requested
- Display a sign-in link in the navigation when the site has public content and the user is not logged in
- Display the logged-in user's name and a sign-out link when authenticated

## Rules
- Public access is opt-in — the default configuration requires login for all content
- Public access never exposes draft or archived content — only published content
- Authentication state must persist across page navigation without re-prompting
- SSO sign-in on the front-end uses the same provider configured in IAM — no separate configuration

## Implementation Status
- **v1:** Public access is not yet implemented. The middleware enforces authentication for all routes. This is the correct default behavior until the org-level public access toggle is built.
- **v1 scope:** The opt-in public access toggle, front-end SSO sign-in link, and post-login redirect are deferred to a future issue.

## Links
- Depends on: IAM — Local Authentication, IAM — SSO Authentication, IAM — Role-Based Access Control
- Related: Navigation, Content Display, Portfolio Views
