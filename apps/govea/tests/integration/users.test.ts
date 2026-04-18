/**
 * Integration tests: user management server actions
 *
 * Covers:
 *  - Only admins can create / update roles / deactivate / delete users
 *  - Last-admin guard prevents deactivating the only admin
 *  - createUser scopes new users to the calling admin's org
 *  - Audit log written with correct before/after for each mutation
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createUser, updateUserRole, deactivateUser, deleteUser } from '@/actions/users'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, findUser, getAuditLogs,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function userForm(name: string, email: string, role: string): FormData {
  const fd = new FormData()
  fd.set('name', name)
  fd.set('email', email)
  fd.set('password', 'TestPassword123!')
  fd.set('role', role)
  return fd
}

describe('user management actions', () => {
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

  beforeEach(() => {
    mockAuth.mockResolvedValue(makeSession(admin))
  })

  // ── createUser ─────────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('admin can create a viewer in the same org', async () => {
      const email = `viewer-${Date.now()}@test.example`
      await createUser(userForm('New Viewer', email, 'viewer'))

      const user = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.organizationId, orgId)),
      })
      expect(user).toBeDefined()
      expect(user?.role).toBe('viewer')
      expect(user?.isActive).toBe('true')
      expect(user?.organizationId).toBe(orgId)
    })

    it('admin can create a contributor', async () => {
      const email = `contrib-${Date.now()}@test.example`
      await createUser(userForm('New Contributor', email, 'contributor'))

      const user = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.organizationId, orgId)),
      })
      expect(user?.role).toBe('contributor')
    })

    it('new user is always placed in the calling admin org — not any other org', async () => {
      const email = `org-check-${Date.now()}@test.example`
      await createUser(userForm('Org Check', email, 'viewer'))

      const user = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.organizationId, orgId)),
      })
      expect(user?.organizationId).toBe(orgId)
    })

    it('contributor cannot create users → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(
        createUser(userForm('Blocked', `blocked-${Date.now()}@test.example`, 'viewer')),
      ).rejects.toThrow('Forbidden')
    })

    it('viewer cannot create users → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(
        createUser(userForm('Also Blocked', `also-${Date.now()}@test.example`, 'viewer')),
      ).rejects.toThrow('Forbidden')
    })

    it('writes audit log: action=user.create, after includes email and role', async () => {
      const email = `audit-create-${Date.now()}@test.example`
      const before = await getAuditLogs(orgId, 'user.create')
      await createUser(userForm('Audit User', email, 'contributor'))
      const after = await getAuditLogs(orgId, 'user.create')

      expect(after).toHaveLength(before.length + 1)
      const entry = after[after.length - 1]
      expect(entry.userId).toBe(admin.id)
      expect(entry.after).toMatchObject({ email, role: 'contributor' })
    })
  })

  // ── updateUserRole ─────────────────────────────────────────────────────────

  describe('updateUserRole', () => {
    it('admin can promote viewer → contributor', async () => {
      await updateUserRole(viewer.id, 'contributor')
      const updated = await findUser(viewer.id)
      expect(updated?.role).toBe('contributor')

      // Restore
      await updateUserRole(viewer.id, 'viewer')
    })

    it('admin can promote contributor → admin', async () => {
      await updateUserRole(contributor.id, 'admin')
      const updated = await findUser(contributor.id)
      expect(updated?.role).toBe('admin')

      // Restore
      await updateUserRole(contributor.id, 'contributor')
    })

    it('contributor cannot update roles → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(updateUserRole(viewer.id, 'admin')).rejects.toThrow('Forbidden')

      // Role unchanged
      const check = await findUser(viewer.id)
      expect(check?.role).toBe('viewer')
    })

    it('viewer cannot update roles → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(updateUserRole(contributor.id, 'admin')).rejects.toThrow('Forbidden')
    })

    it('writes audit log with before/after role', async () => {
      // Ensure viewer is 'viewer' before this test
      await updateUserRole(viewer.id, 'viewer')

      await updateUserRole(viewer.id, 'contributor')

      const logs = await getAuditLogs(orgId, 'user.role_changed')
      const entry = logs.find(l => l.entityId === viewer.id && (l.after as Record<string, unknown>)?.role === 'contributor')
      expect(entry).toBeDefined()
      expect(entry!.before).toMatchObject({ role: 'viewer' })
      expect(entry!.after).toMatchObject({ role: 'contributor' })

      // Restore
      await updateUserRole(viewer.id, 'viewer')
    })
  })

  // ── deactivateUser ─────────────────────────────────────────────────────────

  describe('deactivateUser', () => {
    it('admin can deactivate a non-admin user', async () => {
      await deactivateUser(viewer.id)
      const updated = await findUser(viewer.id)
      expect(updated?.isActive).toBe('false')

      // Restore
      await db.update(users).set({ isActive: 'true' }).where(eq(users.id, viewer.id))
    })

    it('cannot deactivate the last admin → throws last admin guard', async () => {
      // admin is the only admin in this test org
      await expect(deactivateUser(admin.id)).rejects.toThrow(/last admin/i)

      const check = await findUser(admin.id)
      expect(check?.isActive).toBe('true')
    })

    it('contributor cannot deactivate users → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(deactivateUser(viewer.id)).rejects.toThrow('Forbidden')
    })

    it('writes audit log: action=user.deactivate', async () => {
      const before = await getAuditLogs(orgId, 'user.deactivate')
      await deactivateUser(viewer.id)
      const after = await getAuditLogs(orgId, 'user.deactivate')

      expect(after).toHaveLength(before.length + 1)
      expect(after[after.length - 1].entityId).toBe(viewer.id)

      // Restore
      await db.update(users).set({ isActive: 'true' }).where(eq(users.id, viewer.id))
    })
  })

  // ── deleteUser ─────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('admin can delete a user in the same org', async () => {
      const throwaway = await createTestUser(orgId, 'viewer')
      await deleteUser(throwaway.id)

      const check = await findUser(throwaway.id)
      expect(check).toBeUndefined()
    })

    it('contributor cannot delete users → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const throwaway = await createTestUser(orgId, 'viewer')

      await expect(deleteUser(throwaway.id)).rejects.toThrow('Forbidden')

      // Cleanup
      await db.delete(users).where(eq(users.id, throwaway.id))
    })

    it('viewer cannot delete users → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const throwaway = await createTestUser(orgId, 'viewer')

      await expect(deleteUser(throwaway.id)).rejects.toThrow('Forbidden')

      // Cleanup
      await db.delete(users).where(eq(users.id, throwaway.id))
    })
  })
})
