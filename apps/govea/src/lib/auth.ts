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
import { getOrgSecuritySettings } from '@/lib/security-policy'
import { resolveActiveMembership } from '@/lib/active-membership'
import { getRequestContext } from '@/lib/request-context'
import { LOGGED_OUT_MARKER_COOKIE } from '@/lib/logout-marker'

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
        // #720 — proxy-aware client telemetry for auth audit events.
        const ctx = await getRequestContext()
        const authMeta = { ip: ctx.ip, userAgent: ctx.userAgent, provider: 'local' as const }
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        })
        if (!user || !user.passwordHash || user.isActive !== 'true') {
          // Unknown / unusable / inactive account — recorded for investigation,
          // but the requester gets the same generic failure (no enumeration).
          await writeAuditLog(db, {
            action: 'auth.login_failed',
            entityType: 'user',
            organizationId: user?.organizationId,
            metadata: { ...authMeta, email, reason: 'invalid_credentials' },
          })
          return null
        }

        // #527 — account lockout enforcement. Per ac-security-settings, a
        // user is locked when failed_login_attempts >= threshold, and the
        // lockout self-clears `lockoutDurationMinutes` after the lock was
        // set. We check the lockout BEFORE comparing the password so a
        // continuous attack on a locked account doesn't get a timing oracle
        // about password correctness (NIST 800-63B §5.2.2).
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
          await writeAuditLog(db, {
            action: 'auth.login_blocked_locked',
            entityType: 'user',
            entityId: user.id,
            organizationId: user.organizationId,
            metadata: { ...authMeta, email, reason: 'locked_account', lockoutUntil: user.lockoutUntil.toISOString() },
          })
          return null
        }

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) {
          // Increment failed_login_attempts. If the new count crosses the
          // org's threshold, set lockoutUntil. Threshold of 0 disables
          // the lockout entirely (per-org opt-out).
          const policy = await getOrgSecuritySettings(user.organizationId)
          const newCount = user.failedLoginAttempts + 1
          const shouldLock = policy.lockoutThreshold > 0 && newCount >= policy.lockoutThreshold
          const lockoutUntil = shouldLock
            ? new Date(Date.now() + policy.lockoutDurationMinutes * 60 * 1000)
            : null
          await db.update(users)
            .set({ failedLoginAttempts: newCount, lockoutUntil })
            .where(eq(users.id, user.id))

          await writeAuditLog(db, {
            action: shouldLock ? 'auth.login_failed_locked' : 'auth.login_failed',
            entityType: 'user',
            entityId: user.id,
            organizationId: user.organizationId,
            metadata: { ...authMeta, email, reason: 'invalid_credentials', attempts: newCount, lockedUntil: lockoutUntil?.toISOString() ?? null },
          })
          return null
        }

        // Success — reset the failure counter + any prior lock.
        if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
          await db.update(users)
            .set({ failedLoginAttempts: 0, lockoutUntil: null })
            .where(eq(users.id, user.id))
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
    async jwt({ token, user, trigger }) {
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
        // #693 slice 2 — the *active* org/role come from the user's membership
        // (primary, then oldest active), with the denormalized users columns as
        // a fallback when no membership exists. For today's single-membership
        // users this resolves to exactly their backfilled primary membership,
        // so the session is unchanged. Slice 3 adds switching the active org.
        // #693 slice 3a — honor the user's last-selected org (if still an active
        // membership) before primary/oldest.
        const active = await resolveActiveMembership(user.id!, dbUser?.lastActiveOrganizationId)
        const activeOrgId = active?.organizationId ?? dbUser?.organizationId ?? null
        const activeRole = active?.role ?? dbUser?.role ?? 'viewer'
        token.id = user.id
        token.role = activeRole
        token.organizationId = activeOrgId
        token.instanceRole = (dbUser?.instanceRole as 'instance_admin' | null) ?? null
        token.checkedAt = Date.now()
        // #527 — record session-issued-at + last-password-changed-at so the
        // per-org session-timeout and password-expiry checks have something
        // to compare against. JWT `iat` is also set by NextAuth, but we
        // duplicate it as a number for clarity.
        token.issuedAt = Date.now()
        token.lastPasswordChangedAt = dbUser?.lastPasswordChangedAt
          ? new Date(dbUser.lastPasswordChangedAt).getTime()
          : null
        // Snapshot the policy fields that the edge middleware needs to make
        // a redirect decision. The middleware can't query the DB (edge
        // runtime / no `net`), so we mirror the policy into the token and
        // refresh it on the same 5-minute cadence as the active-user check.
        if (activeOrgId) {
          const policy = await getOrgSecuritySettings(activeOrgId)
          token.sessionTimeoutMinutes = policy.sessionTimeoutMinutes
          token.passwordExpiryDays = policy.passwordExpiryDays
        }
      } else if (token.id) {
        // #693 slice 3a — explicit active-org switch. The client calls the
        // NextAuth session `update()` after switchActiveOrganization() has
        // persisted the new last_active_organization_id; we re-resolve the
        // active org/role (server-authoritative — we never trust a client-
        // supplied org) and refresh the policy snapshot, then return early.
        if (trigger === 'update') {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, token.id as string),
          })
          if (dbUser) {
            const active = await resolveActiveMembership(token.id as string, dbUser.lastActiveOrganizationId)
            const activeOrgId = active?.organizationId ?? dbUser.organizationId ?? null
            token.role = active?.role ?? dbUser.role ?? 'viewer'
            token.organizationId = activeOrgId
            if (activeOrgId) {
              const policy = await getOrgSecuritySettings(activeOrgId)
              token.sessionTimeoutMinutes = policy.sessionTimeoutMinutes
              token.passwordExpiryDays = policy.passwordExpiryDays
            }
          }
          return token
        }

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
          // Refresh the password-change timestamp so a self-service password
          // change doesn't keep the user redirecting to /change-password.
          token.lastPasswordChangedAt = dbUser?.lastPasswordChangedAt
            ? new Date(dbUser.lastPasswordChangedAt).getTime()
            : null
          if (dbUser?.organizationId) {
            const policy = await getOrgSecuritySettings(dbUser.organizationId)
            token.sessionTimeoutMinutes = policy.sessionTimeoutMinutes
            token.passwordExpiryDays = policy.passwordExpiryDays
          }
        }

        // #527 — per-org session timeout. NextAuth's static `maxAge` is a
        // ceiling (24h); the per-org policy lowers it. Comparing against
        // `issuedAt` (set at initial sign-in) rather than a sliding window
        // matches NIST 800-63B's "reauthenticate after N minutes of session
        // age", not "of inactivity".
        const timeoutMin = token.sessionTimeoutMinutes as number | undefined
        if (timeoutMin && token.issuedAt) {
          const ageMs = Date.now() - (token.issuedAt as number)
          if (ageMs > timeoutMin * 60 * 1000) {
            return null // expires the session — user must re-login
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.organizationId = token.organizationId as string | null
      session.user.instanceRole = (token.instanceRole as 'instance_admin' | null) ?? null
      // #527 — mirror policy snapshot into session.user (see auth.config.ts).
      session.user.lastPasswordChangedAt = (token.lastPasswordChangedAt as number | null) ?? null
      session.user.passwordExpiryDays = (token.passwordExpiryDays as number | undefined) ?? 0
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
        await db.transaction(async (tx) => {
          await tx.update(users).set({ isActive: 'false' }).where(eq(users.id, user.id!))
          await writeAuditLog(tx, {
            action: 'auth.sso_org_binding_failed',
            entityType: 'user',
            entityId: user.id,
            metadata: { email: user.email, reason: 'no_organization_binding' },
          })
        })
      }
    },
    async signIn({ user, account }) {
      // #782 — a successful login ends the logged-out state: delete the
      // resurrection-guard marker so the new session is not mistaken for a
      // post-logout zombie. Best effort: if cookie mutation is unavailable
      // in this flow, the guard's 60s window self-heals.
      try {
        const { cookies } = await import('next/headers')
        ;(await cookies()).delete(LOGGED_OUT_MARKER_COOKIE)
      } catch {
        // not in a mutable-cookie context — covered by the guard window
      }

      const ctx = await getRequestContext()
      await writeAuditLog(db, {
        action: 'auth.login',
        entityType: 'user',
        entityId: user.id,
        userId: user.id,
        organizationId: (user as unknown as AppUser).organizationId,
        metadata: { ip: ctx.ip, userAgent: ctx.userAgent, provider: account?.provider ?? 'credentials' },
      })
    },
    async signOut(message) {
      const token = 'token' in message ? message.token : null
      const ctx = await getRequestContext()
      await writeAuditLog(db, {
        action: 'auth.logout',
        entityType: 'user',
        entityId: token?.id as string | undefined,
        userId: token?.id as string | undefined,
        organizationId: token?.organizationId as string | undefined,
        metadata: { ip: ctx.ip, userAgent: ctx.userAgent },
      })
    },
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
})
