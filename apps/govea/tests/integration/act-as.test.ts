/**
 * Integration tests: cross-tenant impersonation (#437)
 *
 * Covers the act-as session lifecycle gated by `requireBreakGlass`:
 *   - getActiveActAsSession returns null with no cookie
 *   - startActAsSession refuses when no active break-glass exists
 *   - startActAsSession is a no-op for the admin's own org (self-impersonation)
 *   - startActAsSession caps the child TTL at the parent's expiresAt
 *   - getActiveActAsSession terminates the row when parent is revoked
 *   - getActiveActAsSession terminates the row when parent is expired
 *   - forceRepublishApplication writes audit metadata with impersonatedOrgId
 *     + impersonationSessionId and keeps userId = real instance admin
 *   - forceRepublishApplication refuses without an active act-as session
 *
 * Capability: iam-instance-administration
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  actAsSessions,
  applications,
  auditLog,
  breakGlassSessions,
} from '@/db/schema'
import {
  ACT_AS_COOKIE,
  endActAsSession,
  getActiveActAsSession,
  requireActAs,
  startActAsSession,
} from '@/lib/act-as'
import { forceRepublishApplication, startActAs } from '@/actions/act-as'
import {
  cleanupOrg,
  createTestOrg,
  createTestUser,
  makeSession,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

// Per-test mutable cookie store. Each test resets it; the global cookies()
// mock in setup.ts is overridden here so we can simulate "act-as cookie set"
// and "not set" within a single file.
const cookieStore = vi.hoisted(() => ({ value: null as string | null }))
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'govea_act_as' && cookieStore.value ? { value: cookieStore.value } : null,
    set: vi.fn((name: string, value: string) => {
      if (name === 'govea_act_as') cookieStore.value = value
    }),
    delete: vi.fn((name: string) => {
      if (name === 'govea_act_as') cookieStore.value = null
    }),
  }),
  headers: () => new Headers(),
}))

let homeOrgId: string
let targetOrgId: string
let admin: TestUser

beforeAll(async () => {
  const [home, target] = await Promise.all([createTestOrg(), createTestOrg()])
  homeOrgId = home.id
  targetOrgId = target.id
  admin = await createTestUser(homeOrgId, 'admin')
})

afterAll(async () => {
  await db.delete(actAsSessions).where(eq(actAsSessions.targetOrgId, targetOrgId))
  await db.delete(breakGlassSessions).where(eq(breakGlassSessions.targetOrgId, targetOrgId))
  await cleanupOrg(homeOrgId)
  await cleanupOrg(targetOrgId)
})

beforeEach(async () => {
  cookieStore.value = null
  await db.delete(actAsSessions).where(eq(actAsSessions.targetOrgId, targetOrgId))
  await db.delete(breakGlassSessions).where(eq(breakGlassSessions.targetOrgId, targetOrgId))
  mockAuth.mockResolvedValue(makeSession(admin, { instanceRole: 'instance_admin' }))
})

async function grantBg(opts?: { requiresApproval?: boolean; expiresIn?: number; revokedAt?: Date }) {
  const expiresAt = new Date(Date.now() + (opts?.expiresIn ?? 60 * 60_000))
  const [row] = await db.insert(breakGlassSessions).values({
    instanceAdminId: admin.id,
    targetOrgId,
    reason: 'test',
    expiresAt,
    requiresApproval: opts?.requiresApproval ?? false,
    revokedAt: opts?.revokedAt ?? null,
  }).returning()
  return row
}

describe('getActiveActAsSession', () => {
  it('returns null when no cookie is set', async () => {
    expect(await getActiveActAsSession()).toBeNull()
  })
})

describe('startActAsSession', () => {
  it('returns null when no active break-glass exists', async () => {
    const result = await startActAsSession(
      { instanceAdminId: admin.id, targetOrgId },
      homeOrgId,
    )
    expect(result).toBeNull()
  })

  it('is a no-op for the admin\'s own org (self-impersonation)', async () => {
    await grantBg()
    const result = await startActAsSession(
      { instanceAdminId: admin.id, targetOrgId: homeOrgId },
      homeOrgId,
    )
    expect(result).toBeNull()
  })

  it('creates a session capped by the parent break-glass expiresAt', async () => {
    // Parent expires in 10 minutes — child cannot outlive it even though
    // the default TTL is 30 minutes.
    const parent = await grantBg({ expiresIn: 10 * 60_000 })
    const child = await startActAsSession(
      { instanceAdminId: admin.id, targetOrgId },
      homeOrgId,
    )
    expect(child).not.toBeNull()
    expect(child!.expiresAt.getTime()).toBe(parent.expiresAt.getTime())
  })

  it('uses default 30-minute TTL when parent has plenty of time left', async () => {
    await grantBg({ expiresIn: 60 * 60_000 })
    const before = Date.now()
    const child = await startActAsSession(
      { instanceAdminId: admin.id, targetOrgId },
      homeOrgId,
    )
    const ttlMs = child!.expiresAt.getTime() - before
    expect(ttlMs).toBeGreaterThan(29 * 60_000)
    expect(ttlMs).toBeLessThan(31 * 60_000)
  })
})

describe('getActiveActAsSession — parent termination', () => {
  it('returns null and marks the row parent_revoked when parent is revoked', async () => {
    await grantBg()
    const child = await startActAsSession(
      { instanceAdminId: admin.id, targetOrgId },
      homeOrgId,
    )
    cookieStore.value = child!.id

    // Revoke the parent break-glass session out from under the child.
    await db.update(breakGlassSessions)
      .set({ revokedAt: new Date() })
      .where(eq(breakGlassSessions.targetOrgId, targetOrgId))

    expect(await getActiveActAsSession()).toBeNull()

    const row = await db.query.actAsSessions.findFirst({ where: eq(actAsSessions.id, child!.id) })
    expect(row?.endedAt).not.toBeNull()
    expect(row?.endReason).toBe('parent_revoked')
  })

  it('returns null and marks the row parent_expired when parent expired', async () => {
    // Parent expires 1 second after grant; force-update past it.
    await grantBg({ expiresIn: 1_000 })
    const child = await startActAsSession(
      { instanceAdminId: admin.id, targetOrgId },
      homeOrgId,
    )
    cookieStore.value = child!.id

    await db.update(breakGlassSessions)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(breakGlassSessions.targetOrgId, targetOrgId))

    expect(await getActiveActAsSession()).toBeNull()

    const row = await db.query.actAsSessions.findFirst({ where: eq(actAsSessions.id, child!.id) })
    expect(row?.endReason).toBe('parent_expired')
  })
})

describe('requireActAs', () => {
  it('throws when no act-as session is active', async () => {
    await expect(requireActAs(targetOrgId)).rejects.toThrow('No active act-as session')
  })

  it('throws when the active session targets a different org', async () => {
    await grantBg()
    const child = await startActAsSession(
      { instanceAdminId: admin.id, targetOrgId },
      homeOrgId,
    )
    cookieStore.value = child!.id

    await expect(requireActAs(homeOrgId)).rejects.toThrow('does not match')
  })
})

describe('forceRepublishApplication', () => {
  it('refuses when no act-as session is active', async () => {
    const [app] = await db.insert(applications).values({
      organizationId: targetOrgId,
      name: 'Test App',
      status: 'draft',
    }).returning()

    await expect(forceRepublishApplication(app.id)).rejects.toThrow('No active act-as session')
  })

  it('republishes and writes audit metadata with real admin as userId', async () => {
    const [app] = await db.insert(applications).values({
      organizationId: targetOrgId,
      name: 'Stuck App',
      status: 'draft',
    }).returning()

    await grantBg()
    const child = await startActAsSession(
      { instanceAdminId: admin.id, targetOrgId },
      homeOrgId,
    )
    cookieStore.value = child!.id

    await forceRepublishApplication(app.id)

    const after = await db.query.applications.findFirst({ where: eq(applications.id, app.id) })
    expect(after?.status).toBe('published')

    const audit = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.entityType, 'application'),
        eq(auditLog.entityId, app.id),
        eq(auditLog.action, 'instance.act_as.application.force_republish'),
      ),
      orderBy: [desc(auditLog.createdAt)],
    })
    expect(audit).toBeDefined()
    expect(audit!.userId).toBe(admin.id)
    expect(audit!.organizationId).toBe(targetOrgId)
    const meta = audit!.metadata as Record<string, unknown>
    expect(meta.impersonatedOrgId).toBe(targetOrgId)
    expect(meta.impersonationSessionId).toBe(child!.id)
    expect(meta.breakGlassSessionId).toBe(child!.breakGlassSessionId)
  })
})

describe('startActAs (server action) + endActAsSession', () => {
  it('start writes audit row; manual end marks admin_ended', async () => {
    await grantBg()
    await startActAs(targetOrgId)

    const sessions = await db.query.actAsSessions.findMany({
      where: eq(actAsSessions.targetOrgId, targetOrgId),
    })
    expect(sessions).toHaveLength(1)

    const startAudit = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.action, 'instance.act_as.start'),
        eq(auditLog.entityId, sessions[0].id),
      ),
    })
    expect(startAudit).toBeDefined()
    expect((startAudit!.metadata as Record<string, unknown>).impersonatedOrgId).toBe(targetOrgId)

    await endActAsSession(sessions[0].id, 'admin_ended')
    const ended = await db.query.actAsSessions.findFirst({
      where: eq(actAsSessions.id, sessions[0].id),
    })
    expect(ended!.endReason).toBe('admin_ended')
    expect(ended!.endedAt).not.toBeNull()
  })
})
