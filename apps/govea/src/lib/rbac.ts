import type { User } from '@/db/schema'

export type Role = 'admin' | 'contributor' | 'viewer'

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  contributor: 2,
  viewer: 1,
}

export function hasRole(user: Pick<User, 'role'>, minimum: Role): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimum]
}

export function isAdmin(user: Pick<User, 'role'>): boolean {
  return user.role === 'admin'
}

export function canEdit(user: Pick<User, 'role'>): boolean {
  return hasRole(user, 'contributor')
}
