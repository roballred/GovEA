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

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['content:read', 'content:create', 'content:edit', 'content:delete', 'content:publish', 'users:manage', 'settings:manage'],
  contributor: ['content:read', 'content:create', 'content:edit', 'content:publish'],
  viewer: ['content:read'],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

const ROLE_HIERARCHY: Record<Role, number> = { admin: 3, contributor: 2, viewer: 1 }

export function hasRole(user: Pick<User, 'role'>, minimum: Role): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimum]
}

export function canEdit(user: Pick<User, 'role'>): boolean {
  return hasRole(user, 'contributor')
}

export function isAdmin(user: Pick<User, 'role'>): boolean {
  return user.role === 'admin'
}
