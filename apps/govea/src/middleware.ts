import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

// Use the edge-safe config so middleware never touches Node.js built-ins (net, etc.)
const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ['/login', '/setup', '/error', '/api/auth', '/maintenance']

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

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
