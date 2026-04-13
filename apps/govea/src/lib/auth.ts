import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db/client'
import { users, accounts, sessions, verificationTokens, organizations } from '@/db/schema'
import bcrypt from 'bcryptjs'
import { asc, eq } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit'
import type { Role } from '@/lib/rbac'
import { authConfig } from '@/lib/auth.config'

// Extended user type that includes our custom fields returned from the credentials provider
interface AppUser {
  id: string
  email: string | null
  name: string | null
  role: Role
  organizationId: string | null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens } as any),
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
    async signIn({ user, account }) {
      // Credentials provider already checks isActive before returning the user
      // object (see authorize above). For SSO providers we must check here
      // because the adapter finds/creates the user without consulting isActive.
      if (account?.provider !== 'credentials') {
        if (!user.email) return false
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        })
        // Allow new SSO users (not yet in DB — adapter will create them with
        // isActive defaulting to 'true'). Block only explicitly deactivated users.
        if (dbUser && dbUser.isActive !== 'true') return false
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — populate token from the authenticated user object.
        const appUser = user as unknown as AppUser
        token.id = appUser.id
        token.role = appUser.role
        token.organizationId = appUser.organizationId
        token.checkedAt = Date.now()
      } else if (token.id) {
        // Subsequent requests — re-validate isActive every 5 minutes so that
        // deactivating a user takes effect without waiting for the 24h JWT to
        // expire. Returning null clears the session cookie and forces re-login.
        const CHECK_INTERVAL_MS = 5 * 60 * 1000
        const lastCheck = (token.checkedAt as number) ?? 0
        if (Date.now() - lastCheck > CHECK_INTERVAL_MS) {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, token.id as string),
          })
          if (!dbUser || dbUser.isActive !== 'true') return null
          token.checkedAt = Date.now()
        }
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
