/**
 * Instance-console cross-org membership management + per-org context
 * acceptance tests (#693 slice 4 / slice 5).
 *
 * Covers the #693 acceptance criteria not exercised elsewhere:
 *  - Instance Admins change/revoke/reactivate memberships in ANY org, with
 *    audit events carrying the reason and the target org.
 *  - The per-org last-admin guard applies to instance-console changes too.
 *  - Per-org role enforcement: one identity, admin in org A, viewer in org B.
 *  - Cross-org denial: while active in A, org-private content in B is not
 *    readable even though the user holds a B membership.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db/client'
import { capabilities, userOrganizationMemberships } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, getAuditLogs,
} from './helpers/db'
import type { TestOrg, TestUser } from './helpers/db'
import {
  setMembershipRoleAsInstanceAdmin,
  setMembershipActiveAsInstanceAdmin,
} from '@/actions/instance'
import { getCapabilities } from '@/actions/capabilities'
import { resolveActiveMembership } from '@/lib/active-membership'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let orgA: TestOrg
let orgB: TestOrg
let operator: TestUser   // instance admin (home org A)
let orgBAdmin: TestUser  // keeps org B above the last-admin floor
let subject: TestUser    // the multi-org user under management

async function membershipIn(orgId: string, userId: string) {
  const [m] = await db.select().from(userOrganizationMemberships).where(and(
    eq(userOrganizationMemberships.userId, userId),
    eq(userOrganizationMemberships.organizationId, orgId),
  ))
  return m
}

beforeEach(async () => {
  orgA = await createTestOrg()
  orgB = await createTestOrg()
  operator = await createTestUser(orgA.id, 'admin')
  orgBAdmin = await createTestUser(orgB.id, 'admin')
  subject = await createTestUser(orgA.id, 'admin')

  await db.insert(userOrganizationMemberships).values([
    { userId: operator.id, organizationId: orgA.id, role: 'admin', isPrimary: true },
    { userId: orgBAdmin.id, organizationId: orgB.id, role: 'admin', isPrimary: true },
    // The subject is admin in A (primary) and viewer in B.
    { userId: subject.id, organizationId: orgA.id, role: 'admin', isPrimary: true },
    { userId: subject.id, organizationId: orgB.id, role: 'viewer' },
  ])

  mockAuth.mockResolvedValue(makeSession(operator, { instanceRole: 'instance_admin' }))
})

afterEach(async () => {
  await cleanupOrg(orgA.id)
  await cleanupOrg(orgB.id)
})

describe('instance-console cross-org membership management (#693 slice 4)', () => {
  it('changes a role in another org and audits it with the reason', async () => {
    await setMembershipRoleAsInstanceAdmin(subject.id, orgB.id, 'contributor', 'support rotation')

    const m = await membershipIn(orgB.id, subject.id)
    expect(m.role).toBe('contributor')

    const audits = await getAuditLogs(orgB.id, 'membership.role_changed')
    const entry = audits.find(a => a.entityId === subject.id)
    expect(entry, 'audit row in the TARGET org').toBeDefined()
    expect(entry!.userId).toBe(operator.id)
    expect(entry!.before).toMatchObject({ role: 'viewer' })
    expect(entry!.after).toMatchObject({ role: 'contributor', reason: 'support rotation' })
  })

  it('revokes and reactivates a membership in another org with audit events', async () => {
    await setMembershipActiveAsInstanceAdmin(subject.id, orgB.id, false, 'engagement ended')
    expect((await membershipIn(orgB.id, subject.id)).isActive).toBe(false)
    expect(
      (await getAuditLogs(orgB.id, 'membership.deactivate')).some(a => a.entityId === subject.id),
    ).toBe(true)

    await setMembershipActiveAsInstanceAdmin(subject.id, orgB.id, true, 're-engaged')
    expect((await membershipIn(orgB.id, subject.id)).isActive).toBe(true)
    expect(
      (await getAuditLogs(orgB.id, 'membership.reactivate')).some(a => a.entityId === subject.id),
    ).toBe(true)
  })

  it('last-admin guard applies per org: cannot demote or revoke the sole admin of B', async () => {
    await expect(
      setMembershipRoleAsInstanceAdmin(orgBAdmin.id, orgB.id, 'viewer'),
    ).rejects.toThrow(/last admin/i)
    await expect(
      setMembershipActiveAsInstanceAdmin(orgBAdmin.id, orgB.id, false),
    ).rejects.toThrow(/last admin/i)

    // The same user can be freely managed in an org with admin coverage left.
    await setMembershipRoleAsInstanceAdmin(subject.id, orgA.id, 'contributor')
    expect((await membershipIn(orgA.id, subject.id)).role).toBe('contributor')
  })

  it('rejects unknown memberships and non-instance-admin callers', async () => {
    await expect(
      setMembershipRoleAsInstanceAdmin(randomUUID(), orgB.id, 'viewer'),
    ).rejects.toThrow(/no membership/i)

    mockAuth.mockResolvedValue(makeSession(operator)) // org admin, NOT instance admin
    await expect(
      setMembershipRoleAsInstanceAdmin(subject.id, orgB.id, 'viewer'),
    ).rejects.toThrow(/forbidden/i)
  })
})

describe('per-org role + cross-org denial (#693 acceptance)', () => {
  it('one identity resolves a different role per organization', async () => {
    const inA = await resolveActiveMembership(subject.id, orgA.id)
    const inB = await resolveActiveMembership(subject.id, orgB.id)
    expect(inA).toEqual({ organizationId: orgA.id, role: 'admin' })
    expect(inB).toEqual({ organizationId: orgB.id, role: 'viewer' })
  })

  it('org-private content in B is invisible while active in A, visible while active in B', async () => {
    const capId = randomUUID()
    await db.insert(capabilities).values({
      id: capId, organizationId: orgB.id, name: 'B Private Capability',
      status: 'published', visibility: 'org',
    })

    // Active in A (admin role there).
    mockAuth.mockResolvedValue(makeSession(subject))
    const seenFromA = await getCapabilities()
    expect(seenFromA.some(c => c.id === capId), 'B-private content must not leak into A context').toBe(false)

    // Same identity, now active in B (viewer role there).
    mockAuth.mockResolvedValue(makeSession({ ...subject, organizationId: orgB.id, role: 'viewer' }))
    const seenFromB = await getCapabilities()
    expect(seenFromB.some(c => c.id === capId), 'the same user active in B reads it normally').toBe(true)
  })
})
