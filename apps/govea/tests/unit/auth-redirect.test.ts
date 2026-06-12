/**
 * Unit tests for auth redirect utilities (#386)
 *
 * safeCallbackUrl — prevents callbackUrl values from trapping users in
 * auth/error route loops after a successful login.
 *
 * Capability: iam-sso-authentication, iam-local-authentication
 */

import { describe, it, expect } from 'vitest'
import { safeCallbackUrl, defaultLandingPath, postLoginDestination } from '@/lib/auth-redirect'

describe('safeCallbackUrl', () => {
  describe('valid destinations — returned as-is', () => {
    it('accepts a normal app route', () => {
      expect(safeCallbackUrl('/dashboard')).toBe('/dashboard')
    })

    it('accepts a deep app route', () => {
      expect(safeCallbackUrl('/capabilities/abc-123')).toBe('/capabilities/abc-123')
    })

    it('accepts a route with query string', () => {
      expect(safeCallbackUrl('/capabilities?status=published')).toBe('/capabilities?status=published')
    })
  })

  describe('empty / null input — falls back to /dashboard', () => {
    it('returns fallback for null', () => {
      expect(safeCallbackUrl(null)).toBe('/dashboard')
    })

    it('returns fallback for undefined', () => {
      expect(safeCallbackUrl(undefined)).toBe('/dashboard')
    })

    it('returns fallback for empty string', () => {
      expect(safeCallbackUrl('')).toBe('/dashboard')
    })
  })

  describe('auth dead-end routes — redirected to fallback', () => {
    it('rejects /login', () => {
      expect(safeCallbackUrl('/login')).toBe('/dashboard')
    })

    it('rejects /login with query string', () => {
      expect(safeCallbackUrl('/login?error=AccessDenied')).toBe('/dashboard')
    })

    it('rejects /error', () => {
      expect(safeCallbackUrl('/error')).toBe('/dashboard')
    })

    it('rejects /error with query string', () => {
      expect(safeCallbackUrl('/error?error=AccessDenied')).toBe('/dashboard')
    })

    it('rejects /api/auth and sub-paths', () => {
      expect(safeCallbackUrl('/api/auth/signin')).toBe('/dashboard')
    })

    it('rejects /api/auth/error', () => {
      expect(safeCallbackUrl('/api/auth/error')).toBe('/dashboard')
    })
  })

  describe('external URLs — rejected', () => {
    it('rejects https external URL', () => {
      expect(safeCallbackUrl('https://evil.example.com/phish')).toBe('/dashboard')
    })

    it('rejects protocol-relative URL', () => {
      expect(safeCallbackUrl('//evil.example.com')).toBe('/dashboard')
    })
  })

  describe('custom fallback', () => {
    it('uses the supplied fallback when provided', () => {
      expect(safeCallbackUrl(null, '/home')).toBe('/home')
    })

    it('uses the supplied fallback for dead-end routes', () => {
      expect(safeCallbackUrl('/login', '/home')).toBe('/home')
    })
  })
})

// #548 — role-aware landing rule pinned as a pure function so the routing
// surface is testable without spinning up React Server Components.
describe('defaultLandingPath', () => {
  it('sends instance admins to /instance regardless of their role', () => {
    expect(defaultLandingPath({ role: 'admin',       isInstanceAdmin: true })).toBe('/instance')
    expect(defaultLandingPath({ role: 'contributor', isInstanceAdmin: true })).toBe('/instance')
    expect(defaultLandingPath({ role: 'viewer',      isInstanceAdmin: true })).toBe('/instance')
  })

  it('sends Viewer-role users to /executive', () => {
    expect(defaultLandingPath({ role: 'viewer', isInstanceAdmin: false })).toBe('/executive')
  })

  it('sends Admin and Contributor users to /dashboard', () => {
    expect(defaultLandingPath({ role: 'admin',       isInstanceAdmin: false })).toBe('/dashboard')
    expect(defaultLandingPath({ role: 'contributor', isInstanceAdmin: false })).toBe('/dashboard')
  })
})

// #800 — multi-org users choose their workspace before landing; pinned as a
// pure function for the same reason as defaultLandingPath above.
describe('postLoginDestination', () => {
  it('sends multi-org users to /select-org', () => {
    expect(postLoginDestination({ role: 'admin', isInstanceAdmin: false, activeMembershipCount: 2 }))
      .toBe('/select-org')
    expect(postLoginDestination({ role: 'viewer', isInstanceAdmin: false, activeMembershipCount: 3 }))
      .toBe('/select-org')
  })

  it('instance admins land on /instance even with multiple memberships', () => {
    expect(postLoginDestination({ role: 'admin', isInstanceAdmin: true, activeMembershipCount: 2 }))
      .toBe('/instance')
  })

  it('single-org users keep their role-based landing', () => {
    expect(postLoginDestination({ role: 'viewer', isInstanceAdmin: false, activeMembershipCount: 1 }))
      .toBe('/executive')
    expect(postLoginDestination({ role: 'admin', isInstanceAdmin: false, activeMembershipCount: 1 }))
      .toBe('/dashboard')
  })

  it('zero-membership (legacy home-org only) users keep their landing', () => {
    expect(postLoginDestination({ role: 'contributor', isInstanceAdmin: false, activeMembershipCount: 0 }))
      .toBe('/dashboard')
  })
})
