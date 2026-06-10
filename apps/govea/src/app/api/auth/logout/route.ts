import { NextResponse } from 'next/server'
import { auth, signOut } from '@/lib/auth'

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
  const session = await auth()

  // No session (already signed out, expired, or a logged-out stale tab):
  // skip signOut() so events.signOut doesn't write a userless audit row.
  if (session) {
    await signOut({ redirect: false })
  }

  // 303 turns the form POST into a GET on /login. Fixed target — no
  // callback/redirect parameter is read, so no open-redirect surface.
  return NextResponse.redirect(new URL('/login', request.url), 303)
}
