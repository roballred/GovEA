/**
 * Unit tests: proxy-aware client-IP resolution (#720 slice 1 / #725)
 *
 * The anti-spoofing core: trust only the rightmost `hops` X-Forwarded-For
 * entries (added by our own proxies); ignore client-prepended fakes.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { clientIpFromForwarded, trustedProxyHops } from '@/lib/request-context'

describe('clientIpFromForwarded (#720)', () => {
  it('returns null for missing/empty input', () => {
    expect(clientIpFromForwarded(null, 1)).toBeNull()
    expect(clientIpFromForwarded(undefined, 1)).toBeNull()
    expect(clientIpFromForwarded('', 1)).toBeNull()
    expect(clientIpFromForwarded('   ', 1)).toBeNull()
  })

  it('single trusted hop (Azure): rightmost entry is the real client', () => {
    // ACA ingress appends the real client IP as the sole entry.
    expect(clientIpFromForwarded('203.0.113.7', 1)).toBe('203.0.113.7')
  })

  it('ignores client-prepended spoofed entries beyond the trusted hop', () => {
    // Attacker sends "X-Forwarded-For: 1.2.3.4" hoping to be logged as 1.2.3.4;
    // the trusted proxy appends the *real* peer on the right.
    expect(clientIpFromForwarded('1.2.3.4, 203.0.113.7', 1)).toBe('203.0.113.7')
    expect(clientIpFromForwarded('9.9.9.9, 8.8.8.8, 203.0.113.7', 1)).toBe('203.0.113.7')
  })

  it('two trusted hops: client is two from the right', () => {
    // client, proxy1 (proxy2 is the socket peer, not in XFF)
    expect(clientIpFromForwarded('203.0.113.7, 10.0.0.2', 2)).toBe('203.0.113.7')
    // with a prepended fake, still resolves the real client
    expect(clientIpFromForwarded('1.2.3.4, 203.0.113.7, 10.0.0.2', 2)).toBe('203.0.113.7')
  })

  it('clamps when hops exceeds the list length (best-effort leftmost)', () => {
    expect(clientIpFromForwarded('203.0.113.7', 5)).toBe('203.0.113.7')
  })

  it('trims whitespace around entries', () => {
    expect(clientIpFromForwarded('  1.2.3.4 ,  203.0.113.7  ', 1)).toBe('203.0.113.7')
  })
})

describe('trustedProxyHops (#720)', () => {
  const original = process.env.GOVEA_TRUSTED_PROXY_HOPS
  afterEach(() => {
    if (original === undefined) delete process.env.GOVEA_TRUSTED_PROXY_HOPS
    else process.env.GOVEA_TRUSTED_PROXY_HOPS = original
  })

  it('defaults to 1 when unset or invalid', () => {
    delete process.env.GOVEA_TRUSTED_PROXY_HOPS
    expect(trustedProxyHops()).toBe(1)
    process.env.GOVEA_TRUSTED_PROXY_HOPS = 'nonsense'
    expect(trustedProxyHops()).toBe(1)
    process.env.GOVEA_TRUSTED_PROXY_HOPS = '0'
    expect(trustedProxyHops()).toBe(1) // min 1
  })

  it('honors a valid configured value', () => {
    process.env.GOVEA_TRUSTED_PROXY_HOPS = '2'
    expect(trustedProxyHops()).toBe(2)
  })
})
