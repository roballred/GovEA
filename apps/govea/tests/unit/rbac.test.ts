import { describe, it, expect } from 'vitest'
import { isInstanceAdmin } from '@/lib/rbac'

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
