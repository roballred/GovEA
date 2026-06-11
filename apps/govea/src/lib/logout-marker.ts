/**
 * Post-logout session-resurrection guard (#782).
 *
 * With JWT rolling sessions, a request that is in flight when the user signs
 * out carries a still-valid session cookie; Auth.js re-issues (rolls) the
 * cookie on that response, which lands AFTER logout's deletion and re-sets a
 * live session in the browser. The logout endpoint therefore drops a
 * timestamped marker cookie, and middleware rejects (and actively deletes)
 * any session token issued before the marker — a resurrected cookie can land
 * in the jar, but it can never be used.
 *
 * Edge-safe: pure arithmetic, no DB, no Node built-ins (middleware runs in
 * the edge runtime).
 */

export const LOGGED_OUT_MARKER_COOKIE = 'govea.logged-out-at'

/**
 * Must be ≥ the session maxAge (auth.config.ts: 24h) so every token minted
 * before the logout stays rejectable for its entire possible lifetime.
 */
export const LOGGED_OUT_MARKER_MAX_AGE_S = 60 * 60 * 24

/**
 * Tokens issued up to this long AFTER the marker are still rejected: a
 * racing roll can be processed server-side well after the logout request
 * (in-flight responses can take seconds under load or dev-mode compilation).
 * A genuine re-login is NOT subject to this window — events.signIn (auth.ts)
 * deletes the marker on every successful login, so the window only bites in
 * the degraded case where that deletion failed, and it self-heals after 60s.
 */
export const RESURRECTION_WINDOW_MS = 60_000

/**
 * True when a session token presented alongside a logged-out marker must be
 * treated as resurrected (issued before, or within the race window after,
 * the logout that set the marker).
 *
 * @param markerValue   raw cookie value (epoch ms as string), if present
 * @param issuedAtSeconds  the token's `iat` claim (epoch seconds)
 */
export function isResurrectedSession(
  markerValue: string | undefined,
  issuedAtSeconds: number | undefined,
): boolean {
  if (!markerValue) return false

  const loggedOutAtMs = Number(markerValue)
  // Corrupt marker: fail open rather than lock the browser out of every
  // session for the marker's lifetime.
  if (!Number.isFinite(loggedOutAtMs) || loggedOutAtMs <= 0) return false

  // A token with no iat alongside a marker is indistinguishable from a
  // pre-logout token — reject it.
  if (issuedAtSeconds === undefined) return true

  return issuedAtSeconds * 1000 < loggedOutAtMs + RESURRECTION_WINDOW_MS
}
