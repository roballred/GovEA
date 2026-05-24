/**
 * Integration tests: getUnlockedOrgIds (#436)
 *
 * The multi-org break-glass query used by `/instance/users` and
 * `/instance/orgs/[id]` to gate cross-tenant user-PII reads. Same gating
 * rules as `requireBreakGlass`, exercised against rows directly so each
 * scenario can pin the exact state under test (approved vs pending vs
 * expired vs revoked) without timer mocks.
 *
 * Capability: iam-instance-administration, iam-role-based-access-control
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { db } from '@/db/client'
import { breakGlassSessions } from '@/db/schema'
import { eq, or } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { getUnlockedOrgIds } from '@/lib/break-glass'
import {
  createTestOrg,
  createTestUser,
  cleanupOrg,
  type TestUser,
} from './helpers/db'

let homeOrgId: string
let orgA: string
let orgB: string
let orgC: string
let adminMe: TestUser
let adminOther: TestUser

beforeAll(async () => {
  const [home, a, b, c] = await Promise.all([
    createTestOrg(),
    createTestOrg(),
    createTestOrg(),
    createTestOrg(),
  ])
  homeOrgId = home.id
  orgA = a.id
  orgB = b.id
  orgC = c.id
  ;[adminMe, adminOther] = await Promise.all([
    createTestUser(homeOrgId, 'admin'),
    createTestUser(homeOrgId, 'admin'),
  ])
})

afterAll(async () => {
  await db.delete(breakGlassSessions).where(
    or(
      eq(breakGlassSessions.targetOrgId, orgA),
      eq(breakGlassSessions.targetOrgId, orgB),
      eq(breakGlassSessions.targetOrgId, orgC),
      eq(breakGlassSessions.targetOrgId, homeOrgId),
    ),
  )
  await Promise.all([
    cleanupOrg(homeOrgId),
    cleanupOrg(orgA),
    cleanupOrg(orgB),
    cleanupOrg(orgC),
  ])
})

beforeEach(async () => {
  await db.delete(breakGlassSessions).where(
    or(
      eq(breakGlassSessions.targetOrgId, orgA),
      eq(breakGlassSessions.targetOrgId, orgB),
      eq(breakGlassSessions.targetOrgId, orgC),
    ),
  )
})

// Helper: insert a row with explicit state. Mirrors the shape grantBreakGlass
// would produce, but skips the action layer so each test can pin expiresAt
// and approvedAt independently of the action's TTL logic.
async function insertSession(opts: {
  adminId: string
  orgId: string
  expiresAt: Date
  approved: boolean
  revoked?: boolean
  requiresApproval?: boolean
}) {
  await db.insert(breakGlassSessions).values({
    id: randomUUID(),
    instanceAdminId: opts.adminId,
    targetOrgId: opts.orgId,
    reason: 'test',
    grantedAt: new Date(),
    expiresAt: opts.expiresAt,
    requiresApproval: opts.requiresApproval ?? false,
    approvedAt: opts.approved ? new Date() : null,
    approvedBy: opts.approved ? opts.adminId : null,
    revokedAt: opts.revoked ? new Date() : null,
  })
}

const future = () => new Date(Date.now() + 60 * 60 * 1000) // +1 hour
const past = () => new Date(Date.now() - 60 * 1000)        // -1 minute

describe('getUnlockedOrgIds (#436)', () => {
  it('returns an empty set when the admin has no sessions', async () => {
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(result.size).toBe(0)
  })

  it('returns orgs for active, no-approval-needed sessions', async () => {
    await insertSession({ adminId: adminMe.id, orgId: orgA, expiresAt: future(), approved: false, requiresApproval: false })
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(Array.from(result)).toEqual([orgA])
  })

  it('returns orgs for active, approved sessions', async () => {
    await insertSession({ adminId: adminMe.id, orgId: orgA, expiresAt: future(), approved: true, requiresApproval: true })
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(Array.from(result)).toEqual([orgA])
  })

  it('does NOT return orgs for pending-approval sessions', async () => {
    await insertSession({ adminId: adminMe.id, orgId: orgA, expiresAt: future(), approved: false, requiresApproval: true })
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(result.size).toBe(0)
  })

  it('does NOT return orgs for expired sessions', async () => {
    await insertSession({ adminId: adminMe.id, orgId: orgA, expiresAt: past(), approved: true, requiresApproval: false })
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(result.size).toBe(0)
  })

  it('does NOT return orgs for revoked sessions', async () => {
    await insertSession({ adminId: adminMe.id, orgId: orgA, expiresAt: future(), approved: true, revoked: true, requiresApproval: false })
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(result.size).toBe(0)
  })

  it('returns multiple orgs when the admin has sessions for several at once', async () => {
    await Promise.all([
      insertSession({ adminId: adminMe.id, orgId: orgA, expiresAt: future(), approved: true, requiresApproval: false }),
      insertSession({ adminId: adminMe.id, orgId: orgB, expiresAt: future(), approved: true, requiresApproval: true }),
    ])
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(Array.from(result).sort()).toEqual([orgA, orgB].sort())
  })

  it('does NOT return orgs that another admin has elevated against', async () => {
    // adminOther holds break-glass for orgA. adminMe must not inherit it.
    await insertSession({ adminId: adminOther.id, orgId: orgA, expiresAt: future(), approved: true, requiresApproval: false })
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(result.size).toBe(0)
  })

  it('partitions correctly when both admins have overlapping but distinct sessions', async () => {
    await Promise.all([
      insertSession({ adminId: adminMe.id,    orgId: orgA, expiresAt: future(), approved: true, requiresApproval: false }),
      insertSession({ adminId: adminMe.id,    orgId: orgB, expiresAt: future(), approved: true, requiresApproval: false }),
      insertSession({ adminId: adminOther.id, orgId: orgB, expiresAt: future(), approved: true, requiresApproval: false }),
      insertSession({ adminId: adminOther.id, orgId: orgC, expiresAt: future(), approved: true, requiresApproval: false }),
    ])
    const me = await getUnlockedOrgIds(adminMe.id)
    const other = await getUnlockedOrgIds(adminOther.id)
    expect(Array.from(me).sort()).toEqual([orgA, orgB].sort())
    expect(Array.from(other).sort()).toEqual([orgB, orgC].sort())
  })

  it('mixed-state sessions for one admin produce only the active+approved ones', async () => {
    await Promise.all([
      insertSession({ adminId: adminMe.id, orgId: orgA, expiresAt: future(), approved: true,  requiresApproval: false }),
      insertSession({ adminId: adminMe.id, orgId: orgB, expiresAt: future(), approved: false, requiresApproval: true  }), // pending
      insertSession({ adminId: adminMe.id, orgId: orgC, expiresAt: past(),   approved: true,  requiresApproval: false }), // expired
    ])
    const result = await getUnlockedOrgIds(adminMe.id)
    expect(Array.from(result)).toEqual([orgA])
  })
})
