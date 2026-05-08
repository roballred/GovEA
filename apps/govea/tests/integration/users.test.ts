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
import { createUser, updateUserRole, deactivateUser, deleteUser, editUser, getUsers } from '@/actions/users'
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

function userForm(name: string, email: string, role: string, password = 'TestPassword123!'): FormData {
  const fd = new FormData()
  fd.set('name', name)
  fd.set('email', email)
  fd.set('password', password)
  fd.set('role', role)
  return fd
}

function editForm(name: string, email: string, role: string, password?: string): FormData {
  const fd = new FormData()
  fd.set('name', name)
  fd.set('email', email)
  fd.set('role', role)
  if (password !== undefined) fd.set('password', password)
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

  // ── getUsers ───────────────────────────────────────────────────────────────
  // Locks in the security fix from #411: server action requires admin session,
  // ignores any caller-supplied parameter, and never returns passwordHash.

  describe('getUsers', () => {
    it('admin in own org receives the org user list', async () => {
      const list = await getUsers()
      const ids = list.map(u => u.id)
      expect(ids).toContain(admin.id)
      expect(ids).toContain(contributor.id)
      expect(ids).toContain(viewer.id)
    })

    it('returned rows never include passwordHash or other secret fields', async () => {
      const list = await getUsers()
      expect(list.length).toBeGreaterThan(0)
      for (const row of list) {
        expect(row).not.toHaveProperty('passwordHash')
        expect(row).not.toHaveProperty('emailVerified')
        expect(row).not.toHaveProperty('image')
      }
    })

    it('contributor session → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(getUsers()).rejects.toThrow('Forbidden')
    })

    it('viewer session → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(getUsers()).rejects.toThrow('Forbidden')
    })

    it('no session → redirects to /login', async () => {
      mockAuth.mockResolvedValue(null)
      await expect(getUsers()).rejects.toThrow('REDIRECT:/login')
    })

    it('cross-tenant isolation: admin only ever sees their own org users', async () => {
      // Set up a second org with its own admin and a viewer
      const otherOrg = await createTestOrg()
      try {
        const otherAdmin = await createTestUser(otherOrg.id, 'admin')
        const otherViewer = await createTestUser(otherOrg.id, 'viewer')

        // Even when authenticated as otherAdmin, getUsers returns only otherOrg
        mockAuth.mockResolvedValue(makeSession(otherAdmin))
        const otherList = await getUsers()
        const otherIds = otherList.map(u => u.id)
        expect(otherIds).toContain(otherAdmin.id)
        expect(otherIds).toContain(otherViewer.id)
        expect(otherIds).not.toContain(admin.id)
        expect(otherIds).not.toContain(contributor.id)
        expect(otherIds).not.toContain(viewer.id)

        // And the original admin still sees only their own org
        mockAuth.mockResolvedValue(makeSession(admin))
        const ownList = await getUsers()
        const ownIds = ownList.map(u => u.id)
        expect(ownIds).not.toContain(otherAdmin.id)
        expect(ownIds).not.toContain(otherViewer.id)
      } finally {
        await cleanupOrg(otherOrg.id)
      }
    })
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

    // ── password strength (#215) ────────────────────────────────────────────

    describe('password strength enforcement', () => {
      it('rejects an empty password → throws validation error', async () => {
        await expect(
          createUser(userForm('Bad User', `empty-pw-${Date.now()}@test.example`, 'viewer', '')),
        ).rejects.toThrow('Password is required')
      })

      it('rejects a whitespace-only password → throws validation error', async () => {
        await expect(
          createUser(userForm('Bad User', `space-pw-${Date.now()}@test.example`, 'viewer', '        ')),
        ).rejects.toThrow('Password is required')
      })

      it('rejects a password shorter than 8 characters → throws validation error', async () => {
        await expect(
          createUser(userForm('Short Pw', `short-pw-${Date.now()}@test.example`, 'viewer', 'abc123')),
        ).rejects.toThrow(/at least 8 characters/i)
      })

      it('accepts a password of exactly 8 characters', async () => {
        const email = `exact8-${Date.now()}@test.example`
        await expect(
          createUser(userForm('Exact Eight', email, 'viewer', 'Abcd1234')),
        ).resolves.not.toThrow()

        const created = await db.query.users.findFirst({
          where: and(eq(users.email, email), eq(users.organizationId, orgId)),
        })
        expect(created).toBeDefined()

        // Cleanup
        if (created) await db.delete(users).where(eq(users.id, created.id))
      })

      it('rejected password leaves no user row in the database', async () => {
        const email = `no-row-${Date.now()}@test.example`
        await expect(
          createUser(userForm('Ghost', email, 'viewer', 'short')),
        ).rejects.toThrow()

        const row = await db.query.users.findFirst({
          where: and(eq(users.email, email), eq(users.organizationId, orgId)),
        })
        expect(row).toBeUndefined()
      })
    })
  })

  // ── editUser ───────────────────────────────────────────────────────────────

  describe('editUser', () => {
    it('admin can update a user name and role', async () => {
      const target = await createTestUser(orgId, 'viewer')
      await editUser(target.id, editForm('Updated Name', target.email, 'contributor'))

      const updated = await findUser(target.id)
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.role).toBe('contributor')

      // Cleanup
      await db.delete(users).where(eq(users.id, target.id))
    })

    it('omitting password field leaves the existing hash unchanged', async () => {
      const target = await createTestUser(orgId, 'viewer')
      const before = await findUser(target.id)

      await editUser(target.id, editForm('Same Name', target.email, 'viewer'))

      const after = await findUser(target.id)
      expect(after?.passwordHash).toBe(before?.passwordHash)

      // Cleanup
      await db.delete(users).where(eq(users.id, target.id))
    })

    it('rejects a new password shorter than 8 characters → throws validation error', async () => {
      const target = await createTestUser(orgId, 'viewer')
      const before = await findUser(target.id)

      await expect(
        editUser(target.id, editForm(target.name ?? 'U', target.email, 'viewer', 'short')),
      ).rejects.toThrow(/at least 8 characters/i)

      // Hash must be unchanged — the short password was never applied
      const after = await findUser(target.id)
      expect(after?.passwordHash).toBe(before?.passwordHash)

      // Cleanup
      await db.delete(users).where(eq(users.id, target.id))
    })

    it('accepts a new password of 8+ characters and updates the hash', async () => {
      const target = await createTestUser(orgId, 'viewer')
      const before = await findUser(target.id)

      await editUser(target.id, editForm(target.name ?? 'U', target.email, 'viewer', 'NewPass99'))

      const after = await findUser(target.id)
      expect(after?.passwordHash).not.toBe(before?.passwordHash)

      // Cleanup
      await db.delete(users).where(eq(users.id, target.id))
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
