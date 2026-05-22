/**
 * Integration tests: capabilities server actions
 *
 * Covers:
 *  - Role enforcement (contributor creates/edits, admin deletes)
 *  - createCapability writes correct DB row + audit log
 *  - editCapability patches only the target row + audit before/after
 *  - deleteCapability removes row + captures before snapshot in audit log
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createCapability, editCapability, deleteCapability } from '@/actions/capabilities'
import { db } from '@/db/client'
import { capabilities } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, getCapabilitiesForOrg, getAuditLogsForEntity,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function capForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('name', overrides.name ?? 'Test Capability')
  fd.set('status', overrides.status ?? 'draft')
  fd.set('visibility', overrides.visibility ?? 'org')
  if (overrides.description) fd.set('description', overrides.description)
  if (overrides.domain) fd.set('domain', overrides.domain)
  // #567 Part B: tests that publish a capability through this helper aren't
  // testing the publish-readiness gate — they pre-acknowledge the missing
  // fields so the gate doesn't trip their unrelated assertions.
  if ((overrides.status ?? 'draft') === 'published') {
    fd.set('acknowledgePublishIncomplete', 'on')
  }
  return fd
}

describe('capabilities actions', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  // ── createCapability ───────────────────────────────────────────────────────

  describe('createCapability', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(makeSession(contributor))
    })

    it('contributor can create a capability', async () => {
      const before = await getCapabilitiesForOrg(orgId)
      await createCapability(capForm({ name: 'Grant Management' }))
      const after = await getCapabilitiesForOrg(orgId)

      expect(after).toHaveLength(before.length + 1)
      expect(after.some(c => c.name === 'Grant Management')).toBe(true)
    })

    it('created capability belongs to the contributor org', async () => {
      await createCapability(capForm({ name: 'Org Scoped Cap' }))
      const rows = await getCapabilitiesForOrg(orgId)
      const cap = rows.find(c => c.name === 'Org Scoped Cap')!

      expect(cap.organizationId).toBe(orgId)
      expect(cap.createdBy).toBe(contributor.id)
    })

    it('admin can also create a capability', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      await expect(createCapability(capForm({ name: 'Admin Created' }))).resolves.not.toThrow()
    })

    it('viewer cannot create → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(createCapability(capForm())).rejects.toThrow('Forbidden')
    })

    it('unauthenticated call redirects to /login', async () => {
      mockAuth.mockResolvedValue(null)
      await expect(createCapability(capForm())).rejects.toThrow(/REDIRECT:\/login/)
    })

    it('writes audit log: action=capability.create, before=null, after includes name', async () => {
      await createCapability(capForm({ name: 'Audit Create Target' }))
      const rows = await getCapabilitiesForOrg(orgId)
      const cap = rows.find(c => c.name === 'Audit Create Target')!

      const logs = await getAuditLogsForEntity(cap.id)
      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe('capability.create')
      expect(logs[0].userId).toBe(contributor.id)
      expect(logs[0].organizationId).toBe(orgId)
      expect(logs[0].before).toBeNull()
      expect(logs[0].after).toMatchObject({ name: 'Audit Create Target' })
    })
  })

  // ── editCapability ─────────────────────────────────────────────────────────

  describe('editCapability', () => {
    let capId: string

    beforeAll(async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createCapability(capForm({ name: 'Edit Me', status: 'draft', visibility: 'org' }))
      const rows = await getCapabilitiesForOrg(orgId)
      capId = rows.find(c => c.name === 'Edit Me')!.id
    })

    it('contributor can edit an owned capability', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await editCapability(capId, capForm({ name: 'Edited Name', status: 'published', visibility: 'org' }))

      const row = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capId) })
      expect(row?.name).toBe('Edited Name')
      expect(row?.status).toBe('published')
      expect(row?.updatedBy).toBe(contributor.id)
    })

    it('admin can edit a capability', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      await expect(
        editCapability(capId, capForm({ name: 'Admin Edit', status: 'draft', visibility: 'org' })),
      ).resolves.not.toThrow()
    })

    it('viewer cannot edit → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(
        editCapability(capId, capForm({ name: 'Hijack', status: 'draft', visibility: 'org' })),
      ).rejects.toThrow('Forbidden')
    })

    it('writes audit log with before/after snapshot', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      // Set known state first
      await editCapability(capId, capForm({ name: 'Before State', status: 'draft', visibility: 'org' }))
      // Then edit
      await editCapability(capId, capForm({ name: 'After State', status: 'published', visibility: 'org' }))

      const logs = await getAuditLogsForEntity(capId)
      // Find by known after value — avoids timestamp-ordering ambiguity
      const entry = logs.find(
        l => l.action === 'capability.edit' && (l.after as Record<string, unknown>)?.name === 'After State',
      )
      expect(entry).toBeDefined()
      expect(entry!.before).toMatchObject({ name: 'Before State', status: 'draft' })
      expect(entry!.after).toMatchObject({ name: 'After State', status: 'published' })
    })
  })

  // ── deleteCapability ───────────────────────────────────────────────────────

  describe('deleteCapability', () => {
    it('admin can delete a capability', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createCapability(capForm({ name: 'Delete Me' }))
      const rows = await getCapabilitiesForOrg(orgId)
      const capId = rows.find(c => c.name === 'Delete Me')!.id

      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteCapability(capId)

      const check = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capId) })
      expect(check).toBeUndefined()
    })

    it('contributor cannot delete → admin required', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createCapability(capForm({ name: 'Protected Cap' }))
      const rows = await getCapabilitiesForOrg(orgId)
      const capId = rows.find(c => c.name === 'Protected Cap')!.id

      await expect(deleteCapability(capId)).rejects.toThrow('Forbidden')

      // Row must still exist
      const check = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capId) })
      expect(check).toBeDefined()
    })

    it('viewer cannot delete → admin required', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createCapability(capForm({ name: 'Viewer Block Test' }))
      const rows = await getCapabilitiesForOrg(orgId)
      const capId = rows.find(c => c.name === 'Viewer Block Test')!.id

      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(deleteCapability(capId)).rejects.toThrow('Forbidden')
    })

    it('delete writes audit log with before snapshot and no after', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createCapability(capForm({ name: 'Audit Delete Target' }))
      const rows = await getCapabilitiesForOrg(orgId)
      const capId = rows.find(c => c.name === 'Audit Delete Target')!.id

      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteCapability(capId)

      const logs = await getAuditLogsForEntity(capId)
      const deleteLog = logs.find(l => l.action === 'capability.delete')!
      expect(deleteLog).toBeDefined()
      expect(deleteLog.before).toMatchObject({ name: 'Audit Delete Target' })
      // delete action does not set an "after" value
      expect(deleteLog.after).toBeNull()
    })
  })
})
