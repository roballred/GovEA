/**
 * RBAC single-source-of-truth regression test (#34).
 *
 * Asserts that:
 *   1. The canonical RBAC types and constants live in @govea/core/rbac.
 *   2. apps/govea/src/lib/rbac.ts re-exports the same types and constants
 *      from @govea/core (functional equivalence on Permission checks).
 *   3. The app-side rbac module does NOT redefine ROLE_PERMISSIONS or
 *      ROLE_HIERARCHY locally — a literal string check guards against the
 *      duplication coming back the next time someone edits the file.
 *
 * If this test fails after a refactor, you have either:
 *   - changed the role/permission shape without updating @govea/core
 *     (fix: update the canonical definitions and re-run the test), or
 *   - re-introduced parallel definitions in the app's rbac module
 *     (fix: import from @govea/core instead).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as core from '@govea/core'
import * as appRbac from '@/lib/rbac'

describe('RBAC single source of truth', () => {
  it('re-exports Permission check from @govea/core', () => {
    expect(appRbac.hasPermission('admin', 'users:manage')).toBe(true)
    expect(appRbac.hasPermission('contributor', 'users:manage')).toBe(false)
    expect(appRbac.hasPermission('viewer', 'content:read')).toBe(true)
    expect(appRbac.hasPermission('viewer', 'content:create')).toBe(false)
  })

  it('app-side hasPermission delegates to core (identical references)', () => {
    // appRbac re-exports `hasPermission` from core, so the function
    // reference must be identical.
    expect(appRbac.hasPermission).toBe(core.hasPermission)
  })

  it('app-side ROLE_HIERARCHY delegates to core', () => {
    expect(appRbac.ROLE_HIERARCHY).toBe(core.ROLE_HIERARCHY)
    expect(appRbac.ROLE_HIERARCHY.admin).toBe(3)
    expect(appRbac.ROLE_HIERARCHY.contributor).toBe(2)
    expect(appRbac.ROLE_HIERARCHY.viewer).toBe(1)
  })

  it('app-side user-shaped helpers wrap the core role-level checks', () => {
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

  it('does not redefine ROLE_PERMISSIONS or ROLE_HIERARCHY in the app rbac source', () => {
    // String-level guard: blocks the duplicated-definition pattern from
    // creeping back in. Catches "const ROLE_PERMISSIONS" / "const
    // ROLE_HIERARCHY" anywhere in the app's rbac module.
    const source = readFileSync(
      join(__dirname, '..', '..', 'src', 'lib', 'rbac.ts'),
      'utf-8',
    )

    expect(source).not.toMatch(/^\s*(?:export\s+)?const\s+ROLE_PERMISSIONS\b/m)
    expect(source).not.toMatch(/^\s*(?:export\s+)?const\s+ROLE_HIERARCHY\s*[:=]/m)
  })
})
