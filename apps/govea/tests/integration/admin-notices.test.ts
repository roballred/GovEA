/**
 * Integration tests: admin-authored notices, org scope (#456, PR 1)
 *
 * Covers:
 *   - createOrgNotice writes audit and respects the "activate now" flag
 *   - Activating a second notice deactivates the previous one (single-active invariant)
 *   - Updating / deleting a notice in a different org is rejected (scope enforcement)
 *   - Audit row carries userId + organizationId, before/after captures the
 *     mutation
 *   - validateLearnMoreUrl rejects non-https and malformed URLs
 *
 * Capability: ac-feature-management
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { adminNotices, auditLog } from '@/db/schema'
import { getActiveOrgNotice, validateLearnMoreUrl } from '@/lib/admin-notices'
import {
  createOrgNotice,
  deleteOrgNotice,
  setOrgNoticeActive,
  updateOrgNotice,
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

let orgAId: string
let orgBId: string
let adminA: TestUser
let adminB: TestUser

beforeAll(async () => {
  const [a, b] = await Promise.all([createTestOrg(), createTestOrg()])
  orgAId = a.id
  orgBId = b.id
  ;[adminA, adminB] = await Promise.all([
    createTestUser(orgAId, 'admin'),
    createTestUser(orgBId, 'admin'),
  ])
})

afterAll(async () => {
  await db.delete(adminNotices).where(eq(adminNotices.organizationId, orgAId))
  await db.delete(adminNotices).where(eq(adminNotices.organizationId, orgBId))
  await cleanupOrg(orgAId)
  await cleanupOrg(orgBId)
})

beforeEach(async () => {
  await db.delete(adminNotices).where(eq(adminNotices.organizationId, orgAId))
  await db.delete(adminNotices).where(eq(adminNotices.organizationId, orgBId))
})

function asAdmin(user: TestUser) {
  mockAuth.mockResolvedValue(makeSession(user))
}

function fd(values: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(values)) f.set(k, v)
  return f
}

describe('validateLearnMoreUrl', () => {
  it('returns null for empty / whitespace input', () => {
    expect(validateLearnMoreUrl(null)).toBeNull()
    expect(validateLearnMoreUrl('')).toBeNull()
    expect(validateLearnMoreUrl('   ')).toBeNull()
  })
  it('accepts a valid https URL', () => {
    expect(validateLearnMoreUrl('https://example.com/x')).toBe('https://example.com/x')
  })
  it('rejects http (mixed-content risk)', () => {
    expect(() => validateLearnMoreUrl('http://example.com')).toThrow('https')
  })
  it('rejects malformed URLs', () => {
    expect(() => validateLearnMoreUrl('not a url')).toThrow('valid URL')
  })
})

describe('createOrgNotice', () => {
  it('creates an inactive notice when activate flag is not set', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({
      title: 'Test', body: 'Body', severity: 'info',
    }))

    const all = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })
    expect(all).toHaveLength(1)
    expect(all[0].active).toBe(false)
    expect(all[0].title).toBe('Test')
    expect(all[0].severity).toBe('info')
  })

  it('writes an audit row with userId + organizationId', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({
      title: 'Audited', body: 'Body', severity: 'warning', activate: 'true',
    }))

    const all = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })
    const row = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.action, 'admin_notice.create'),
        eq(auditLog.entityId, all[0].id),
      ),
      orderBy: [desc(auditLog.createdAt)],
    })
    expect(row).toBeDefined()
    expect(row!.userId).toBe(adminA.id)
    expect(row!.organizationId).toBe(orgAId)
    expect((row!.after as Record<string, unknown>).active).toBe(true)
  })

  it('rejects empty title / body', async () => {
    asAdmin(adminA)
    await expect(createOrgNotice(fd({ title: '', body: 'x', severity: 'info' })))
      .rejects.toThrow('Title')
    await expect(createOrgNotice(fd({ title: 'x', body: '', severity: 'info' })))
      .rejects.toThrow('Body')
  })

  it('rejects invalid severity', async () => {
    asAdmin(adminA)
    await expect(createOrgNotice(fd({ title: 'x', body: 'y', severity: 'maximum' })))
      .rejects.toThrow('severity')
  })
})

describe('single-active invariant', () => {
  it('activating a second notice deactivates the previous one', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({
      title: 'First', body: 'b', severity: 'info', activate: 'true',
    }))
    const [first] = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })
    expect(first.active).toBe(true)

    await createOrgNotice(fd({
      title: 'Second', body: 'b', severity: 'warning', activate: 'true',
    }))

    const all = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })
    const active = all.filter((n) => n.active)
    expect(active).toHaveLength(1)
    expect(active[0].title).toBe('Second')
  })

  it('setOrgNoticeActive(false) clears the active row', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({
      title: 'A', body: 'b', severity: 'info', activate: 'true',
    }))
    const [n] = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })

    await setOrgNoticeActive(n.id, false)
    const after = await db.query.adminNotices.findFirst({ where: eq(adminNotices.id, n.id) })
    expect(after!.active).toBe(false)
  })

  it('getActiveOrgNotice returns the active notice, or null', async () => {
    asAdmin(adminA)
    expect(await getActiveOrgNotice(orgAId)).toBeNull()

    await createOrgNotice(fd({
      title: 'Visible', body: 'b', severity: 'info', activate: 'true',
    }))
    const active = await getActiveOrgNotice(orgAId)
    expect(active?.title).toBe('Visible')
  })
})

describe('scope enforcement', () => {
  it('admin B cannot update admin A\'s org notice', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({
      title: 'A-owned', body: 'b', severity: 'info',
    }))
    const [n] = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })

    asAdmin(adminB)
    await expect(updateOrgNotice(n.id, fd({
      title: 'pwned', body: 'b', severity: 'info',
    }))).rejects.toThrow('Forbidden')
  })

  it('admin B cannot toggle admin A\'s org notice', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({
      title: 'A-owned', body: 'b', severity: 'info',
    }))
    const [n] = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })

    asAdmin(adminB)
    await expect(setOrgNoticeActive(n.id, true)).rejects.toThrow('Forbidden')
  })

  it('admin B cannot delete admin A\'s org notice', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({
      title: 'A-owned', body: 'b', severity: 'info',
    }))
    const [n] = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })

    asAdmin(adminB)
    await expect(deleteOrgNotice(n.id)).rejects.toThrow('Forbidden')
  })

  it('listing notices for one org does not surface another org\'s notices', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({ title: 'A', body: 'b', severity: 'info' }))
    asAdmin(adminB)
    await createOrgNotice(fd({ title: 'B', body: 'b', severity: 'info' }))

    const aRows = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })
    const bRows = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgBId),
    })
    expect(aRows.map((n) => n.title)).toEqual(['A'])
    expect(bRows.map((n) => n.title)).toEqual(['B'])
  })
})

describe('updateOrgNotice + deleteOrgNotice', () => {
  it('update writes before/after audit', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({ title: 'Before', body: 'b', severity: 'info' }))
    const [n] = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })

    await updateOrgNotice(n.id, fd({ title: 'After', body: 'b', severity: 'warning' }))

    const row = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.action, 'admin_notice.update'),
        eq(auditLog.entityId, n.id),
      ),
      orderBy: [desc(auditLog.createdAt)],
    })
    expect(row).toBeDefined()
    expect((row!.before as Record<string, unknown>).title).toBe('Before')
    expect((row!.after as Record<string, unknown>).title).toBe('After')
    expect((row!.after as Record<string, unknown>).severity).toBe('warning')
  })

  it('delete removes the row and writes audit', async () => {
    asAdmin(adminA)
    await createOrgNotice(fd({ title: 'doomed', body: 'b', severity: 'info' }))
    const [n] = await db.query.adminNotices.findMany({
      where: eq(adminNotices.organizationId, orgAId),
    })

    await deleteOrgNotice(n.id)

    const after = await db.query.adminNotices.findFirst({ where: eq(adminNotices.id, n.id) })
    expect(after).toBeUndefined()

    const row = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.action, 'admin_notice.delete'),
        eq(auditLog.entityId, n.id),
      ),
      orderBy: [desc(auditLog.createdAt)],
    })
    expect(row).toBeDefined()
    expect((row!.before as Record<string, unknown>).title).toBe('doomed')
  })
})
