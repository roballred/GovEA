import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
