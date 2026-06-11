/**
 * Regression test: middleware.ts blocks unauthenticated requests (#421).
 *
 * The middleware in `apps/govea/src/middleware.ts` is the primary defense for
 * unauthenticated server-action exploitation. If a developer ever broadens
 * `PUBLIC_PATHS`, removes the matcher, or weakens the redirect logic, every
 * server action in the listed protected route groups becomes potentially
 * callable without a session.
 *
 * This file locks in the following invariants:
 *
 *   1. Anonymous request to a representative protected path in EACH route
 *      group ((admin), (instance), /api/* mutation routes, root) returns a
 *      redirect to /login.
 *   2. Anonymous request to each documented PUBLIC_PATH passes through.
 *   3. /_next/static and /favicon.ico pass through (the static-asset escape
 *      hatch).
 *   4. /instance/* requires the `instance_admin` role even with a session.
 *   5. #782 — a session token issued before the logged-out marker is
 *      rejected and its cookies are deleted (post-logout resurrection guard).
 *
 * If you add a new public path, also add it to the PASSTHROUGH_PATHS list
 * here. If you intentionally make a previously-protected route public,
 * remove it from PROTECTED_PATHS — the test will then no longer enforce
 * its protection. Don't silently delete a case to make a red test pass.
 *
 * Note: this is a pure unit test of the middleware's branching logic.
 * It does not exercise next-auth's session resolution; that is mocked so we
 * can drive `req.auth` directly. End-to-end coverage of the cookie → session
 * pipeline lives in the e2e suite.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next-auth so `NextAuth(authConfig).auth(handler)` returns the handler
// itself. This lets us call the middleware's inner logic directly with a
// constructed request.
vi.mock('next-auth', () => ({
  default: () => ({
    auth: (handler: (req: unknown) => unknown) => handler,
  }),
}))

// authConfig pulls in db/server-only modules; we don't need its real value
// since the mock above never invokes it.
vi.mock('@/lib/auth.config', () => ({ authConfig: {} }))

type MockReq = {
  nextUrl: URL
  url: string
  auth: { user?: { role?: string; instanceRole?: string | null }; issuedAt?: number } | null
  // Models the NextRequest cookie API the middleware reads (#782).
  cookies: {
    get: (name: string) => { name: string; value: string } | undefined
    getAll: () => { name: string; value: string }[]
  }
}

// next-auth's middleware type requires (req, event); we don't use event in
// the handler under test, but we cast to satisfy the compiler.
type SingleArg = (req: MockReq) => Promise<Response>

async function loadMiddleware(): Promise<SingleArg> {
  const mod = await import('@/middleware')
  return mod.default as unknown as SingleArg
}

function makeRequest(
  pathname: string,
  auth: MockReq['auth'] = null,
  cookieMap: Record<string, string> = {},
): MockReq {
  const url = new URL(`https://example.test${pathname}`)
  const entries = Object.entries(cookieMap).map(([name, value]) => ({ name, value }))
  return {
    nextUrl: url,
    url: url.toString(),
    auth,
    cookies: {
      get: (name: string) => entries.find(e => e.name === name),
      getAll: () => entries,
    },
  }
}

function asRegularUser(): MockReq['auth'] {
  return { user: { role: 'admin', instanceRole: null } }
}

function asInstanceAdmin(): MockReq['auth'] {
  return { user: { role: 'admin', instanceRole: 'instance_admin' } }
}

// Representative protected paths — at least one per route group. Adding a
// path to PUBLIC_PATHS in middleware.ts that matches any of these will fail
// the test below.
const PROTECTED_PATHS = [
  // Root / dashboard
  '/',
  '/dashboard',
  // (admin) route group
  '/settings',
  '/capabilities',
  '/goals',
  '/users',
  '/value-streams',
  '/audit',
  // (instance) route group
  '/instance',
  '/instance/orgs',
  '/instance/users',
  '/instance/audit',
  // /api/* non-auth routes (mutation / data exports)
  '/api/applications/export',
] as const

const PASSTHROUGH_PATHS = [
  '/login',
  '/login/sso/callback',
  '/setup',
  '/setup/wizard',
  '/error',
  '/api/auth/signin',
  '/api/auth/callback/credentials',
  '/maintenance',
] as const

const STATIC_PATHS = [
  '/_next/static/foo.js',
  '/_next/data/route.json',
  '/favicon.ico',
] as const

beforeEach(() => {
  // Reset MAINTENANCE_MODE — middleware reads the env at module load via the
  // top-level `MAINTENANCE_MODE` constant, but a few tests below override it.
  process.env.MAINTENANCE_MODE = 'false'
  vi.resetModules()
})

describe('middleware — anonymous requests to protected paths redirect to /login', () => {
  it.each(PROTECTED_PATHS)('blocks anonymous %s', async (pathname) => {
    const m = await loadMiddleware()
    const req = makeRequest(pathname, null)
    const res = await m(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`https://example.test/login`)
  })
})

describe('middleware — public paths pass through without a session', () => {
  it.each(PASSTHROUGH_PATHS)('lets anonymous reach %s', async (pathname) => {
    const m = await loadMiddleware()
    const req = makeRequest(pathname, null)
    const res = await m(req)
    // NextResponse.next() is a 200 with the special `x-middleware-next` header.
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it.each(STATIC_PATHS)('lets static asset %s through', async (pathname) => {
    const m = await loadMiddleware()
    const req = makeRequest(pathname, null)
    const res = await m(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})

describe('middleware — /instance/* requires instance_admin even with a session', () => {
  it('redirects a regular admin away from /instance', async () => {
    const m = await loadMiddleware()
    const req = makeRequest('/instance/orgs', asRegularUser())
    const res = await m(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`https://example.test/`)
  })

  it('lets an instance_admin through to /instance', async () => {
    const m = await loadMiddleware()
    const req = makeRequest('/instance/orgs', asInstanceAdmin())
    const res = await m(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})

describe('middleware — maintenance mode redirects non-admins', () => {
  it('redirects a non-admin to /maintenance when MAINTENANCE_MODE is on', async () => {
    process.env.MAINTENANCE_MODE = 'true'
    vi.resetModules()
    const m = await loadMiddleware()
    const req = makeRequest('/dashboard', { user: { role: 'viewer', instanceRole: null } })
    const res = await m(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`https://example.test/maintenance`)
  })

  it('lets an admin through during maintenance', async () => {
    process.env.MAINTENANCE_MODE = 'true'
    vi.resetModules()
    const m = await loadMiddleware()
    const req = makeRequest('/dashboard', { user: { role: 'admin', instanceRole: null } })
    const res = await m(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})

describe('middleware — #782 post-logout resurrection guard', () => {
  const T = 1_750_000_000_000 // logged out at this epoch ms

  it('rejects a session issued before the marker and deletes its cookies (incl. chunks)', async () => {
    const m = await loadMiddleware()
    const req = makeRequest(
      '/dashboard',
      { user: { role: 'admin', instanceRole: null }, issuedAt: (T - 60_000) / 1000 },
      {
        'govea.logged-out-at': String(T),
        'authjs.session-token': 'zombie',
        'authjs.session-token.1': 'zombie-chunk',
      },
    )
    const res = await m(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://example.test/login')

    const deletions = res.headers
      .getSetCookie()
      .filter(c => c.includes('session-token') && c.includes('01 Jan 1970'))
    expect(deletions.some(c => c.startsWith('authjs.session-token='))).toBe(true)
    expect(deletions.some(c => c.startsWith('authjs.session-token.1='))).toBe(true)
  })

  it('lets a session minted after the guard window through', async () => {
    // Normal re-logins delete the marker entirely (events.signIn); this case
    // covers the self-healing fallback when that deletion failed.
    const m = await loadMiddleware()
    const req = makeRequest(
      '/dashboard',
      { user: { role: 'admin', instanceRole: null }, issuedAt: (T + 120_000) / 1000 },
      { 'govea.logged-out-at': String(T) },
    )
    const res = await m(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('anonymous request with a marker still redirects normally', async () => {
    const m = await loadMiddleware()
    const req = makeRequest('/dashboard', null, { 'govea.logged-out-at': String(T) })
    const res = await m(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://example.test/login')
  })
})

describe('middleware — sanity: protected and passthrough sets do not overlap', () => {
  it('PROTECTED_PATHS and PASSTHROUGH_PATHS are disjoint', () => {
    const protectedSet = new Set<string>(PROTECTED_PATHS)
    for (const p of PASSTHROUGH_PATHS) {
      // A path that startsWith one of PUBLIC_PATHS is public; the protected
      // list must not contain anything that the middleware would treat as
      // public. This catches accidental drift between this file and
      // middleware.ts's PUBLIC_PATHS.
      expect(protectedSet.has(p)).toBe(false)
    }
  })
})
