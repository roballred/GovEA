import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import type {
  DefaultPostgresUsersTable,
  DefaultPostgresAccountsTable,
  DefaultPostgresSessionsTable,
  DefaultPostgresVerificationTokenTable,
} from '@auth/drizzle-adapter/lib/pg'
import { db } from '@/db/client'
import { users, accounts, sessions, verificationTokens, organizations } from '@/db/schema'
import bcrypt from 'bcryptjs'
import { asc, eq } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit'
import type { Role } from '@/lib/rbac'

// Extended user type that includes our custom fields returned from the credentials provider
interface AppUser {
  id: string
  email: string | null
  name: string | null
  role: Role
  organizationId: string | null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users as unknown as DefaultPostgresUsersTable,
    accountsTable: accounts as unknown as DefaultPostgresAccountsTable,
    sessionsTable: sessions as unknown as DefaultPostgresSessionsTable,
    verificationTokensTable: verificationTokens as unknown as DefaultPostgresVerificationTokenTable,
  }),
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 }, // 24h
  providers: [
    ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID
      ? [MicrosoftEntraID({
          clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
          clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
          issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
        })]
      : []),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email as string
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        })
        if (!user || !user.passwordHash || user.isActive !== 'true') {
          await writeAuditLog({
            action: 'auth.login_failed',
            entityType: 'user',
            organizationId: user?.organizationId,
            metadata: { email },
          })
          return null
        }
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) {
          await writeAuditLog({
            action: 'auth.login_failed',
            entityType: 'user',
            organizationId: user.organizationId,
            metadata: { email },
          })
          return null
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const appUser = user as unknown as AppUser
        token.id = appUser.id
        token.role = appUser.role
        token.organizationId = appUser.organizationId
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.organizationId = token.organizationId as string | null
      return session
    },
  },
  events: {
    async createUser({ user }) {
      const [firstOrg] = await db
        .select()
        .from(organizations)
        .orderBy(asc(organizations.createdAt))
        .limit(1)
      if (firstOrg) {
        await db.update(users).set({ organizationId: firstOrg.id }).where(eq(users.id, user.id!))
      }
    },
    async signIn({ user }) {
      await writeAuditLog({
        action: 'auth.login',
        entityType: 'user',
        entityId: user.id,
        userId: user.id,
        organizationId: (user as unknown as AppUser).organizationId,
      })
    },
    async signOut(message) {
      const token = 'token' in message ? message.token : null
      await writeAuditLog({
        action: 'auth.logout',
        entityType: 'user',
        entityId: token?.id as string | undefined,
        userId: token?.id as string | undefined,
        organizationId: token?.organizationId as string | undefined,
      })
    },
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
})
