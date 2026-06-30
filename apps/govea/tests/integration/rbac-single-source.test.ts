/**
 * RBAC single-source-of-truth regression test.
 *
 * Phase 0 of the GovCore cutover: the RBAC machinery now lives in
 * @govcore/rbac (createRbac). GovEA's role/permission definitions are
 * app-local (GovEA-specific); the generic engine is the shared source.
 *
 * Verifies:
 *   1. The rbac instance's permission checks are correct.
 *   2. User-shaped helpers in lib/rbac.ts delegate to the rbac instance.
 *   3. isInstanceAdmin remains app-local (depends on GovEA user shape).
 */
import { describe, it, expect } from 'vitest'
import * as appRbac from '@/lib/rbac'

describe('RBAC single source of truth (@govcore/rbac)', () => {
  it('hasPermission returns correct results', () => {
    expect(appRbac.hasPermission('admin', 'users:manage')).toBe(true)
    expect(appRbac.hasPermission('contributor', 'users:manage')).toBe(false)
    expect(appRbac.hasPermission('viewer', 'content:read')).toBe(true)
    expect(appRbac.hasPermission('viewer', 'content:create')).toBe(false)
  })

  it('rbac instance has correct role hierarchy', () => {
    expect(appRbac.rbac.hierarchy.admin).toBe(3)
    expect(appRbac.rbac.hierarchy.contributor).toBe(2)
    expect(appRbac.rbac.hierarchy.viewer).toBe(1)
  })

  it('user-shaped helpers wrap the rbac instance', () => {
    const admin = { role: 'admin' as const }
    const contributor = { role: 'contributor' as const }
    const viewer = { role: 'viewer' as const }

    expect(appRbac.isAdmin(admin)).toBe(true)
    expect(appRbac.isAdmin(contributor)).toBe(false)

    expect(appRbac.canEdit(admin)).toBe(true)
    expect(appRbac.canEdit(contributor)).toBe(true)
    expect(appRbac.canEdit(viewer)).toBe(false)

    expect(appRbac.hasRole(admin, 'contributor')).toBe(true)
    expect(appRbac.hasRole(contributor, 'admin')).toBe(false)
  })

  it('isInstanceAdmin remains app-local (depends on GovEA user shape)', () => {
    expect(appRbac.isInstanceAdmin({ instanceRole: 'instance_admin' })).toBe(true)
    expect(appRbac.isInstanceAdmin({ instanceRole: null })).toBe(false)
    expect(appRbac.isInstanceAdmin({})).toBe(false)
  })
})
