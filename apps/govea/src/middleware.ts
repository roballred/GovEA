import { getToken, type JWT } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'
import { LOGGED_OUT_MARKER_COOKIE, isResurrectedSession } from '@/lib/logout-marker'

/**
 * Deliberately NOT wrapped in next-auth's `auth()` middleware helper: the
 * wrapper re-issues (rolls) the session cookie on its responses, which makes
 * the middleware itself a resurrection emitter — a rolled cookie appended to
 * the same response as the #782 guard's deletions overrides them and loops
 * /login ↔ /auth-redirect. `getToken` is a read-only decode: this middleware
 * never writes session cookies. Session expiry keepalive still happens via
 * /api/auth/session and the Node-side jwt callback.
 *
 * Edge-safe: token decode + pure arithmetic, no DB.
 */

const PUBLIC_PATHS = ['/login', '/setup', '/error', '/api/auth', '/maintenance']

// Paths that an authenticated-but-password-expired user is still allowed to
// reach. They MUST include /change-password (so the user can actually
// change their password) and the sign-out endpoint (so they can escape if
// they want to).
const PASSWORD_EXPIRED_ALLOWED = ['/change-password', '/api/auth/signout']

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true'

/** Read-only session decode — checks both secure and plain cookie names. */
async function decodeSession(req: NextRequest): Promise<JWT | null> {
  const secret = process.env.AUTH_SECRET
  return (
    (await getToken({ req, secret, secureCookie: true, salt: '__Secure-authjs.session-token' })) ??
    (await getToken({ req, secret, secureCookie: false, salt: 'authjs.session-token' }))
  )
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const isStatic = pathname.startsWith('/_next') || pathname === '/favicon.ico'

  if (isPublic || isStatic) return NextResponse.next()

  const token = await decodeSession(req)

  // #782 — post-logout resurrection guard. A session refresh in flight when
  // the user signed out can re-set a rolled session cookie after logout's
  // deletion. The logout endpoint drops a timestamped marker; any session
  // token issued before that marker (plus the guard window) is rejected here
  // and its cookies are actively deleted. Genuine re-logins are exempt
  // because events.signIn (auth.ts) deletes the marker.
  const loggedOutMarker = req.cookies.get(LOGGED_OUT_MARKER_COOKIE)?.value
  if (token && isResurrectedSession(loggedOutMarker, token.iat)) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.includes('authjs.session-token')) {
        res.cookies.set(cookie.name, '', {
          maxAge: 0,
          expires: new Date(0),
          path: '/',
          secure: cookie.name.startsWith('__Secure-'),
        })
      }
    }
    return res
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (MAINTENANCE_MODE && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/maintenance', req.url))
  }

  if (pathname.startsWith('/instance') && token.instanceRole !== 'instance_admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // #527 — password-expiry redirect. The token carries a snapshot of
  // `passwordExpiryDays` and `lastPasswordChangedAt`, refreshed on the
  // 5-minute active-user check. Edge-safe: pure arithmetic, no DB.
  const expiryDays = (token.passwordExpiryDays as number | undefined) ?? 0
  const lastChanged = token.lastPasswordChangedAt as number | null | undefined
  if (expiryDays > 0 && !PASSWORD_EXPIRED_ALLOWED.some(p => pathname.startsWith(p))) {
    const expired = !lastChanged
      || (Date.now() - lastChanged) > expiryDays * 24 * 60 * 60 * 1000
    if (expired) {
      return NextResponse.redirect(new URL('/change-password?reason=expired', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // api/auth/* is excluded entirely, not just treated as public: those
  // endpoints manage the session cookie themselves (#759).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
