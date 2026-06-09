'use client'

import { SessionProvider } from 'next-auth/react'

/**
 * App-wide client providers. Adds NextAuth's SessionProvider so client
 * components can call `useSession().update()` — required by the org switcher
 * (#693 slice 3b) to fire the JWT `update` trigger after switching active org.
 *
 * The app is otherwise server-session only (`auth()`); this provider does not
 * change how server components read the session.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
