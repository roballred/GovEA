/**
 * Integration tests: break-glass approval flow (#418)
 *
 * Covers the dual-control + TTL hardening shipped under Option 2:
 *   - Default TTL is 1 hour; sessions ≤ 1h are immediately active
 *   - TTL > 1h yields a pending session that requireBreakGlass() refuses
 *     until a different instance admin approves it
 *   - Self-approval is rejected
 *   - Approval after a peer admin has approved is rejected
 *   - Expired or revoked sessions cannot be approved
 *   - notifyBreakGlassEvent fires on grant + approval (best-effort, sink-replaceable)
 *   - Audit-log rows are written under the surrounding transaction
 *   - Invalid TTL values are rejected
 *   - Empty / whitespace reasons are rejected
 *
 * Capability: iam-instance-administration, iam-role-based-access-control
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import {
  grantBreakGlass,
  approveBreakGlass,
  revokeBreakGlass,
} from '@/actions/instance'
import { requireBreakGlass } from '@/lib/break-glass'
import {
  resetBreakGlassNotificationSink,
  setBreakGlassNotificationSink,
  type BreakGlassNotification,
} from '@/lib/notifications/break-glass'
import { db } from '@/db/client'
import { breakGlassSessions, auditLog } from '@/db/schema'
import { and, eq, isNull, or, desc } from 'drizzle-orm'
import {
  createTestOrg,
  createTestUser,
  cleanupOrg,
  makeSession,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

const mockRevalidate = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

let homeOrgId: string
let targetOrgId: string
let adminA: TestUser
let adminB: TestUser

beforeAll(async () => {
  const [home, target] = await Promise.all([createTestOrg(), createTestOrg()])
  homeOrgId = home.id
  targetOrgId = target.id
  ;[adminA, adminB] = await Promise.all([
    createTestUser(homeOrgId, 'admin'),
    createTestUser(homeOrgId, 'admin'),
  ])
})

afterAll(async () => {
  await db.delete(breakGlassSessions).where(
    or(
      eq(breakGlassSessions.targetOrgId, targetOrgId),
      eq(breakGlassSessions.targetOrgId, homeOrgId),
    ),
  )
  await cleanupOrg(homeOrgId)
  await cleanupOrg(targetOrgId)
})

function asAdmin(user: TestUser) {
  mockAuth.mockResolvedValue(makeSession(user, { instanceRole: 'instance_admin' }))
}

// Each test starts with a clean slate for break-glass sessions against
// targetOrgId — multiple concurrent valid sessions are legitimate at runtime
// (covered by instance-hardening), but they make per-scenario assertions on
// requireBreakGlass()'s return value harder to reason about.
beforeEach(async () => {
  await db.delete(breakGlassSessions).where(eq(breakGlassSessions.targetOrgId, targetOrgId))
})

async function latestSessionFor(adminId: string) {
  return db.query.breakGlassSessions.findFirst({
    where: and(
      eq(breakGlassSessions.instanceAdminId, adminId),
      eq(breakGlassSessions.targetOrgId, targetOrgId),
      isNull(breakGlassSessions.revokedAt),
    ),
    orderBy: (s, { desc }) => [desc(s.grantedAt)],
  })
}

// ── TTL = 60 (no approval needed) ────────────────────────────────────────────

describe('grantBreakGlass — TTL = 60 (no approval needed)', () => {
  it('uses 1 hour as the default TTL', async () => {
    asAdmin(adminA)
    const before = Date.now()
    await grantBreakGlass(targetOrgId, 'Default TTL test')

    const session = await latestSessionFor(adminA.id)
    expect(session).toBeDefined()
    const ttlMs = session!.expiresAt.getTime() - session!.grantedAt.getTime()
    expect(ttlMs).toBeGreaterThan(59 * 60_000)
    expect(ttlMs).toBeLessThan(61 * 60_000)
    expect(session!.requiresApproval).toBe(false)
    expect(session!.expiresAt.getTime()).toBeGreaterThan(before)
  })

  it('requireBreakGlass returns the session immediately', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Immediate access', 60)

    const result = await requireBreakGlass(adminA.id, targetOrgId)
    expect(result).not.toBeNull()
    expect(result!.requiresApproval).toBe(false)
    expect(result!.approvedAt).toBeNull()
  })
})

// ── TTL > 60 (pending approval) ──────────────────────────────────────────────

describe('grantBreakGlass — TTL > 60 (pending approval)', () => {
  it('marks the session as requiring approval and requireBreakGlass refuses until approved', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Long incident', 240)

    const session = await latestSessionFor(adminA.id)
    expect(session!.requiresApproval).toBe(true)
    expect(session!.approvedAt).toBeNull()

    // Pre-approval: requireBreakGlass refuses
    const pre = await requireBreakGlass(adminA.id, targetOrgId)
    expect(pre).toBeNull()
  })

  it('a peer admin can approve, after which requireBreakGlass returns the session', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Approve flow', 240)
    const session = await latestSessionFor(adminA.id)

    asAdmin(adminB)
    await approveBreakGlass(session!.id)

    const reread = await db.query.breakGlassSessions.findFirst({
      where: eq(breakGlassSessions.id, session!.id),
    })
    expect(reread!.approvedAt).not.toBeNull()
    expect(reread!.approvedBy).toBe(adminB.id)

    const result = await requireBreakGlass(adminA.id, targetOrgId)
    expect(result).not.toBeNull()
    expect(result!.id).toBe(session!.id)
  })

  it('TTL counts from grantedAt, not from approvedAt', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'TTL anchor test', 240)
    const session = await latestSessionFor(adminA.id)
    const expectedExpiry = session!.grantedAt.getTime() + 240 * 60_000

    asAdmin(adminB)
    await approveBreakGlass(session!.id)

    const reread = await db.query.breakGlassSessions.findFirst({
      where: eq(breakGlassSessions.id, session!.id),
    })
    expect(reread!.expiresAt.getTime()).toBe(expectedExpiry)
  })
})

// ── Self-approval / double-approval / revoked / expired ──────────────────────

describe('approveBreakGlass — guards', () => {
  it('rejects self-approval', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Self approval attempt', 240)
    const session = await latestSessionFor(adminA.id)

    // Granter is still adminA — try to approve as adminA
    asAdmin(adminA)
    await expect(approveBreakGlass(session!.id)).rejects.toThrow(
      'Cannot approve your own break-glass session',
    )

    const reread = await db.query.breakGlassSessions.findFirst({
      where: eq(breakGlassSessions.id, session!.id),
    })
    expect(reread!.approvedAt).toBeNull()
  })

  it('rejects double-approval', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Double approve', 240)
    const session = await latestSessionFor(adminA.id)

    asAdmin(adminB)
    await approveBreakGlass(session!.id)
    await expect(approveBreakGlass(session!.id)).rejects.toThrow('already approved')
  })

  it('rejects approval of a session that does not require approval', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'No approval needed', 60)
    const session = await latestSessionFor(adminA.id)

    asAdmin(adminB)
    await expect(approveBreakGlass(session!.id)).rejects.toThrow(
      'does not require approval',
    )
  })

  it('rejects approval of a revoked session', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Revoke before approve', 240)
    const session = await latestSessionFor(adminA.id)

    // Granter revokes (revokeBreakGlass scopes to granter)
    asAdmin(adminA)
    await revokeBreakGlass(session!.id, targetOrgId)

    asAdmin(adminB)
    await expect(approveBreakGlass(session!.id)).rejects.toThrow('revoked')
  })

  it('rejects approval of an expired session', async () => {
    // Insert a session that expired 1 minute ago, requiring approval
    const [row] = await db.insert(breakGlassSessions).values({
      instanceAdminId: adminA.id,
      targetOrgId,
      reason: 'Past expiry',
      grantedAt: new Date(Date.now() - 5 * 60_000),
      expiresAt: new Date(Date.now() - 60_000),
      requiresApproval: true,
    }).returning()

    asAdmin(adminB)
    await expect(approveBreakGlass(row.id)).rejects.toThrow('expired')
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Forbidden test', 240)
    const session = await latestSessionFor(adminA.id)

    mockAuth.mockResolvedValue(makeSession(adminA))
    await expect(approveBreakGlass(session!.id)).rejects.toThrow('Forbidden')
  })
})

// ── Validation ──────────────────────────────────────────────────────────────

describe('grantBreakGlass — validation', () => {
  it('rejects an invalid TTL', async () => {
    asAdmin(adminA)
    await expect(grantBreakGlass(targetOrgId, 'Invalid TTL', 90)).rejects.toThrow('Invalid TTL')
  })

  it('rejects an empty / whitespace reason', async () => {
    asAdmin(adminA)
    await expect(grantBreakGlass(targetOrgId, '   ')).rejects.toThrow('Reason is required')
  })

  it('caps at 480 minutes (8h)', async () => {
    asAdmin(adminA)
    await expect(grantBreakGlass(targetOrgId, 'Too long', 720)).rejects.toThrow('Invalid TTL')
  })
})

// ── Notification hook ───────────────────────────────────────────────────────

describe('notifyBreakGlassEvent — fires on grant and approval', () => {
  let captured: BreakGlassNotification[]

  beforeEach(() => {
    captured = []
    setBreakGlassNotificationSink((n) => {
      captured.push(n)
    })
  })

  afterEach(() => {
    resetBreakGlassNotificationSink()
  })

  it('fires once on grant and once on approval', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Notify flow', 240)
    expect(captured.filter(c => c.event === 'grant')).toHaveLength(1)

    const session = await latestSessionFor(adminA.id)
    asAdmin(adminB)
    await approveBreakGlass(session!.id)
    expect(captured.filter(c => c.event === 'approval')).toHaveLength(1)
    expect(captured.find(c => c.event === 'approval')!.actorUserId).toBe(adminB.id)
  })

  it('a sink throw does not roll back the audit log', async () => {
    setBreakGlassNotificationSink(() => {
      throw new Error('sink down')
    })

    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Sink failure', 60)
    const session = await latestSessionFor(adminA.id)
    expect(session).toBeDefined()

    const audit = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.break_glass.grant'), eq(auditLog.entityId, targetOrgId)))
      .orderBy(desc(auditLog.createdAt))
      .limit(1)
    expect(audit.length).toBe(1)
  })
})

// ── Audit log ───────────────────────────────────────────────────────────────

describe('audit log', () => {
  it('writes instance.break_glass.approve on approval', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Audit approve', 240)
    const session = await latestSessionFor(adminA.id)

    asAdmin(adminB)
    await approveBreakGlass(session!.id)

    const entries = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.break_glass.approve'), eq(auditLog.entityId, session!.id)))
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].userId).toBe(adminB.id)
  })
})
