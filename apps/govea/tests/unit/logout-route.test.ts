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
  it('signs out an authenticated session and redirects to /login', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await POST(new Request('https://app.example.gov/api/auth/logout', { method: 'POST' }))

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false })
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('https://app.example.gov/login')
  })

  it('redirects without calling signOut when there is no session (stale logged-out tab)', async () => {
    authMock.mockResolvedValue(null)

    const res = await POST(new Request('https://app.example.gov/api/auth/logout', { method: 'POST' }))

    expect(signOutMock).not.toHaveBeenCalled()
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('https://app.example.gov/login')
  })

  it('always targets /login on the request origin — no caller-controlled redirect', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } })

    // A redirect/callback query string must not influence the destination.
    const res = await POST(
      new Request('https://app.example.gov/api/auth/logout?callbackUrl=https://evil.example.com', {
        method: 'POST',
      }),
    )

    expect(res.headers.get('location')).toBe('https://app.example.gov/login')
  })
})
