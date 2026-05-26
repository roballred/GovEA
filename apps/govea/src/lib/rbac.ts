// Thin user-shaped wrappers around the canonical role definitions in
// `@govea/core/rbac`. The package is the single source of truth for
// Role, Permission, ROLE_PERMISSIONS, ROLE_HIERARCHY, and the role-level
// check functions. This file exists solely to provide convenience helpers
// that accept the GovEA `User` shape instead of a bare role string, and to
// host the GovEA-specific `isInstanceAdmin` check that depends on the
// app's `instanceRole` column.
//
// Closes #34. Do NOT re-introduce `ROLE_PERMISSIONS`, `ROLE_HIERARCHY`,
// `Role`, or `Permission` constants here — the integration test in
// `apps/govea/tests/integration/rbac-single-source.test.ts` will fail
// if any of those names are defined locally.

import type { User } from '@/db/schema'
import {
  type Role,
  type Permission,
  ROLE_HIERARCHY,
  hasPermission,
  roleAtLeast,
  roleCanEdit,
  roleIsAdmin,
} from '@govea/core'

export type { Role, Permission }
export { ROLE_HIERARCHY, hasPermission }

export function hasRole(user: Pick<User, 'role'>, minimum: Role): boolean {
  return roleAtLeast(user.role, minimum)
}

export function canEdit(user: Pick<User, 'role'>): boolean {
  return roleCanEdit(user.role)
}

export function isAdmin(user: Pick<User, 'role'>): boolean {
  return roleIsAdmin(user.role)
}

export function isInstanceAdmin(user: { instanceRole?: string | null }): boolean {
  return user.instanceRole === 'instance_admin'
}
