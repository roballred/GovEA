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
