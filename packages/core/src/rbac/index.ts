// ---------------------------------------------------------------------------
// Role-Based Access Control
// Roles are strings. Permissions are defined per content type and per action.
// The check() function is used in API routes and server actions.
// ---------------------------------------------------------------------------

export type Action = 'create' | 'read' | 'update' | 'delete' | 'publish' | 'archive'

export interface RoleDefinition {
  name: string
  label: string
  description?: string
  // Wildcard '*' grants all actions on all content types
  permissions: Array<{
    contentType: string | '*'
    actions: Action[] | '*'
  }>
}

class RBACRegistry {
  private roles = new Map<string, RoleDefinition>()

  register(role: RoleDefinition): void {
    this.roles.set(role.name, role)
  }

  get(name: string): RoleDefinition | undefined {
    return this.roles.get(name)
  }

  getAll(): RoleDefinition[] {
    return Array.from(this.roles.values())
  }

  can(
    userRole: string,
    contentType: string,
    action: Action
  ): boolean {
    const role = this.roles.get(userRole)
    if (!role) return false

    for (const permission of role.permissions) {
      const typeMatch =
        permission.contentType === '*' || permission.contentType === contentType
      const actionMatch =
        permission.actions === '*' || permission.actions.includes(action)

      if (typeMatch && actionMatch) return true
    }

    return false
  }
}

export const rbac = new RBACRegistry()

export function defineRole(role: RoleDefinition): RoleDefinition {
  rbac.register(role)
  return role
}

// GovEA default roles — registered by the app, not the core
// Exported here as a convenience for apps to use as starting points
export const BUILT_IN_ROLES = {
  ADMIN: 'admin',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer',
} as const

export type BuiltInRole = typeof BUILT_IN_ROLES[keyof typeof BUILT_IN_ROLES]
