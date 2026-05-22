import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@/lib/rbac'

/**
 * Edge-safe auth config — used by middleware (runs in the edge runtime which
 * does NOT support Node.js built-ins like `net`).
 *
 * Rules:
 *  - No DB adapter (DrizzleAdapter uses postgres → net → not edge-compatible)
 *  - No DB queries in callbacks
 *  - Same session/JWT shape as the full config so tokens are interoperable
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 },
  providers: [], // populated by the full auth.ts; not needed in middleware
  callbacks: {
    jwt({ token }) {
      // In edge context we just pass the token through — no DB re-validation.
      // The active-user check happens in the full Node.js jwt callback (auth.ts)
      // which runs on every server component / server action request.
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.organizationId = token.organizationId as string | null
      session.user.instanceRole = (token.instanceRole as 'instance_admin' | null) ?? null
      // #527 — propagate the security-policy snapshot through to session.user
      // so middleware (edge) and components alike can read it without a DB
      // round-trip. Refreshed by the Node jwt callback every 5 minutes.
      session.user.lastPasswordChangedAt = (token.lastPasswordChangedAt as number | null) ?? null
      session.user.passwordExpiryDays = (token.passwordExpiryDays as number | undefined) ?? 0
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
}
