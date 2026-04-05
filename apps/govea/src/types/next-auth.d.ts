import type { DefaultSession } from 'next-auth'
import type { Role } from '@/lib/rbac'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      organizationId: string | null
    } & DefaultSession['user']
  }
}
