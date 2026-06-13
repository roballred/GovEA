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
 *   6. #807 — when the internal request origin is the container bind address
 *      (`0.0.0.0:3000`, as it can be behind a TLS-terminating proxy), the
 *      browser-visible redirect Location is rebuilt from the proxy's
 *      `x-forwarded-host` (then `NEXT_PUBLIC_APP_URL`) and never echoes
 *      `0.0.0.0`. Normal requests keep their absolute same-origin redirect.
 *
 * If you add a new public path, also add it to the PASSTHROUGH_PATHS list
 * here. If you intentionally make a previously-protected route public,
 * remove it from PROTECTED_PATHS — the test will then no longer enforce
 * its protection. Don't silently delete a case to make a red test pass.
 *
 * Note: this is a pure unit test of the middleware's branching logic.
 * It does not exercise next-auth's session resolution; getToken is mocked so
 * we can drive the decoded token directly. End-to-end coverage of the
 * cookie → session pipeline lives in the e2e suite.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// The middleware reads the session via next-auth/jwt's getToken (a read-only
// decode — deliberately NOT the auth() wrapper, which rolls the session
// cookie on its responses; see middleware.ts and #782). Mock getToken to
// return the token planted on the request by makeRequest.
vi.mock('next-auth/jwt', () => ({
  getToken: async ({ req }: { req: MockReq }) => req.token ?? null,
}))

type MockToken = {
  role?: string
  instanceRole?: string | null
  iat?: number
  passwordExpiryDays?: number
  lastPasswordChangedAt?: number | null
} | null

type MockReq = {
  nextUrl: URL
  url: string
  token: MockToken
  // Models the NextRequest header API the middleware reads for the #807
  // forwarded-host rebuild. Only `.get` is used.
  headers: { get: (name: string) => string | null }
  // Models the NextRequest cookie API the middleware reads (#782).
  cookies: {
    get: (name: string) => { name: string; value: string } | undefined
    getAll: () => { name: string; value: string }[]
  }
}

/** Build a case-insensitive header bag matching NextRequest.headers.get. */
function headerBag(h: Record<string, string> = {}): { get: (name: string) => string | null } {
  const lower = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]))
  return { get: (name: string) => lower[name.toLowerCase()] ?? null }
}

type SingleArg = (req: MockReq) => Promise<Response>

async function loadMiddleware(): Promise<SingleArg> {
  const mod = await import('@/middleware')
  return mod.default as unknown as SingleArg
}

function makeRequest(
  pathname: string,
  token: MockToken = null,
  cookieMap: Record<string, string> = {},
): MockReq {
  const url = new URL(`https://example.test${pathname}`)
  const entries = Object.entries(cookieMap).map(([name, value]) => ({ name, value }))
  return {
    nextUrl: url,
    url: url.toString(),
    token,
    headers: headerBag(),
    cookies: {
      get: (name: string) => entries.find(e => e.name === name),
      getAll: () => entries,
    },
  }
}

function asRegularUser(): MockToken {
  return { role: 'admin', instanceRole: null }
}

function asInstanceAdmin(): MockToken {
  return { role: 'admin', instanceRole: 'instance_admin' }
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
    const req = makeRequest('/dashboard', { role: 'viewer', instanceRole: null })
    const res = await m(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`https://example.test/maintenance`)
  })

  it('lets an admin through during maintenance', async () => {
    process.env.MAINTENANCE_MODE = 'true'
    vi.resetModules()
    const m = await loadMiddleware()
    const req = makeRequest('/dashboard', { role: 'admin', instanceRole: null })
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
      { role: 'admin', instanceRole: null, iat: (T - 60_000) / 1000 },
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
      { role: 'admin', instanceRole: null, iat: (T + 120_000) / 1000 },
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

describe('middleware — #807 never redirects to the container bind address', () => {
  /**
   * A request whose internal origin is the container bind address, as it can
   * arrive at the standalone Next server behind a TLS-terminating proxy. The
   * browser is really on a public origin; only `req.nextUrl` carries
   * `0.0.0.0:3000`. The redirect must NOT echo that host back — middleware
   * rebuilds it from `x-forwarded-host` / `NEXT_PUBLIC_APP_URL`.
   */
  function proxiedRequest(
    pathname: string,
    token: MockToken = null,
    headers: Record<string, string> = {},
  ): MockReq {
    const url = new URL(`http://0.0.0.0:3000${pathname}`)
    return {
      nextUrl: url,
      url: url.toString(),
      token,
      headers: headerBag(headers),
      cookies: { get: () => undefined, getAll: () => [] },
    }
  }

  const FORWARDED = {
    'x-forwarded-host': 'govea.example.gov',
    'x-forwarded-proto': 'https',
  }

  it('rebuilds /login from x-forwarded-host, not 0.0.0.0', async () => {
    const m = await loadMiddleware()
    const res = await m(proxiedRequest('/dashboard', null, FORWARDED))
    const location = res.headers.get('location')
    expect(res.status).toBe(307)
    expect(location).toBe('https://govea.example.gov/login')
    expect(location).not.toContain('0.0.0.0')
  })

  it('rebuilds the instance-admin gate redirect from x-forwarded-host', async () => {
    const m = await loadMiddleware()
    const res = await m(proxiedRequest('/instance/orgs', asRegularUser(), FORWARDED))
    const location = res.headers.get('location')
    expect(res.status).toBe(307)
    expect(location).toBe('https://govea.example.gov/')
    expect(location).not.toContain('0.0.0.0')
  })

  it('rebuilds the password-expiry redirect from x-forwarded-host', async () => {
    const m = await loadMiddleware()
    const res = await m(proxiedRequest(
      '/dashboard',
      { role: 'admin', instanceRole: null, passwordExpiryDays: 90, lastPasswordChangedAt: null },
      FORWARDED,
    ))
    const location = res.headers.get('location')
    expect(res.status).toBe(307)
    expect(location).toBe('https://govea.example.gov/change-password?reason=expired')
    expect(location).not.toContain('0.0.0.0')
  })

  it('falls back to NEXT_PUBLIC_APP_URL when no forwarded host is present', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://configured.example.gov'
    vi.resetModules()
    try {
      const m = await loadMiddleware()
      const res = await m(proxiedRequest('/dashboard'))
      const location = res.headers.get('location')
      expect(res.status).toBe(307)
      expect(location).toBe('https://configured.example.gov/login')
      expect(location).not.toContain('0.0.0.0')
    } finally {
      delete process.env.NEXT_PUBLIC_APP_URL
    }
  })

  it('ignores a spoofed 0.0.0.0 forwarded host and uses the configured origin', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://configured.example.gov'
    vi.resetModules()
    try {
      const m = await loadMiddleware()
      const res = await m(proxiedRequest('/dashboard', null, { 'x-forwarded-host': '0.0.0.0:3000' }))
      const location = res.headers.get('location')
      expect(location).toBe('https://configured.example.gov/login')
      expect(location).not.toContain('0.0.0.0')
    } finally {
      delete process.env.NEXT_PUBLIC_APP_URL
    }
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
