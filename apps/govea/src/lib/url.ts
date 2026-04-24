/**
 * URL validation utilities (#272)
 *
 * Glossary source URLs are stored contributor-supplied strings and later
 * rendered into <a href> attributes. Without scheme validation a malicious
 * contributor could store a javascript: URL and get script execution on click.
 *
 * Only https: and http: are permitted as web-link schemes. javascript:, data:,
 * and all other non-web schemes are rejected at write time and suppressed at
 * render time.
 */

const SAFE_SCHEMES = new Set(['https:', 'http:'])

/**
 * Validates and normalises a URL string for storage.
 *
 * - Returns `null` for empty / null input (optional fields are fine to omit).
 * - Returns the canonical URL string (`new URL().href`) on success.
 * - Throws a user-facing Error for malformed URLs or unsafe schemes.
 *
 * Call this on every contributor-supplied URL before writing to the DB.
 */
export function validateWebUrl(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === '') return null
  const trimmed = raw.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(`"${trimmed}" is not a valid URL.`)
  }
  if (!SAFE_SCHEMES.has(parsed.protocol)) {
    throw new Error(
      `URL scheme "${parsed.protocol}" is not allowed. Only https: and http: links are accepted.`
    )
  }
  return parsed.href
}

/**
 * Returns true only when the URL has a safe web scheme (https or http).
 *
 * Use this as a render-time guard before emitting an <a href> so that any
 * value that somehow bypassed write-time validation is never turned into a
 * clickable link.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    return SAFE_SCHEMES.has(new URL(url).protocol)
  } catch {
    return false
  }
}
