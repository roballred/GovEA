import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'
import { LOGGED_OUT_MARKER_COOKIE, isResurrectedSession } from '@/lib/logout-marker'

// Use the edge-safe config so middleware never touches Node.js built-ins (net, etc.)
const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ['/login', '/setup', '/error', '/api/auth', '/maintenance']

// Paths that an authenticated-but-password-expired user is still allowed to
// reach. They MUST include /change-password (so the user can actually
// change their password) and the sign-out endpoint (so they can escape if
// they want to).
const PASSWORD_EXPIRED_ALLOWED = ['/change-password', '/api/auth/signout']

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true'

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const isStatic = pathname.startsWith('/_next') || pathname === '/favicon.ico'

  if (isPublic || isStatic) return NextResponse.next()

  // #782 — post-logout resurrection guard. A session refresh in flight when
  // the user signed out can re-set a rolled session cookie after logout's
  // deletion. The logout endpoint drops a timestamped marker; any session
  // token issued before that marker (plus a small race window) is rejected
  // here and its cookies are actively deleted. Edge-safe: pure arithmetic.
  const loggedOutMarker = req.cookies.get(LOGGED_OUT_MARKER_COOKIE)?.value
  if (req.auth && isResurrectedSession(loggedOutMarker, req.auth.issuedAt)) {
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

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (MAINTENANCE_MODE && req.auth.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/maintenance', req.url))
  }

  if (pathname.startsWith('/instance') && req.auth.user?.instanceRole !== 'instance_admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // #527 — password-expiry redirect. The token carries a snapshot of
  // `passwordExpiryDays` and `lastPasswordChangedAt`, refreshed on the
  // 5-minute active-user check. Edge-safe: pure arithmetic, no DB.
  const expiryDays = req.auth.user?.passwordExpiryDays ?? 0
  const lastChanged = req.auth.user?.lastPasswordChangedAt
  if (expiryDays > 0 && !PASSWORD_EXPIRED_ALLOWED.some(p => pathname.startsWith(p))) {
    const expired = !lastChanged
      || (Date.now() - lastChanged) > expiryDays * 24 * 60 * 60 * 1000
    if (expired) {
      return NextResponse.redirect(new URL('/change-password?reason=expired', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  // api/auth/* is excluded entirely, not just treated as public: those
  // endpoints manage the session cookie themselves, and the auth() wrapper
  // re-issues (rolls) the session cookie on every authenticated request —
  // on the logout response that roll races the cookie deletion and can
  // resurrect the session (#759).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
