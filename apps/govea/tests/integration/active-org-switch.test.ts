/**
 * Integration tests: switchActiveOrganization (#693 slice 3a / #707)
 *
 * Server-authoritative active-org switch: persists last_active_organization_id
 * only for an org where the caller has an active membership; rejects otherwise.
 * See docs/design/multi-org-membership.md.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { switchActiveOrganization } from '@/actions/active-org'
import { db } from '@/db/client'
import { userOrganizationMemberships } from '@/db/schema'
import { createTestOrg, createTestUser, cleanupOrg, makeSession, findUser, getAuditLogs } from './helpers/db'
import type { TestOrg, TestUser } from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let orgA: TestOrg
let orgB: TestOrg
let orgC: TestOrg
let user: TestUser

beforeEach(async () => {
  orgA = await createTestOrg()
  orgB = await createTestOrg()
  orgC = await createTestOrg()
  user = await createTestUser(orgA.id, 'admin')
  // Active member of A (admin) and B (viewer); NOT a member of C.
  await db.insert(userOrganizationMemberships).values([
    { userId: user.id, organizationId: orgA.id, role: 'admin', isPrimary: true },
    { userId: user.id, organizationId: orgB.id, role: 'viewer', isPrimary: false },
  ])
  mockAuth.mockResolvedValue(makeSession(user))
})

afterEach(async () => {
  await cleanupOrg(orgA.id)
  await cleanupOrg(orgB.id)
  await cleanupOrg(orgC.id)
})

describe('switchActiveOrganization (#693 slice 3a)', () => {
  it('persists last_active_organization_id for an org the user actively belongs to', async () => {
    await switchActiveOrganization(orgB.id)
    const updated = await findUser(user.id)
    expect(updated?.lastActiveOrganizationId).toBe(orgB.id)

    const audits = await getAuditLogs(orgB.id, 'auth.switch_active_org')
    expect(audits.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects switching to an org the user is not a member of', async () => {
    await expect(switchActiveOrganization(orgC.id)).rejects.toThrow(/not an active member/i)
    const updated = await findUser(user.id)
    expect(updated?.lastActiveOrganizationId).toBeNull()
  })

  it('rejects switching to an org where the membership is inactive', async () => {
    await db.insert(userOrganizationMemberships).values({
      userId: user.id, organizationId: orgC.id, role: 'viewer', isActive: false,
    })
    await expect(switchActiveOrganization(orgC.id)).rejects.toThrow(/not an active member/i)
    const updated = await findUser(user.id)
    expect(updated?.lastActiveOrganizationId).toBeNull()
  })
})
