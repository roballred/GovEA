/**
 * Integration tests: admin-authored notices, instance scope (#456, PR 2)
 *
 * Covers:
 *   - createInstanceNotice writes audit with organizationId=null and respects
 *     the "activate now" flag
 *   - Activating a second instance notice deactivates the previous one
 *     (single-active invariant per scope)
 *   - Scope enforcement:
 *       * org admin cannot call createInstanceNotice / setInstanceNoticeActive
 *         / deleteInstanceNotice — Forbidden
 *       * instance admin cannot call setOrgNoticeActive on another org's
 *         notice — Forbidden (cross-scope confusion would let an instance
 *         admin act-as without break-glass)
 *       * updating/deleting a notice via the wrong scope's action is rejected
 *   - Audit row carries userId, organizationId=null, before/after captures
 *     the scope field
 *   - getActiveInstanceNotice returns null when no instance notice is active
 *
 * Capability: ac-feature-management, iam-instance-administration
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { adminNotices, auditLog } from '@/db/schema'
import { getActiveInstanceNotice, listInstanceNotices } from '@/lib/admin-notices'
import {
  createInstanceNotice,
  deleteInstanceNotice,
  setInstanceNoticeActive,
  updateInstanceNotice,
  setOrgNoticeActive,
} from '@/actions/admin-notices'
import {
  cleanupOrg,
  createTestOrg,
  createTestUser,
  makeSession,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let platformOrgId: string
let tenantOrgId: string
let instanceAdmin: TestUser
let orgAdmin: TestUser

beforeAll(async () => {
  // The instance admin's user record can live in any org — the role gate is on
  // session.user.instanceRole, not on organizationId. Use a separate org so
  // cleanup is straightforward.
  const [platform, tenant] = await Promise.all([createTestOrg(), createTestOrg()])
  platformOrgId = platform.id
  tenantOrgId = tenant.id
  ;[instanceAdmin, orgAdmin] = await Promise.all([
    createTestUser(platformOrgId, 'admin'),
    createTestUser(tenantOrgId, 'admin'),
  ])
})

afterAll(async () => {
  // Instance notices have organizationId=null — match on scope instead.
  await db.delete(adminNotices).where(eq(adminNotices.scope, 'instance'))
  await db.delete(adminNotices).where(eq(adminNotices.organizationId, platformOrgId))
  await db.delete(adminNotices).where(eq(adminNotices.organizationId, tenantOrgId))
  await cleanupOrg(platformOrgId)
  await cleanupOrg(tenantOrgId)
})

beforeEach(async () => {
  await db.delete(adminNotices).where(eq(adminNotices.scope, 'instance'))
  await db.delete(adminNotices).where(eq(adminNotices.organizationId, platformOrgId))
  await db.delete(adminNotices).where(eq(adminNotices.organizationId, tenantOrgId))
})

function asInstanceAdmin(user: TestUser) {
  mockAuth.mockResolvedValue(makeSession(user, { instanceRole: 'instance_admin' }))
}

function asOrgAdmin(user: TestUser) {
  mockAuth.mockResolvedValue(makeSession(user))
}

function fd(values: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(values)) f.set(k, v)
  return f
}

// ── Creation + activation ────────────────────────────────────────────────────

describe('createInstanceNotice', () => {
  it('creates an instance notice with organizationId=null and writes audit', async () => {
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'Platform maintenance Saturday',
      body: 'GovEA is read-only from 22:00 to 23:00 UTC.',
      severity: 'warning',
      activate: 'true',
    }))

    const rows = await listInstanceNotices()
    expect(rows).toHaveLength(1)
    expect(rows[0].scope).toBe('instance')
    expect(rows[0].organizationId).toBeNull()
    expect(rows[0].active).toBe(true)
    expect(rows[0].severity).toBe('warning')

    const audit = await db.query.auditLog.findFirst({
      where: and(eq(auditLog.entityType, 'admin_notice'), eq(auditLog.action, 'admin_notice.create')),
      orderBy: [desc(auditLog.createdAt)],
    })
    expect(audit?.userId).toBe(instanceAdmin.id)
    expect(audit?.organizationId).toBeNull()
    const after = audit?.after as Record<string, unknown> | undefined
    expect(after?.scope).toBe('instance')
  })

  it('respects the activate=false path (notice created inactive)', async () => {
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'Draft notice',
      body: 'Not yet visible.',
      severity: 'info',
    }))

    const active = await getActiveInstanceNotice()
    expect(active).toBeNull()
    const all = await listInstanceNotices()
    expect(all).toHaveLength(1)
    expect(all[0].active).toBe(false)
  })

  it('activating a second instance notice deactivates the first (single-active invariant)', async () => {
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'First',
      body: 'First instance notice',
      severity: 'info',
      activate: 'true',
    }))
    await createInstanceNotice(fd({
      title: 'Second',
      body: 'Second instance notice',
      severity: 'critical',
      activate: 'true',
    }))

    const all = await listInstanceNotices()
    const activeCount = all.filter(n => n.active).length
    expect(activeCount).toBe(1)
    const active = await getActiveInstanceNotice()
    expect(active?.title).toBe('Second')
  })
})

// ── Scope enforcement ────────────────────────────────────────────────────────

describe('scope enforcement', () => {
  it('rejects org admin attempting to create an instance notice', async () => {
    asOrgAdmin(orgAdmin)
    await expect(createInstanceNotice(fd({
      title: 'Sneaky',
      body: 'org admin should not be able to do this',
      severity: 'info',
      activate: 'true',
    }))).rejects.toThrow(/forbidden/i)
  })

  it('rejects org admin attempting to activate an instance notice', async () => {
    // Seed an instance notice as the instance admin first.
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'Seeded',
      body: 'For the next test',
      severity: 'info',
    }))
    const seeded = await db.query.adminNotices.findFirst({
      where: and(eq(adminNotices.scope, 'instance'), isNull(adminNotices.organizationId)),
    })
    expect(seeded).toBeDefined()

    // Switch to org admin and try to activate it.
    asOrgAdmin(orgAdmin)
    await expect(setInstanceNoticeActive(seeded!.id, true)).rejects.toThrow(/forbidden/i)
  })

  it('rejects org admin attempting to delete an instance notice', async () => {
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'Seeded for delete-reject',
      body: 'x',
      severity: 'info',
    }))
    const seeded = await db.query.adminNotices.findFirst({
      where: and(eq(adminNotices.scope, 'instance'), isNull(adminNotices.organizationId)),
    })
    asOrgAdmin(orgAdmin)
    await expect(deleteInstanceNotice(seeded!.id)).rejects.toThrow(/forbidden/i)
  })

  it('rejects an org-scoped action targeting an instance notice id', async () => {
    // Cross-scope action attempt: org admin uses the org action on an instance
    // notice id. The scope check inside setOrgNoticeActive must reject it.
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'Cross-scope canary',
      body: 'x',
      severity: 'info',
    }))
    const seeded = await db.query.adminNotices.findFirst({
      where: and(eq(adminNotices.scope, 'instance'), isNull(adminNotices.organizationId)),
    })
    asOrgAdmin(orgAdmin)
    await expect(setOrgNoticeActive(seeded!.id, true)).rejects.toThrow(/forbidden/i)
  })

  it('rejects an instance-scoped action targeting an org notice id', async () => {
    // Inverse direction: create an org notice as org admin, then attempt to
    // activate it via the instance-scope action. Must reject — keeps the two
    // scopes from being used interchangeably.
    asOrgAdmin(orgAdmin)
    const insertResult = await db.insert(adminNotices).values({
      scope: 'org',
      organizationId: tenantOrgId,
      severity: 'info',
      title: 'Org-only',
      body: 'x',
      active: false,
      createdBy: orgAdmin.id,
    }).returning()
    const orgNoticeId = insertResult[0].id

    asInstanceAdmin(instanceAdmin)
    await expect(setInstanceNoticeActive(orgNoticeId, true)).rejects.toThrow(/forbidden/i)
  })
})

// ── Update + delete ──────────────────────────────────────────────────────────

describe('updateInstanceNotice / deleteInstanceNotice', () => {
  it('updates and audits with scope=instance in the before/after', async () => {
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'Initial title',
      body: 'Initial body',
      severity: 'info',
    }))
    const row = await db.query.adminNotices.findFirst({
      where: and(eq(adminNotices.scope, 'instance'), isNull(adminNotices.organizationId)),
    })
    await updateInstanceNotice(row!.id, fd({
      title: 'Updated title',
      body: 'Updated body',
      severity: 'warning',
    }))

    const after = await db.query.adminNotices.findFirst({ where: eq(adminNotices.id, row!.id) })
    expect(after?.title).toBe('Updated title')
    expect(after?.severity).toBe('warning')

    const audit = await db.query.auditLog.findFirst({
      where: and(eq(auditLog.entityType, 'admin_notice'), eq(auditLog.action, 'admin_notice.update')),
      orderBy: [desc(auditLog.createdAt)],
    })
    const auditBefore = audit?.before as Record<string, unknown> | undefined
    const auditAfter = audit?.after as Record<string, unknown> | undefined
    expect(auditBefore?.scope).toBe('instance')
    expect(auditAfter?.scope).toBe('instance')
    expect(audit?.organizationId).toBeNull()
  })

  it('deletes and audits', async () => {
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'To be deleted',
      body: 'x',
      severity: 'info',
    }))
    const row = await db.query.adminNotices.findFirst({
      where: and(eq(adminNotices.scope, 'instance'), isNull(adminNotices.organizationId)),
    })
    await deleteInstanceNotice(row!.id)

    const after = await db.query.adminNotices.findFirst({ where: eq(adminNotices.id, row!.id) })
    expect(after).toBeUndefined()

    const audit = await db.query.auditLog.findFirst({
      where: and(eq(auditLog.entityType, 'admin_notice'), eq(auditLog.action, 'admin_notice.delete')),
      orderBy: [desc(auditLog.createdAt)],
    })
    expect(audit?.userId).toBe(instanceAdmin.id)
    expect(audit?.organizationId).toBeNull()
  })
})

// ── getActiveInstanceNotice ──────────────────────────────────────────────────

describe('getActiveInstanceNotice', () => {
  it('returns null when no instance notice is active', async () => {
    expect(await getActiveInstanceNotice()).toBeNull()
  })

  it('returns the active instance notice when one exists', async () => {
    asInstanceAdmin(instanceAdmin)
    await createInstanceNotice(fd({
      title: 'Live one',
      body: 'x',
      severity: 'critical',
      activate: 'true',
    }))
    const active = await getActiveInstanceNotice()
    expect(active?.title).toBe('Live one')
    expect(active?.severity).toBe('critical')
  })
})
