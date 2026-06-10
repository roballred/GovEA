import { NextResponse } from 'next/server'
import { signOut } from '@/lib/auth'

/**
 * Deploy-stable sign-out endpoint (#759).
 *
 * Sign-out was previously an inline Server Action form in the admin and
 * instance layouts. Server Action ids are embedded in the rendered page and
 * change between deployments, so a stale tab posting an old action id fails
 * with "Failed to find Server Action" before signOut() ever runs. A plain
 * route handler at a fixed URL has no per-deployment identity: a form posting
 * here works no matter how old the page that rendered it is.
 *
 * The URL lives under /api/auth so middleware treats it as public — sign-out
 * stays reachable for password-expired users and already-signed-out tabs.
 */
export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''

  // Skip signOut() for cookie-less requests (already signed out, or a
  // logged-out stale tab) so events.signOut doesn't write a userless audit
  // row. Deliberately a plain header check, NOT auth(): with JWT rolling
  // sessions auth() can write a *refreshed* session cookie into the outgoing
  // cookie jar, which then races the deletion on this same response and
  // resurrects the session (observed in CI for #759).
  if (cookieHeader.includes('authjs.session-token')) {
    await signOut({ redirect: false })
  }

  // 303 turns the form POST into a GET on /login. Fixed target — no
  // callback/redirect parameter is read, so no open-redirect surface.
  const res = NextResponse.redirect(new URL('/login', request.url), 303)

  // Belt and braces: expire every session-token cookie on this response,
  // including large-JWT chunks (authjs.session-token.0, .1, …), rather than
  // relying solely on signOut()'s cookie-jar merge. Sign-out must never
  // leave a live session behind.
  for (const part of cookieHeader.split('; ')) {
    const name = part.split('=')[0]
    if (name.includes('authjs.session-token')) {
      // maxAge 0 AND an epoch expires — belt for jars that ignore one form.
      res.cookies.set(name, '', {
        maxAge: 0,
        expires: new Date(0),
        path: '/',
        secure: name.startsWith('__Secure-'),
      })
    }
  }

  return res
}
