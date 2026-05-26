// @govea/core/rbac — single source of truth for GovEA role and permission
// definitions. App-level helpers in `apps/govea/src/lib/rbac.ts` are thin
// wrappers around the role-shaped functions exported here.
//
// Closes #34. ADR-009 records the consolidation decision.

export type Role = 'admin' | 'contributor' | 'viewer'

export type Permission =
  | 'content:read'
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'content:publish'
  | 'users:manage'
  | 'settings:manage'

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
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

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

// Ordering: admin > contributor > viewer. `roleAtLeast(actual, minimum)` is
// true when `actual` is at or above `minimum` in the hierarchy.
export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  contributor: 2,
  viewer: 1,
}

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum]
}

export function roleIsAdmin(role: Role): boolean {
  return role === 'admin'
}

export function roleCanEdit(role: Role): boolean {
  return roleAtLeast(role, 'contributor')
}
