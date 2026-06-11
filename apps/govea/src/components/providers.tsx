'use client'

import { SessionProvider } from 'next-auth/react'

/**
 * App-wide client providers. Adds NextAuth's SessionProvider so client
 * components can call `useSession().update()` — required by the org switcher
 * (#693 slice 3b) to fire the JWT `update` trigger after switching active org.
 *
 * The app is otherwise server-session only (`auth()`); this provider does not
 * change how server components read the session.
 *
 * refetchOnWindowFocus is off (#782): the focus refetch hits
 * /api/auth/session, whose response re-issues (rolls) the session cookie —
 * one of those racing a sign-out can re-set the cookie after logout deleted
 * it. Nothing here consumes live session state, so the refetch bought
 * nothing. (Middleware also guards against any remaining emitters.)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
}
