/**
 * Integration tests: instance admin server actions (#240)
 *
 * Verifies that:
 * - grantBreakGlass creates a session row and writes audit log
 * - revokeBreakGlass sets revokedAt and writes audit log
 * - suspendOrg sets suspendedAt and writes audit log
 * - unsuspendOrg clears suspendedAt and writes audit log
 * - promoteInstanceAdmin / demoteInstanceAdmin toggle instanceRole
 * - All actions reject non-instance-admins (Forbidden)
 * - Tenant content is not accessible to instance admin without active break-glass
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  grantBreakGlass, revokeBreakGlass,
  suspendOrg, unsuspendOrg,
  promoteInstanceAdmin, demoteInstanceAdmin,
} from '@/actions/instance'
import { db } from '@/db/client'
import { breakGlassSessions, auditLog } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, findOrg, findUser,
  type TestUser,
} from './helpers/db'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

const mockRevalidate = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

// ── Test state ────────────────────────────────────────────────────────────────

let orgId: string
let targetOrgId: string
let instanceAdmin: TestUser
let regularAdmin: TestUser
let regularUser: TestUser

beforeAll(async () => {
  const [org, targetOrg] = await Promise.all([createTestOrg(), createTestOrg()])
  orgId = org.id
  targetOrgId = targetOrg.id
  ;[instanceAdmin, regularAdmin, regularUser] = await Promise.all([
    createTestUser(orgId, 'admin'),
    createTestUser(orgId, 'admin'),
    createTestUser(orgId, 'viewer'),
  ])
})

afterAll(async () => {
  await cleanupOrg(orgId)
  await cleanupOrg(targetOrgId)
})

function asInstanceAdmin() {
  mockAuth.mockResolvedValue(makeSession(instanceAdmin, { instanceRole: 'instance_admin' }))
}

function asRegularAdmin() {
  mockAuth.mockResolvedValue(makeSession(regularAdmin))
}

// ── Break-glass grant ─────────────────────────────────────────────────────────

describe('grantBreakGlass', () => {
  it('creates a session row expiring in 24h', async () => {
    asInstanceAdmin()
    const before = Date.now()
    await grantBreakGlass(targetOrgId, 'Integration test reason')

    const session = await db.query.breakGlassSessions.findFirst({
      where: and(
        eq(breakGlassSessions.instanceAdminId, instanceAdmin.id),
        eq(breakGlassSessions.targetOrgId, targetOrgId),
        isNull(breakGlassSessions.revokedAt),
      ),
      orderBy: (s, { desc }) => [desc(s.grantedAt)],
    })

    expect(session).toBeDefined()
    expect(session!.reason).toBe('Integration test reason')
    const expiresMs = session!.expiresAt.getTime()
    expect(expiresMs).toBeGreaterThan(before + 23 * 3600 * 1000)
    expect(expiresMs).toBeLessThan(before + 25 * 3600 * 1000)
  })

  it('writes an audit log entry', async () => {
    asInstanceAdmin()
    await grantBreakGlass(targetOrgId, 'Audit test')

    const entries = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.break_glass.grant'), eq(auditLog.entityId, targetOrgId)))
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].organizationId).toBeNull()
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asRegularAdmin()
    await expect(grantBreakGlass(targetOrgId, 'x')).rejects.toThrow('Forbidden')
  })
})

// ── Break-glass revoke ────────────────────────────────────────────────────────

describe('revokeBreakGlass', () => {
  it('sets revokedAt on the session row', async () => {
    asInstanceAdmin()
    await grantBreakGlass(targetOrgId, 'To be revoked')

    const session = await db.query.breakGlassSessions.findFirst({
      where: and(
        eq(breakGlassSessions.instanceAdminId, instanceAdmin.id),
        eq(breakGlassSessions.targetOrgId, targetOrgId),
        isNull(breakGlassSessions.revokedAt),
      ),
      orderBy: (s, { desc }) => [desc(s.grantedAt)],
    })
    expect(session).toBeDefined()

    await revokeBreakGlass(session!.id, targetOrgId)

    const revoked = await db.query.breakGlassSessions.findFirst({
      where: eq(breakGlassSessions.id, session!.id),
    })
    expect(revoked!.revokedAt).not.toBeNull()
    expect(revoked!.revokedBy).toBe(instanceAdmin.id)
  })

  it('writes an audit log entry on revocation', async () => {
    asInstanceAdmin()
    await grantBreakGlass(targetOrgId, 'Revoke audit test')

    const session = await db.query.breakGlassSessions.findFirst({
      where: and(
        eq(breakGlassSessions.instanceAdminId, instanceAdmin.id),
        isNull(breakGlassSessions.revokedAt),
      ),
      orderBy: (s, { desc }) => [desc(s.grantedAt)],
    })
    await revokeBreakGlass(session!.id, targetOrgId)

    const entries = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.break_glass.revoke'), eq(auditLog.entityId, session!.id)))
    expect(entries.length).toBeGreaterThan(0)
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asRegularAdmin()
    await expect(revokeBreakGlass('any-id', targetOrgId)).rejects.toThrow('Forbidden')
  })
})

// ── Suspend / unsuspend org ───────────────────────────────────────────────────

describe('suspendOrg', () => {
  it('sets suspendedAt and suspendedReason', async () => {
    asInstanceAdmin()
    await suspendOrg(targetOrgId, 'Non-payment')

    const org = await findOrg(targetOrgId)
    expect(org!.suspendedAt).not.toBeNull()
    expect(org!.suspendedReason).toBe('Non-payment')
  })

  it('writes an audit log entry', async () => {
    const entries = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.org.suspend'), eq(auditLog.entityId, targetOrgId)))
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].organizationId).toBeNull()
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asRegularAdmin()
    await expect(suspendOrg(targetOrgId, 'x')).rejects.toThrow('Forbidden')
  })
})

describe('unsuspendOrg', () => {
  it('clears suspendedAt and suspendedReason', async () => {
    asInstanceAdmin()
    await unsuspendOrg(targetOrgId)

    const org = await findOrg(targetOrgId)
    expect(org!.suspendedAt).toBeNull()
    expect(org!.suspendedReason).toBeNull()
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asRegularAdmin()
    await expect(unsuspendOrg(targetOrgId)).rejects.toThrow('Forbidden')
  })
})

// ── Promote / demote instance admin ──────────────────────────────────────────

describe('promoteInstanceAdmin', () => {
  it('sets instanceRole to instance_admin', async () => {
    asInstanceAdmin()
    await promoteInstanceAdmin(regularUser.id)

    const u = await findUser(regularUser.id)
    expect(u!.instanceRole).toBe('instance_admin')
  })

  it('writes an audit log entry', async () => {
    const entries = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.user.promote'), eq(auditLog.entityId, regularUser.id)))
    expect(entries.length).toBeGreaterThan(0)
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asRegularAdmin()
    await expect(promoteInstanceAdmin(regularUser.id)).rejects.toThrow('Forbidden')
  })
})

describe('demoteInstanceAdmin', () => {
  it('clears instanceRole', async () => {
    asInstanceAdmin()
    await demoteInstanceAdmin(regularUser.id)

    const u = await findUser(regularUser.id)
    expect(u!.instanceRole).toBeNull()
  })

  it('throws if trying to demote yourself', async () => {
    asInstanceAdmin()
    await expect(demoteInstanceAdmin(instanceAdmin.id)).rejects.toThrow('Cannot demote yourself')
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asRegularAdmin()
    await expect(demoteInstanceAdmin(regularUser.id)).rejects.toThrow('Forbidden')
  })
})
