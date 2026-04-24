import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db/client'
import { users, accounts, sessions, verificationTokens } from '@/db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit'
import type { Role } from '@/lib/rbac'
import { authConfig } from '@/lib/auth.config'
import { checkSsoProvisioning } from '@/lib/sso-guard'

// Identity model: users.email is globally unique across all organizations (#269).
// Auth lookups by bare email (credentials provider, jwt callback) are therefore
// unambiguous — there is at most one matching user record regardless of org.

// Extended user type that includes our custom fields returned from the credentials provider
interface AppUser {
  id: string
  email: string | null
  name: string | null
  role: Role
  organizationId: string | null
  instanceRole: 'instance_admin' | null
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
      // object (see authorize above). For SSO providers we enforce invite-based
      // binding here (#213): the identity must map to a pre-provisioned, active
      // user with an explicit org assignment. New SSO identities are blocked
      // until an admin creates a matching account in /users.
      if (account?.provider !== 'credentials') {
        if (!user.email) return false
        const check = await checkSsoProvisioning(user.email)
        if (check.status !== 'allowed') return false
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — always fetch role and org from the DB regardless
        // of provider. The credentials provider returns these fields directly,
        // but SSO providers (Entra) do not — the DrizzleAdapter only returns
        // standard NextAuth fields (id, name, email, image, emailVerified).
        // Using the DB as the single source of truth also prevents token
        // inflation: we never trust what the provider claims about our roles.
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id!),
        })
        token.id = user.id
        token.role = dbUser?.role ?? 'viewer'
        token.organizationId = dbUser?.organizationId ?? null
        token.instanceRole = (dbUser?.instanceRole as 'instance_admin' | null) ?? null
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
          token.instanceRole = (dbUser?.instanceRole as 'instance_admin' | null) ?? null
          token.checkedAt = Date.now()
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.organizationId = token.organizationId as string | null
      session.user.instanceRole = (token.instanceRole as 'instance_admin' | null) ?? null
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // First-org-wins auto-provisioning removed (#213). The signIn callback
      // now blocks SSO identities that have no pre-provisioned DB record, so
      // the adapter should only reach createUser for edge cases (e.g. a setup
      // flow that pre-creates the record outside of normal /users admin flow).
      //
      // Safety net: if somehow an unbound user was created, deactivate
      // immediately and emit an audit event so the anomaly is visible.
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id!),
      })
      if (dbUser && !dbUser.organizationId) {
        await db.update(users).set({ isActive: 'false' }).where(eq(users.id, user.id!))
        await writeAuditLog({
          action: 'auth.sso_org_binding_failed',
          entityType: 'user',
          entityId: user.id,
          metadata: { email: user.email, reason: 'no_organization_binding' },
        })
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
