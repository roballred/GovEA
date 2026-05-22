/**
 * Integration tests: domain-owner overwrite gate (#581 follow-up)
 *
 * Covers:
 *   - An owned object can be edited by the owner with no acknowledgment.
 *   - An owned object edited by a non-owner without `acknowledgeOverwrite=on`
 *     throws DomainOwnerOverwriteAcknowledgmentRequiredError.
 *   - With `acknowledgeOverwrite=on`, the edit proceeds AND a
 *     `domain_owner.overwrite_acknowledged` audit row is written.
 *   - An unowned object edits with no warning (back-compat).
 *   - The picker rejects a cross-org user id (assertUserInOrg guard).
 *   - All three entity types (capability, application, ADR) wire the same gate.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  capabilities, applications, adrs, auditLog, notifications,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { editCapability } from '@/actions/capabilities'
import { editApplication } from '@/actions/applications'
import { editADR } from '@/actions/adrs'
import { DomainOwnerOverwriteAcknowledgmentRequiredError } from '@/lib/domain-owner-gate'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

async function seedCap(orgId: string, name: string, ownerUserId?: string) {
  const [row] = await db.insert(capabilities).values({
    id: randomUUID(), organizationId: orgId, name,
    status: 'draft', visibility: 'org',
    domainOwnerUserId: ownerUserId ?? null,
  }).returning()
  return row
}

async function seedApp(orgId: string, name: string, ownerUserId?: string) {
  const [row] = await db.insert(applications).values({
    id: randomUUID(), organizationId: orgId, name,
    status: 'draft', visibility: 'org',
    domainOwnerUserId: ownerUserId ?? null,
  }).returning()
  return row
}

async function seedAdr(orgId: string, title: string, ownerUserId?: string) {
  const [row] = await db.insert(adrs).values({
    id: randomUUID(), organizationId: orgId,
    number: `ADR-T-${randomUUID().slice(0, 6)}`, title,
    status: 'proposed', visibility: 'org',
    domainOwnerUserId: ownerUserId ?? null,
  }).returning()
  return row
}

describe('domain-owner overwrite gate (#581)', () => {
  let orgId: string
  let owner: TestUser
  let intruder: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[owner, intruder] = await Promise.all([
      createTestUser(orgId, 'contributor', { name: 'Carlos Carter' }),
      createTestUser(orgId, 'contributor', { name: 'Carla Castillo' }),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  // ── No owner = no friction (back-compat path) ─────────────────────────────

  it('an unowned capability edits without acknowledgment', async () => {
    const cap = await seedCap(orgId, 'Unowned Cap')
    mockAuth.mockResolvedValue(makeSession(intruder))

    const fd = new FormData()
    fd.set('name', 'Unowned Cap renamed')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    // Note: NO acknowledgeOverwrite, NO domainOwnerUserId.
    await editCapability(cap.id, fd)

    const after = await db.query.capabilities.findFirst({ where: eq(capabilities.id, cap.id) })
    expect(after?.name).toBe('Unowned Cap renamed')
  })

  // ── Owner can edit their own record without acknowledging ─────────────────

  it('the owner editing their own capability needs no acknowledgment', async () => {
    const cap = await seedCap(orgId, 'Owner Self Edit', owner.id)
    mockAuth.mockResolvedValue(makeSession(owner))

    const fd = new FormData()
    fd.set('name', 'Owner Self Edit renamed')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    fd.set('domainOwnerUserId', owner.id)
    await editCapability(cap.id, fd)

    const after = await db.query.capabilities.findFirst({ where: eq(capabilities.id, cap.id) })
    expect(after?.name).toBe('Owner Self Edit renamed')
    expect(after?.domainOwnerUserId).toBe(owner.id)
  })

  // ── Non-owner without ack → throws ────────────────────────────────────────

  it('a non-owner edit without acknowledgeOverwrite throws DomainOwnerOverwriteAcknowledgmentRequiredError', async () => {
    const cap = await seedCap(orgId, 'Owned Cap Locked', owner.id)
    mockAuth.mockResolvedValue(makeSession(intruder))

    const fd = new FormData()
    fd.set('name', 'Owned Cap Locked renamed')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    fd.set('domainOwnerUserId', owner.id)
    // No acknowledgeOverwrite.

    await expect(editCapability(cap.id, fd)).rejects.toThrow(DomainOwnerOverwriteAcknowledgmentRequiredError)

    const unchanged = await db.query.capabilities.findFirst({ where: eq(capabilities.id, cap.id) })
    expect(unchanged?.name).toBe('Owned Cap Locked')
  })

  it('the thrown error carries the owner attribution for the warning banner', async () => {
    const cap = await seedCap(orgId, 'Owner Attribution Cap', owner.id)
    mockAuth.mockResolvedValue(makeSession(intruder))

    const fd = new FormData()
    fd.set('name', 'will not save')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')

    try {
      await editCapability(cap.id, fd)
      expect.fail('expected error')
    } catch (err) {
      expect(err).toBeInstanceOf(DomainOwnerOverwriteAcknowledgmentRequiredError)
      const e = err as DomainOwnerOverwriteAcknowledgmentRequiredError
      expect(e.code).toBe('DOMAIN_OWNER_ACK_REQUIRED')
      expect(e.ownerUserId).toBe(owner.id)
      expect(e.ownerName).toBe('Carlos Carter')
      expect(e.ownerEmail).toBe(owner.email)
    }
  })

  // ── Non-owner WITH ack → proceeds + audit row ─────────────────────────────

  it('a non-owner edit with acknowledgeOverwrite=on succeeds and logs an audit row', async () => {
    const cap = await seedCap(orgId, 'Acked Overwrite Cap', owner.id)
    mockAuth.mockResolvedValue(makeSession(intruder))

    const fd = new FormData()
    fd.set('name', 'Acked Overwrite Cap renamed')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    fd.set('domainOwnerUserId', owner.id) // intruder preserves ownership
    fd.set('acknowledgeOverwrite', 'on')
    await editCapability(cap.id, fd)

    const after = await db.query.capabilities.findFirst({ where: eq(capabilities.id, cap.id) })
    expect(after?.name).toBe('Acked Overwrite Cap renamed')
    expect(after?.domainOwnerUserId).toBe(owner.id)

    const auditRows = await db.select().from(auditLog).where(and(
      eq(auditLog.entityId, cap.id),
      eq(auditLog.action, 'domain_owner.overwrite_acknowledged'),
    ))
    expect(auditRows).toHaveLength(1)
    const meta = auditRows[0].metadata as { ownerUserId: string; ownerName: string }
    expect(meta.ownerUserId).toBe(owner.id)
    expect(meta.ownerName).toBe('Carlos Carter')

    // Bridge: the owner should also have an inbox notification with the
    // distinct edit_by_non_owner action label, regardless of subscription.
    const ownerNotes = await db.select().from(notifications).where(and(
      eq(notifications.entityId, cap.id),
      eq(notifications.userId, owner.id),
      eq(notifications.action, 'capability.edit_by_non_owner'),
    ))
    expect(ownerNotes).toHaveLength(1)
    expect(ownerNotes[0].summary).toMatch(/edited your capability/i)
  })

  // ── Bridge: applications + ADRs also notify the owner ────────────────────

  it('applications: a non-owner ack edit sends an edit_by_non_owner notification', async () => {
    const app = await seedApp(orgId, 'Owner App Bridge', owner.id)
    mockAuth.mockResolvedValue(makeSession(intruder))
    const fd = new FormData()
    fd.set('name', 'Owner App Bridge renamed')
    fd.set('lifecycleStatus', 'active')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    fd.set('domainOwnerUserId', owner.id)
    fd.set('acknowledgeOverwrite', 'on')
    await editApplication(app.id, fd)
    const ownerNotes = await db.select().from(notifications).where(and(
      eq(notifications.entityId, app.id),
      eq(notifications.userId, owner.id),
      eq(notifications.action, 'application.edit_by_non_owner'),
    ))
    expect(ownerNotes).toHaveLength(1)
  })

  it('adrs: a non-owner ack edit sends an edit_by_non_owner notification', async () => {
    const adr = await seedAdr(orgId, 'Owner ADR Bridge', owner.id)
    mockAuth.mockResolvedValue(makeSession(intruder))
    const fd = new FormData()
    fd.set('number', adr.number)
    fd.set('title', 'Owner ADR Bridge renamed')
    fd.set('status', 'proposed')
    fd.set('visibility', 'org')
    fd.set('domainOwnerUserId', owner.id)
    fd.set('acknowledgeOverwrite', 'on')
    await editADR(adr.id, fd)
    const ownerNotes = await db.select().from(notifications).where(and(
      eq(notifications.entityId, adr.id),
      eq(notifications.userId, owner.id),
      eq(notifications.action, 'adr.edit_by_non_owner'),
    ))
    expect(ownerNotes).toHaveLength(1)
  })

  // ── Bridge: owner editing their own record does NOT self-notify ──────────

  it('owner self-edit does not fire the edit_by_non_owner notification', async () => {
    const cap = await seedCap(orgId, 'Owner Self Bridge', owner.id)
    mockAuth.mockResolvedValue(makeSession(owner))
    const fd = new FormData()
    fd.set('name', 'Owner Self Bridge renamed')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    fd.set('domainOwnerUserId', owner.id)
    await editCapability(cap.id, fd)
    const selfNotes = await db.select().from(notifications).where(and(
      eq(notifications.entityId, cap.id),
      eq(notifications.userId, owner.id),
      eq(notifications.action, 'capability.edit_by_non_owner'),
    ))
    expect(selfNotes).toHaveLength(0)
  })

  // ── Cross-org owner pick rejected ──────────────────────────────────────────

  it('rejects a domain-owner pick that points to a user in a different org', async () => {
    const otherOrg = await createTestOrg()
    const outsider = await createTestUser(otherOrg.id, 'contributor')
    try {
      const cap = await seedCap(orgId, 'Cross-Org Owner Reject')
      mockAuth.mockResolvedValue(makeSession(intruder))

      const fd = new FormData()
      fd.set('name', 'cross-org rename')
      fd.set('status', 'draft')
      fd.set('visibility', 'org')
      fd.set('domainOwnerUserId', outsider.id)

      await expect(editCapability(cap.id, fd)).rejects.toThrow(/Domain owner must be a user in your organization/i)
    } finally {
      await cleanupOrg(otherOrg.id)
    }
  })

  // ── applications + adrs use the same gate ─────────────────────────────────

  it('applications: same gate fires for a non-owner edit', async () => {
    const app = await seedApp(orgId, 'Owned App', owner.id)
    mockAuth.mockResolvedValue(makeSession(intruder))

    const fd = new FormData()
    fd.set('name', 'Owned App renamed')
    fd.set('lifecycleStatus', 'active')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')

    await expect(editApplication(app.id, fd)).rejects.toThrow(DomainOwnerOverwriteAcknowledgmentRequiredError)
  })

  it('adrs: same gate fires for a non-owner edit', async () => {
    const adr = await seedAdr(orgId, 'Owned ADR', owner.id)
    mockAuth.mockResolvedValue(makeSession(intruder))

    const fd = new FormData()
    fd.set('number', adr.number)
    fd.set('title', 'Owned ADR renamed')
    fd.set('status', 'proposed')
    fd.set('visibility', 'org')

    await expect(editADR(adr.id, fd)).rejects.toThrow(DomainOwnerOverwriteAcknowledgmentRequiredError)
  })

  // ── Owner removal: setting domainOwnerUserId to '' clears it ──────────────

  it('the owner can clear their own ownership by submitting empty domainOwnerUserId', async () => {
    const cap = await seedCap(orgId, 'Owner Clears Self', owner.id)
    mockAuth.mockResolvedValue(makeSession(owner))

    const fd = new FormData()
    fd.set('name', 'Owner Clears Self')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    fd.set('domainOwnerUserId', '') // explicit clear

    await editCapability(cap.id, fd)
    const after = await db.query.capabilities.findFirst({ where: eq(capabilities.id, cap.id) })
    expect(after?.domainOwnerUserId).toBeNull()
  })
})
