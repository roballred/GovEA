/**
 * Integration tests: SSO provisioning guard (#213)
 *
 * Covers:
 *  - Not-provisioned identity is blocked (no DB record for the email)
 *  - Deactivated user is blocked
 *  - User with no org binding is blocked (defense-in-depth; schema makes this
 *    impossible in normal operation but guard must handle it explicitly)
 *  - Fully provisioned, active user with org binding is allowed
 *  - Same-email-across-orgs: first record wins (documented limitation until
 *    a global unique constraint is added in the first real-tenant migration)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { checkSsoProvisioning } from '@/lib/sso-guard'
import {
  createTestOrg, createTestUser, cleanupOrg,
  type TestUser,
} from './helpers/db'

describe('checkSsoProvisioning', () => {
  let orgId: string
  let activeUser: TestUser
  let inactiveUser: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[activeUser, inactiveUser] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
    // Deactivate the inactive user directly
    await db.update(users).set({ isActive: 'false' }).where(eq(users.id, inactiveUser.id))
  })

  afterAll(() => cleanupOrg(orgId))

  it('returns not_provisioned for an email not in the database', async () => {
    const result = await checkSsoProvisioning('no-such-user@example.com')
    expect(result.status).toBe('not_provisioned')
  })

  it('returns deactivated for an inactive user', async () => {
    const result = await checkSsoProvisioning(inactiveUser.email)
    expect(result.status).toBe('deactivated')
    if (result.status === 'deactivated') {
      expect(result.userId).toBe(inactiveUser.id)
    }
  })

  it('returns allowed for a fully provisioned, active user', async () => {
    const result = await checkSsoProvisioning(activeUser.email)
    expect(result.status).toBe('allowed')
    if (result.status === 'allowed') {
      expect(result.userId).toBe(activeUser.id)
      expect(result.organizationId).toBe(orgId)
      expect(result.role).toBe('contributor')
    }
  })

  it('allowed result carries correct role and org', async () => {
    const adminUser = await createTestUser(orgId, 'admin')
    const result = await checkSsoProvisioning(adminUser.email)
    expect(result.status).toBe('allowed')
    if (result.status === 'allowed') {
      expect(result.role).toBe('admin')
      expect(result.organizationId).toBe(orgId)
    }
  })

  it('no_org_binding is returned when organizationId is null (safety net case)', async () => {
    // Simulate a user that somehow has no org binding (e.g. adapter created
    // the row before the NOT NULL migration was applied, or a manual DB edit).
    // We patch directly because the normal create path always sets organizationId.
    const boundUser = await createTestUser(orgId, 'viewer')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.update(users).set({ organizationId: null as any }).where(eq(users.id, boundUser.id))

    const result = await checkSsoProvisioning(boundUser.email)
    expect(result.status).toBe('no_org_binding')
    if (result.status === 'no_org_binding') {
      expect(result.userId).toBe(boundUser.id)
    }

    // Restore so cleanupOrg can cascade-delete without FK issues
    await db.update(users).set({ organizationId: orgId }).where(eq(users.id, boundUser.id))
  })
})
