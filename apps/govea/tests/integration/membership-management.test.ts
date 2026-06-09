/**
 * Integration tests: org-scoped membership management (#693 slice 4a / #711)
 *
 * Admin-only management of user_organization_memberships for the active org,
 * with a per-org last-admin guard and audit. See docs/design/multi-org-membership.md.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getOrgMemberships, addOrgMembership, updateOrgMembershipRole, setOrgMembershipActive,
} from '@/actions/memberships'
import { db } from '@/db/client'
import { userOrganizationMemberships } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { createTestOrg, createTestUser, cleanupOrg, makeSession, getAuditLogs } from './helpers/db'
import type { TestOrg, TestUser } from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let org: TestOrg
let admin: TestUser

async function membership(userId: string) {
  const [m] = await db.select().from(userOrganizationMemberships)
    .where(and(eq(userOrganizationMemberships.userId, userId), eq(userOrganizationMemberships.organizationId, org.id)))
  return m
}

beforeEach(async () => {
  org = await createTestOrg()
  admin = await createTestUser(org.id, 'admin')
  // The actor's own admin membership in the active org.
  await db.insert(userOrganizationMemberships).values({
    userId: admin.id, organizationId: org.id, role: 'admin', isPrimary: true,
  })
  mockAuth.mockResolvedValue(makeSession(admin))
})

afterEach(async () => {
  await cleanupOrg(org.id)
})

describe('membership management (#693 slice 4a)', () => {
  it('lists the active org memberships', async () => {
    const rows = await getOrgMemberships()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ userId: admin.id, role: 'admin', isActive: true })
  })

  it('adds an existing user as a member and audits it', async () => {
    const bob = await createTestUser(org.id, 'viewer')
    await addOrgMembership(bob.email, 'contributor')
    expect(await membership(bob.id)).toMatchObject({ role: 'contributor', isActive: true })
    expect((await getAuditLogs(org.id, 'membership.add')).length).toBeGreaterThanOrEqual(1)
  })

  it('rejects adding an unknown email', async () => {
    await expect(addOrgMembership('nobody@nowhere.example', 'viewer'))
      .rejects.toThrow(/no user with that email/i)
  })

  it('reactivates a soft-deactivated membership instead of duplicating', async () => {
    const bob = await createTestUser(org.id, 'viewer')
    await addOrgMembership(bob.email, 'viewer')
    await setOrgMembershipActive(bob.id, false)
    expect((await membership(bob.id)).isActive).toBe(false)
    await addOrgMembership(bob.email, 'admin')
    const m = await membership(bob.id)
    expect(m).toMatchObject({ role: 'admin', isActive: true })
    // still exactly one row for (bob, org)
    const all = await db.select().from(userOrganizationMemberships)
      .where(and(eq(userOrganizationMemberships.userId, bob.id), eq(userOrganizationMemberships.organizationId, org.id)))
    expect(all).toHaveLength(1)
  })

  it('changes a member role', async () => {
    const bob = await createTestUser(org.id, 'viewer')
    await addOrgMembership(bob.email, 'viewer')
    await updateOrgMembershipRole(bob.id, 'contributor')
    expect((await membership(bob.id)).role).toBe('contributor')
  })

  it('last-admin guard: refuses to demote the only active admin', async () => {
    await expect(updateOrgMembershipRole(admin.id, 'viewer'))
      .rejects.toThrow(/last admin/i)
    expect((await membership(admin.id)).role).toBe('admin') // unchanged
  })

  it('last-admin guard: refuses to deactivate the only active admin', async () => {
    await expect(setOrgMembershipActive(admin.id, false))
      .rejects.toThrow(/last admin/i)
    expect((await membership(admin.id)).isActive).toBe(true) // unchanged
  })

  it('allows demoting an admin once a second admin exists', async () => {
    const bob = await createTestUser(org.id, 'viewer')
    await addOrgMembership(bob.email, 'admin') // now two active admins
    await updateOrgMembershipRole(admin.id, 'contributor') // permitted
    expect((await membership(admin.id)).role).toBe('contributor')
  })
})
