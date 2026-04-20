/**
 * Integration tests: initiatives server actions
 *
 * Covers:
 *  - Role enforcement (contributor creates/edits, admin deletes)
 *  - createInitiative writes correct DB row + audit log
 *  - editInitiative patches only the target row + audit before/after
 *  - deleteInitiative removes row + captures before snapshot in audit log
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createInitiative, editInitiative, deleteInitiative } from '@/actions/initiatives'
import { db } from '@/db/client'
import { initiatives } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, getInitiativesForOrg, getAuditLogsForEntity,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function initForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('name', overrides.name ?? 'Test Initiative')
  fd.set('status', overrides.status ?? 'proposed')
  fd.set('visibility', overrides.visibility ?? 'org')
  if (overrides.description) fd.set('description', overrides.description)
  if (overrides.startDate) fd.set('startDate', overrides.startDate)
  if (overrides.endDate) fd.set('endDate', overrides.endDate)
  return fd
}

describe('initiatives actions', () => {
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

  // ── createInitiative ───────────────────────────────────────────────────────

  describe('createInitiative', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(makeSession(contributor))
    })

    it('contributor can create an initiative', async () => {
      const before = await getInitiativesForOrg(orgId)
      await createInitiative(initForm({ name: 'Cloud Migration' }))
      const after = await getInitiativesForOrg(orgId)

      expect(after).toHaveLength(before.length + 1)
      expect(after.some(i => i.name === 'Cloud Migration')).toBe(true)
    })

    it('created initiative belongs to the contributor org', async () => {
      await createInitiative(initForm({ name: 'Org Scoped Initiative' }))
      const rows = await getInitiativesForOrg(orgId)
      const row = rows.find(i => i.name === 'Org Scoped Initiative')!

      expect(row.organizationId).toBe(orgId)
      expect(row.createdBy).toBe(contributor.id)
    })

    it('admin can also create an initiative', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      await expect(createInitiative(initForm({ name: 'Admin Created' }))).resolves.not.toThrow()
    })

    it('viewer cannot create → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(createInitiative(initForm())).rejects.toThrow('Forbidden')
    })

    it('unauthenticated call redirects to /login', async () => {
      mockAuth.mockResolvedValue(null)
      await expect(createInitiative(initForm())).rejects.toThrow(/REDIRECT:\/login/)
    })

    it('writes audit log: action=initiative.create, before=null, after includes name', async () => {
      await createInitiative(initForm({ name: 'Audit Create Target' }))
      const rows = await getInitiativesForOrg(orgId)
      const row = rows.find(i => i.name === 'Audit Create Target')!

      const logs = await getAuditLogsForEntity(row.id)
      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe('initiative.create')
      expect(logs[0].userId).toBe(contributor.id)
      expect(logs[0].organizationId).toBe(orgId)
      expect(logs[0].before).toBeNull()
      expect(logs[0].after).toMatchObject({ name: 'Audit Create Target' })
    })
  })

  // ── editInitiative ─────────────────────────────────────────────────────────

  describe('editInitiative', () => {
    let initiativeId: string

    beforeAll(async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createInitiative(initForm({ name: 'Edit Me', status: 'proposed', visibility: 'org' }))
      const rows = await getInitiativesForOrg(orgId)
      initiativeId = rows.find(i => i.name === 'Edit Me')!.id
    })

    it('contributor can edit an owned initiative', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await editInitiative(initiativeId, initForm({ name: 'Edited Name', status: 'active', visibility: 'org' }))

      const row = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
      expect(row?.name).toBe('Edited Name')
      expect(row?.status).toBe('active')
      expect(row?.updatedBy).toBe(contributor.id)
    })

    it('admin can edit an initiative', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      await expect(
        editInitiative(initiativeId, initForm({ name: 'Admin Edit', status: 'proposed', visibility: 'org' })),
      ).resolves.not.toThrow()
    })

    it('viewer cannot edit → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(
        editInitiative(initiativeId, initForm({ name: 'Hijack', status: 'active', visibility: 'org' })),
      ).rejects.toThrow('Forbidden')
    })

    it('writes audit log with before/after snapshot', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await editInitiative(initiativeId, initForm({ name: 'Before State', status: 'proposed', visibility: 'org' }))
      await editInitiative(initiativeId, initForm({ name: 'After State', status: 'active', visibility: 'org' }))

      const logs = await getAuditLogsForEntity(initiativeId)
      const entry = logs.find(
        l => l.action === 'initiative.edit' && (l.after as Record<string, unknown>)?.name === 'After State',
      )
      expect(entry).toBeDefined()
      expect(entry!.before).toMatchObject({ name: 'Before State', status: 'proposed' })
      expect(entry!.after).toMatchObject({ name: 'After State', status: 'active' })
    })
  })

  // ── deleteInitiative ───────────────────────────────────────────────────────

  describe('deleteInitiative', () => {
    it('admin can delete an initiative', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createInitiative(initForm({ name: 'Delete Me' }))
      const rows = await getInitiativesForOrg(orgId)
      const initiativeId = rows.find(i => i.name === 'Delete Me')!.id

      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteInitiative(initiativeId)

      const check = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
      expect(check).toBeUndefined()
    })

    it('contributor cannot delete → admin required', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createInitiative(initForm({ name: 'Protected Initiative' }))
      const rows = await getInitiativesForOrg(orgId)
      const initiativeId = rows.find(i => i.name === 'Protected Initiative')!.id

      await expect(deleteInitiative(initiativeId)).rejects.toThrow('Forbidden')

      const check = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
      expect(check).toBeDefined()
    })

    it('viewer cannot delete → admin required', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createInitiative(initForm({ name: 'Viewer Block Test' }))
      const rows = await getInitiativesForOrg(orgId)
      const initiativeId = rows.find(i => i.name === 'Viewer Block Test')!.id

      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(deleteInitiative(initiativeId)).rejects.toThrow('Forbidden')
    })

    it('delete writes audit log with before snapshot and no after', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createInitiative(initForm({ name: 'Audit Delete Target' }))
      const rows = await getInitiativesForOrg(orgId)
      const initiativeId = rows.find(i => i.name === 'Audit Delete Target')!.id

      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteInitiative(initiativeId)

      const logs = await getAuditLogsForEntity(initiativeId)
      const deleteLog = logs.find(l => l.action === 'initiative.delete')!
      expect(deleteLog).toBeDefined()
      expect(deleteLog.before).toMatchObject({ name: 'Audit Delete Target' })
      expect(deleteLog.after).toBeNull()
    })
  })
})
