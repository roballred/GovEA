/**
 * Unit tests for the deploy-stable logout route handler (#759)
 *
 * POST /api/auth/logout — signs out (firing the auth.logout audit event via
 * NextAuth's events.signOut) and 303-redirects to /login. Replaces the inline
 * Server Action forms whose deployment-specific action ids broke sign-out
 * from stale tabs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { authMock, signOutMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: authMock,
  signOut: signOutMock,
}))

import { POST } from '@/app/api/auth/logout/route'

beforeEach(() => {
  authMock.mockReset()
  signOutMock.mockReset()
})

describe('POST /api/auth/logout', () => {
  it('signs out a request carrying a session cookie and redirects to /login', async () => {
    const res = await POST(
      new Request('https://app.example.gov/api/auth/logout', {
        method: 'POST',
        headers: { cookie: 'authjs.session-token=tok' },
      }),
    )

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false })
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('/login')
  })

  it('sets the logged-out marker so middleware can reject resurrected sessions (#782)', async () => {
    const before = Date.now()
    const res = await POST(
      new Request('https://app.example.gov/api/auth/logout', {
        method: 'POST',
        headers: { cookie: 'authjs.session-token=tok' },
      }),
    )

    const marker = res.headers
      .getSetCookie()
      .find(c => c.startsWith('govea.logged-out-at='))
    expect(marker, 'logout must set the govea.logged-out-at marker').toBeDefined()
    expect(marker).toContain('HttpOnly')
    expect(marker).toContain('Max-Age=86400')
    expect(marker).toContain('Secure') // https request → secure marker

    const ts = Number(decodeURIComponent(marker!.split(';')[0].split('=')[1]))
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(Date.now())
  })

  it('redirects without calling signOut when no session cookie is present (stale logged-out tab)', async () => {
    const res = await POST(new Request('https://app.example.gov/api/auth/logout', { method: 'POST' }))

    expect(signOutMock).not.toHaveBeenCalled()
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('/login')
  })

  it('never calls auth() — a rolling-session refresh would race the cookie deletion', async () => {
    await POST(
      new Request('https://app.example.gov/api/auth/logout', {
        method: 'POST',
        headers: { cookie: 'authjs.session-token=tok' },
      }),
    )

    expect(authMock).not.toHaveBeenCalled()
  })

  it('expires every session-token cookie on the response, including JWT chunks', async () => {
    const res = await POST(
      new Request('https://app.example.gov/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie:
            'authjs.csrf-token=abc; authjs.session-token.0=chunk0; authjs.session-token.1=chunk1; __Secure-authjs.session-token=tok',
        },
      }),
    )

    const setCookies = res.headers.getSetCookie()
    const expired = (name: string) =>
      setCookies.some(c => c.startsWith(`${name}=`) && /max-age=0/i.test(c))

    expect(expired('authjs.session-token.0')).toBe(true)
    expect(expired('authjs.session-token.1')).toBe(true)
    expect(expired('__Secure-authjs.session-token')).toBe(true)
    // Non-session cookies are left alone.
    expect(setCookies.some(c => c.startsWith('authjs.csrf-token='))).toBe(false)
  })

  it('always targets /login — relative, never caller-controlled', async () => {
    // A redirect/callback query string must not influence the destination.
    const res = await POST(
      new Request('https://app.example.gov/api/auth/logout?callbackUrl=https://evil.example.com', {
        method: 'POST',
      }),
    )

    expect(res.headers.get('location')).toBe('/login')
  })

  it('emits a host-free Location even when the server sees its bind address (#794)', async () => {
    // Behind a TLS-terminating proxy (Azure demo), request.url carries the
    // container bind address. An absolute Location built from it sent users
    // to https://0.0.0.0/login. The Location must stay relative.
    const res = await POST(
      new Request('https://0.0.0.0/api/auth/logout', { method: 'POST' }),
    )

    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('/login')
  })

  it('marks the logged-out marker Secure from x-forwarded-proto behind a proxy (#794)', async () => {
    const res = await POST(
      new Request('http://0.0.0.0:3000/api/auth/logout', {
        method: 'POST',
        headers: { 'x-forwarded-proto': 'https' },
      }),
    )

    const marker = res.headers.getSetCookie().find(c => c.startsWith('govea.logged-out-at='))
    expect(marker).toBeDefined()
    expect(marker).toMatch(/;\s*secure/i)
  })

  it('omits Secure on the marker for plain-http local development', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/auth/logout', { method: 'POST' }),
    )

    const marker = res.headers.getSetCookie().find(c => c.startsWith('govea.logged-out-at='))
    expect(marker).toBeDefined()
    expect(marker).not.toMatch(/;\s*secure/i)
  })
})
