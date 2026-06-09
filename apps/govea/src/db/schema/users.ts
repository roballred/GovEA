import { boolean, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const userRoleEnum = pgEnum('user_role', ['admin', 'contributor', 'viewer'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  // #693 slice 3a: the user's last-selected active org, honored first by
  // resolveActiveMembership when it's still an active membership. Nullable
  // (most users never switch); `set null` so deleting an org doesn't orphan.
  lastActiveOrganizationId: uuid('last_active_organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull().default('viewer'),
  instanceRole: text('instance_role'),
  isActive: text('is_active').notNull().default('true'),
  // #527: account lockout + password expiry tracking (per-org policy lives
  // on organizations.securitySettings; these columns store the per-user
  // state that the policy is evaluated against on each login).
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockoutUntil: timestamp('lockout_until'),
  lastPasswordChangedAt: timestamp('last_password_changed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  // Global unique constraint: one identity per email address across all orgs.
  // GovEA's identity model is one-user-one-org; a person who needs access to
  // multiple orgs must use separate email addresses. This makes auth and SSO
  // lookups by bare email unambiguous and prevents cross-tenant identity binding
  // bugs. See issue #269.
  uniqueIndex('users_email_unique').on(table.email),
])

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: timestamp('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// #693 slice 1 (#703): membership model for users participating in more than
// one organization. Behavior-neutral at introduction — nothing reads this yet;
// auth resolution of the *active* org/role from memberships is slice 2.
// `users.organization_id` / `users.role` remain the denormalized active/home
// pointers (see docs/design/multi-org-membership.md). One row per (user, org),
// one role per membership; revocation soft-deactivates (is_active=false) so the
// historical row survives for audit.
export const userOrganizationMemberships = pgTable('user_organization_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull().default('viewer'),
  isActive: boolean('is_active').notNull().default(true),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  // One membership per user per organization.
  uniqueIndex('user_org_membership_unique').on(table.userId, table.organizationId),
])

export type UserOrganizationMembership = typeof userOrganizationMemberships.$inferSelect
export type NewUserOrganizationMembership = typeof userOrganizationMemberships.$inferInsert
