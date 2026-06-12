# ADR-0003: Middleware Reads Session Tokens; It Never Writes Session Cookies

**Status:** Accepted
**Date:** 2026-06-11
**Issues:** [#782](https://github.com/roballred/GovEA/issues/782), [#783](https://github.com/roballred/GovEA/pull/783), [#759](https://github.com/roballred/GovEA/issues/759)

---

## Context

GovEA uses Auth.js JWT sessions (rolling, 24h maxAge). Until #783, `src/middleware.ts` wrapped its handler in the Auth.js `auth()` helper, which both *decoded* the session for route protection and — when a token was due a refresh roll — *re-issued* the session cookie on the middleware's own response.

While fixing sign-out reliability (#759), a security race surfaced (#782): any response carrying a rolled session cookie that lands **after** logout's cookie deletion silently resurrects the session. Investigation showed the middleware itself was one of the emitters: its `auth()` wrapper appended a rolled `Set-Cookie` to responses *including the very redirects that were trying to delete the session*, overriding same-response deletions and producing `/login ↔ /auth-redirect` redirect loops. Because the roll only fires for tokens past the refresh threshold, the failures were timing- and user-dependent — the worst kind of intermittent.

Sign-out on a shared kiosk or public terminal — common in government offices — must be final. A logout that can be undone by an in-flight request is a security defect, not a UX bug.

## Decision

**Middleware decodes the session JWT read-only via `getToken` (checking both the plain and `__Secure-` cookie names) and never writes session cookies. Exactly two writers own the session cookie: the Auth.js endpoints under `/api/auth/*` (login, session refresh) and the logout route handler (deletion).**

Supporting decisions in the same seam:

1. **Logged-out marker.** Logout sets a `govea.logged-out-at` cookie (httpOnly, lifetime = session maxAge). Middleware rejects any session token issued before the marker (plus a 60-second grace window for late-landing rolled cookies) and actively deletes its cookies. `events.signIn` deletes the marker, so a genuine re-login is exempt by construction rather than by timing.
2. **`/api/auth/*` is excluded from the middleware matcher entirely** — those endpoints manage the session cookie themselves; running middleware over them reintroduces a second writer.
3. **`SessionProvider` window-focus refetch is disabled** — the app is server-session based; the provider exists only for the org switcher's `update()` call, and the focus refetch rolled cookies for nothing.

## Consequences

- **Middleware no longer extends session expiry on page navigation.** Sessions stay alive through the Auth.js session endpoint and server-side `auth()` calls (which run in the Node runtime and own the cookie legitimately). A user who only navigates server-rendered pages for 24 hours straight without any session-endpoint traffic would be signed out at maxAge — accepted as the correct trade for deterministic logout.
- Role, instance-role, and password-expiry checks in middleware read token claims directly instead of the derived session object. The claims are the same values the session callback derives from, but contributors editing the jwt callback must keep middleware-read claims populated.
- The resurrection guard depends on `events.signIn` clearing the marker. If that deletion ever fails, the 60-second window means a re-login inside it could be rejected once — self-healing, but worth knowing when debugging "logged out immediately after login" reports.
- E2E sign-out tests can assert the strong property (no live session cookie survives a click-initiated logout, even with in-flight refetches) — `tests/e2e/specs/logout.spec.ts` is the regression gate.

## Alternatives Considered

- **Keep the `auth()` wrapper and fight the race elsewhere** — rejected: the wrapper is itself an emitter; no amount of deletion ordering wins against a same-response re-set.
- **Server-side session denylist (jti blocklist)** — the fully general fix; rejected for now as heavyweight (a DB read on every request) while the marker + read-only middleware closes the observed attack surface. Revisit if session revocation requirements grow (e.g., admin-forced logout).
- **Switch to database sessions** — solves revocation but changes the session model wholesale; out of scope for a security fix and in tension with the edge-safe middleware requirement.
