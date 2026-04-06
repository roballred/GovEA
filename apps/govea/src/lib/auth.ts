import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db/client'
import { users, accounts, sessions, verificationTokens, organizations } from '@/db/schema'
import bcrypt from 'bcryptjs'
import { asc, eq } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users as any,
    accountsTable: accounts as any,
    sessionsTable: sessions as any,
    verificationTokensTable: verificationTokens as any,
  }),
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 }, // 24h
  providers: [
    ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID
      ? [MicrosoftEntraID({
          clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
          clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
          tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID!,
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
        token.id = user.id
        token.role = (user as any).role
        token.organizationId = (user as any).organizationId
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as any
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
        organizationId: (user as any).organizationId,
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
