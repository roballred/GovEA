import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  hasRole,
  canEdit,
  isAdmin,
  isInstanceAdmin,
  type Permission,
  type Role,
} from '@/lib/rbac'

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

describe('hasPermission', () => {
  describe('admin', () => {
    const permissions: Permission[] = [
      'content:read',
      'content:create',
      'content:edit',
      'content:delete',
      'content:publish',
      'users:manage',
      'settings:manage',
    ]
    it.each(permissions)('has %s', (p) => {
      expect(hasPermission('admin', p)).toBe(true)
    })
  })

  describe('contributor', () => {
    const allowed: Permission[] = [
      'content:read',
      'content:create',
      'content:edit',
      'content:publish',
    ]
    const denied: Permission[] = ['content:delete', 'users:manage', 'settings:manage']

    it.each(allowed)('has %s', (p) => {
      expect(hasPermission('contributor', p)).toBe(true)
    })
    it.each(denied)('does not have %s', (p) => {
      expect(hasPermission('contributor', p)).toBe(false)
    })
  })

  describe('viewer', () => {
    const denied: Permission[] = [
      'content:create',
      'content:edit',
      'content:delete',
      'content:publish',
      'users:manage',
      'settings:manage',
    ]

    it('has content:read', () => {
      expect(hasPermission('viewer', 'content:read')).toBe(true)
    })
    it.each(denied)('does not have %s', (p) => {
      expect(hasPermission('viewer', p)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// hasRole — hierarchy: admin(3) > contributor(2) > viewer(1)
// ---------------------------------------------------------------------------

describe('hasRole', () => {
  it.each<[Role, Role, boolean]>([
    ['admin',       'admin',       true],
    ['admin',       'contributor', true],
    ['admin',       'viewer',      true],
    ['contributor', 'admin',       false],
    ['contributor', 'contributor', true],
    ['contributor', 'viewer',      true],
    ['viewer',      'admin',       false],
    ['viewer',      'contributor', false],
    ['viewer',      'viewer',      true],
  ])('%s meets minimum %s → %s', (role, minimum, expected) => {
    expect(hasRole({ role }, minimum)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// canEdit — requires contributor or higher
// ---------------------------------------------------------------------------

describe('canEdit', () => {
  it('returns true for admin', () => {
    expect(canEdit({ role: 'admin' })).toBe(true)
  })

  it('returns true for contributor', () => {
    expect(canEdit({ role: 'contributor' })).toBe(true)
  })

  it('returns false for viewer', () => {
    expect(canEdit({ role: 'viewer' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isAdmin
// ---------------------------------------------------------------------------

describe('isAdmin', () => {
  it('returns true for admin role', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
  })

  it('returns false for contributor', () => {
    expect(isAdmin({ role: 'contributor' })).toBe(false)
  })

  it('returns false for viewer', () => {
    expect(isAdmin({ role: 'viewer' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isInstanceAdmin
// ---------------------------------------------------------------------------

describe('isInstanceAdmin', () => {
  it('returns true for instance_admin role', () => {
    expect(isInstanceAdmin({ instanceRole: 'instance_admin' })).toBe(true)
  })

  it('returns false for null instanceRole', () => {
    expect(isInstanceAdmin({ instanceRole: null })).toBe(false)
  })

  it('returns false for undefined instanceRole', () => {
    expect(isInstanceAdmin({ instanceRole: undefined })).toBe(false)
  })

  it('returns false for an org-scoped admin', () => {
    expect(isInstanceAdmin({ instanceRole: null })).toBe(false)
  })

  it('returns false for any unexpected string value', () => {
    expect(isInstanceAdmin({ instanceRole: 'admin' })).toBe(false)
    expect(isInstanceAdmin({ instanceRole: 'superuser' })).toBe(false)
  })
})
