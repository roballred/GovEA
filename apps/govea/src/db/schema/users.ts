/**
 * Identity, the Auth.js adapter tables, and the membership model — owned by
 * `@govcore/schema` and re-exported for `@/db/schema` consumers. Phase 1b (#900).
 *
 * The local `user_role` pgEnum is retired: `@govcore/schema` stores `role` as
 * `text` (GovCore ships no role vocabulary of its own), and the app's `Role`
 * union comes from `@/lib/rbac`. `users.organization_id` is nullable with
 * `ON DELETE SET NULL` in core (GovEA ADR-0006 / GovCore #104), preserving the
 * platform-only-operator + no-cascade-identity-delete behavior.
 */
export {
  users,
  accounts,
  sessions,
  verificationTokens,
  userOrganizationMemberships,
  type User,
  type NewUser,
  type UserOrganizationMembership,
  type NewUserOrganizationMembership,
} from '@govcore/schema'
