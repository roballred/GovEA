import { headers } from 'next/headers'

export interface RequestContext {
  ip: string | null
  userAgent: string | null
}

const DEFAULT_TRUSTED_HOPS = 1

/**
 * Number of trusted proxy hops in front of the app, from
 * `GOVEA_TRUSTED_PROXY_HOPS` (default 1 — Azure Container Apps ingress).
 * Operator-specific (public-repo policy: kept in env, not hardcoded).
 */
export function trustedProxyHops(): number {
  const raw = process.env.GOVEA_TRUSTED_PROXY_HOPS
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_TRUSTED_HOPS
}

/**
 * Resolves the real client IP from an `X-Forwarded-For` value, trusting only
 * the rightmost `hops` entries (those appended by our own proxies). #720.
 *
 * XFF is `client, proxy1, …` — proxies *append* on the right, so the entry our
 * outermost trusted proxy added sits at index `len - hops`. A malicious client
 * can only *prepend* fake entries (to the left of `len - hops`), which this
 * ignores. Returns null for empty/missing input.
 *
 * Exported for unit testing — this is the security-critical, anti-spoofing bit.
 */
export function clientIpFromForwarded(xff: string | null | undefined, hops: number): string | null {
  if (!xff) return null
  const parts = xff.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const idx = Math.max(0, parts.length - hops)
  return parts[idx] ?? null
}

/**
 * Proxy-aware client context (IP + user-agent) for audit telemetry (#720).
 * Safe to call outside a request scope — returns nulls if `headers()` throws.
 * Never records raw headers; only the derived IP and the user-agent string.
 */
export async function getRequestContext(): Promise<RequestContext> {
  try {
    const h = await headers()
    const ip = clientIpFromForwarded(h.get('x-forwarded-for'), trustedProxyHops())
      ?? h.get('x-real-ip')
      ?? null
    return { ip, userAgent: h.get('user-agent') }
  } catch {
    return { ip: null, userAgent: null }
  }
}
