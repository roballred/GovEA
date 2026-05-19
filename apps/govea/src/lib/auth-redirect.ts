/**
 * Auth redirect utilities (#386)
 *
 * callbackUrl values arrive from query params and are controlled by NextAuth
 * or the browser — they should never send users back into auth/error routes
 * after a successful login.
 */

const AUTH_DEAD_ENDS = ['/login', '/error', '/api/auth']

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
