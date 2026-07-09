// GovEA role/permission definitions and user-shaped helpers.
//
// The RBAC machinery lives in @govcore/rbac (createRbac). The role and
// permission *definitions* are GovEA-specific and live here. Convenience
// helpers accept the GovEA User shape instead of a bare role string.
// isInstanceAdmin is app-local: it depends on the GovEA instanceRole column.

import { createRbac } from '@govcore/rbac'
import type { User } from '@/db/schema'

export type Role = 'admin' | 'contributor' | 'viewer'

export type Permission =
  | 'content:read'
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'content:publish'
  | 'users:manage'
  | 'settings:manage'

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'content:read',
    'content:create',
    'content:edit',
    'content:delete',
    'content:publish',
    'users:manage',
    'settings:manage',
  ],
  contributor: ['content:read', 'content:create', 'content:edit', 'content:publish'],
  viewer: ['content:read'],
}

const hierarchy: Record<Role, number> = {
  admin: 3,
  contributor: 2,
  viewer: 1,
}

export const rbac = createRbac<Role, Permission>({ rolePermissions, hierarchy })

export function hasPermission(role: Role, permission: Permission): boolean {
  return rbac.hasPermission(role, permission)
}

/**
 * Narrow the denormalized `users.role` text column (`string | null` since the
 * @govcore/schema cutover, #900) to a known {@link Role}. An unknown/null role
 * means no access.
 */
export function isRole(role: string | null | undefined): role is Role {
  return role === 'admin' || role === 'contributor' || role === 'viewer'
}

/** Coerce the denormalized `users.role` text column to a known {@link Role}; an
 *  unknown/null value falls back to the least-privileged `viewer`. */
export function toRole(role: string | null | undefined): Role {
  return isRole(role) ? role : 'viewer'
}

export function hasRole(user: Pick<User, 'role'>, minimum: Role): boolean {
  return isRole(user.role) && rbac.roleAtLeast(user.role, minimum)
}

export function canEdit(user: Pick<User, 'role'>): boolean {
  return isRole(user.role) && rbac.roleAtLeast(user.role, 'contributor')
}

export function isAdmin(user: Pick<User, 'role'>): boolean {
  return user.role === 'admin'
}

export function isInstanceAdmin(user: { instanceRole?: string | null }): boolean {
  return user.instanceRole === 'instance_admin'
}
