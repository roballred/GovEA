import type { DefaultSession } from 'next-auth'
import type { Role } from '@/lib/rbac'

declare module 'next-auth' {
  interface Session {
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
