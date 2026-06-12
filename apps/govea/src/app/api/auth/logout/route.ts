import { NextResponse } from 'next/server'
import { signOut } from '@/lib/auth'
import { LOGGED_OUT_MARKER_COOKIE, LOGGED_OUT_MARKER_MAX_AGE_S } from '@/lib/logout-marker'

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
    try {
      await signOut({ redirect: false })
    } catch (err) {
      // signOut() fires events.signOut (the auth.logout audit write). If that
      // throws, the user must STILL be signed out — the explicit cookie
      // expiry below is what actually ends the session, so log and continue.
      console.error('signOut() failed during logout; clearing cookies anyway:', err)
    }
  }

  // 303 turns the form POST into a GET on /login. Fixed target — no
  // callback/redirect parameter is read, so no open-redirect surface.
  // The Location is deliberately RELATIVE (#794): behind a TLS-terminating
  // proxy the standalone server's request.url carries the container bind
  // address (https://0.0.0.0/login on the demo), so an absolute URL built
  // from it points at an unroutable origin. A relative Location resolves
  // against whatever origin the user is actually on.
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: '/login' },
  })

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

  // #782 — resurrection guard marker. A session refresh in flight right now
  // can re-set a rolled cookie after this response's deletions; middleware
  // rejects any session token issued before this timestamp and deletes its
  // cookies. Lives as long as the max session age so no pre-logout token can
  // outlast it.
  // x-forwarded-proto first: behind a TLS-terminating proxy request.url is
  // the internal (http) hop even though the user is on https (#794).
  const isHttps =
    (request.headers.get('x-forwarded-proto') ?? '').split(',')[0].trim() === 'https' ||
    request.url.startsWith('https')

  res.cookies.set(LOGGED_OUT_MARKER_COOKIE, String(Date.now()), {
    maxAge: LOGGED_OUT_MARKER_MAX_AGE_S,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isHttps,
  })

  return res
}
