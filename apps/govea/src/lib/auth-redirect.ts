/**
 * Auth redirect utilities (#386, #520, #548)
 *
 * callbackUrl values arrive from query params and are controlled by NextAuth
 * or the browser — they should never send users back into auth/error routes
 * after a successful login.
 */

import type { Role } from './rbac'

const AUTH_DEAD_ENDS = ['/login', '/error', '/api/auth']

/**
 * Default landing path for a freshly-signed-in user when no explicit
 * `callbackUrl` was provided.
 *
 * Routing rule:
 *   1. Instance admins → `/instance` (platform-admin console; #520)
 *   2. Viewers → `/executive` (stakeholder-friendly entry; #548). The admin
 *      `/dashboard` is too dense to function as a non-authoring reader landing.
 *   3. Everyone else → `/dashboard`
 */
export function defaultLandingPath(opts: { role: Role; isInstanceAdmin: boolean }): string {
  if (opts.isInstanceAdmin) return '/instance'
  if (opts.role === 'viewer') return '/executive'
  return '/dashboard'
}

/**
 * Post-login destination once membership context is known (#800).
 *
 * Users with more than one active membership choose their workspace on
 * /select-org before landing; everyone else goes straight to their
 * role-based landing. Instance admins keep landing on /instance — their
 * org choice happens via the in-shell switcher when they enter the agency
 * portal. An explicit safe callbackUrl is handled by the caller and always
 * wins over selection (deep links must not detour through a picker).
 */
export function postLoginDestination(opts: {
  role: Role
  isInstanceAdmin: boolean
  activeMembershipCount: number
}): string {
  if (opts.isInstanceAdmin) return '/instance'
  if (opts.activeMembershipCount > 1) return '/select-org'
  return defaultLandingPath(opts)
}

/**
 * Returns a safe post-login destination, falling back to `fallback` if the
 * supplied URL would trap the user in an auth or error route.
 *
 * The default fallback is `/dashboard`. Login page call sites that want
 * role-aware routing should pass `/auth-redirect` explicitly — that bouncer
 * sends instance admins to `/instance` and everyone else to `/dashboard`.
 *
 * Rules:
 *  - Must start with '/' (relative, no external redirects)
 *  - Must not start with /login, /error, or /api/auth
 */
export function safeCallbackUrl(url: string | undefined | null, fallback = '/dashboard'): string {
  if (!url) return fallback
  if (!url.startsWith('/') || url.startsWith('//')) return fallback
  if (AUTH_DEAD_ENDS.some(p => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`))) return fallback
  return url
}
