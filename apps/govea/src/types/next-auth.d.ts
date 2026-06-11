import type { DefaultSession } from 'next-auth'
import type { Role } from '@/lib/rbac'

declare module 'next-auth' {
  interface Session {
    // #782 — the JWT's iat (epoch seconds), so middleware can reject tokens
    // issued before a logged-out marker without decoding the token itself.
    issuedAt?: number
    user: {
      id: string
      role: Role
      organizationId: string | null
      instanceRole: 'instance_admin' | null
      // #527 — propagated from JWT for middleware password-expiry redirect.
      lastPasswordChangedAt: number | null
      passwordExpiryDays: number
    } & DefaultSession['user']
  }
}
