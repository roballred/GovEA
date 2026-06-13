/**
 * Integration tests: memberships as the single source of truth for org
 * access (#796).
 *
 * Sessions, the org switcher, the SSO guard, and membership management all
 * resolve org access from user_organization_memberships — so every IAM write
 * path must keep that row in step with the legacy users columns. Each test
 * pins one row of the defect table in #796:
 *
 *   - org-side createUser           → membership created with the identity
 *   - org-side updateUserRole       → membership role synced (+ heals missing rows)
 *   - org-side deactivate/reactivate → membership isActive synced
 *   - org-side getUsers             → membership-only members are visible
 *   - instance createInstanceUser   → new identity gets a primary membership
 *   - instance create, existing id  → platform-admin checkbox honored + audited
 *   - SSO guard                     → instance-created identities resolve via membership
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db/client'
import { users, userOrganizationMemberships, auditLog } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
} from './helpers/db'
import type { TestOrg, TestUser } from './helpers/db'
import {
  createUser, updateUserRole, deactivateUser, reactivateUser, deleteUser, getUsers,
} from '@/actions/users'
import { createInstanceUser } from '@/actions/instance'
import { checkSsoProvisioning } from '@/lib/sso-guard'
import { randomUUID } from 'node:crypto'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

const PASSWORD = 'Str0ng!Passw0rd#796'

let org: TestOrg
let actor: TestUser

function fd(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [k, v] of Object.entries(fields)) data.append(k, v)
  return data
}

async function membershipRow(userId: string, orgId: string) {
  const [m] = await db.select().from(userOrganizationMemberships).where(and(
    eq(userOrganizationMemberships.userId, userId),
    eq(userOrganizationMemberships.organizationId, orgId),
  ))
  return m
}

beforeEach(async () => {
  org = await createTestOrg()
  actor = await createTestUser(org.id, 'admin')
  await db.insert(userOrganizationMemberships).values({
    userId: actor.id, organizationId: org.id, role: 'admin', isPrimary: true,
  })
  mockAuth.mockResolvedValue(makeSession(actor))
})

afterEach(async () => {
  await cleanupOrg(org.id)
})

describe('org-side user CRUD keeps memberships in sync (#796)', () => {
  it('createUser creates the canonical primary membership with the identity', async () => {
    const email = `iam796-${randomUUID().slice(0, 8)}@test.example`
    await createUser(fd({ name: 'New Member', email, password: PASSWORD, role: 'contributor' }))

    const user = await db.query.users.findFirst({ where: eq(users.email, email) })
    expect(user).toBeTruthy()
    expect(await membershipRow(user!.id, org.id)).toMatchObject({
      role: 'contributor', isActive: true, isPrimary: true,
    })
  })

  it('updateUserRole syncs the membership role — the value sessions resolve', async () => {
    const email = `iam796-${randomUUID().slice(0, 8)}@test.example`
    await createUser(fd({ name: 'Role Target', email, password: PASSWORD, role: 'viewer' }))
    const user = await db.query.users.findFirst({ where: eq(users.email, email) })

    await updateUserRole(user!.id, 'admin')
    expect((await membershipRow(user!.id, org.id)).role).toBe('admin')
  })

  it('updateUserRole heals a pre-#693 account with no membership row', async () => {
    // Legacy-shaped account: users.organizationId set, no membership row.
    const legacy = await createTestUser(org.id, 'viewer')
    expect(await membershipRow(legacy.id, org.id)).toBeUndefined()

    await updateUserRole(legacy.id, 'contributor')
    expect(await membershipRow(legacy.id, org.id)).toMatchObject({
      role: 'contributor', isActive: true,
    })
  })

  it('deactivateUser and reactivateUser sync the membership isActive flag', async () => {
    const email = `iam796-${randomUUID().slice(0, 8)}@test.example`
    await createUser(fd({ name: 'Toggle Target', email, password: PASSWORD, role: 'viewer' }))
    const user = await db.query.users.findFirst({ where: eq(users.email, email) })

    await deactivateUser(user!.id)
    expect((await membershipRow(user!.id, org.id)).isActive).toBe(false)

    await reactivateUser(user!.id)
    expect((await membershipRow(user!.id, org.id)).isActive).toBe(true)
  })

  it('getUsers lists membership-only members added cross-org via the instance console', async () => {
    // Identity homed in another org, granted access here purely by membership
    // (the #756 instance-console path).
    const otherOrg = await createTestOrg()
    const guest = await createTestUser(otherOrg.id, 'viewer')
    await db.insert(userOrganizationMemberships).values({
      userId: guest.id, organizationId: org.id, role: 'contributor',
    })

    const rows = await getUsers()
    const listed = rows.find(r => r.id === guest.id)
    expect(listed, 'membership-only member must be visible to the org admin').toBeTruthy()
    expect(listed!.role, 'membership role wins — it is what the session resolves').toBe('contributor')

    await cleanupOrg(otherOrg.id)
  })
})

describe('instance console creation paths (#796)', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(makeSession(actor, { instanceRole: 'instance_admin' }))
  })

  it('new identity gets a users row AND a primary membership in one transaction', async () => {
    const email = `iam796-inst-${randomUUID().slice(0, 8)}@test.example`
    const result = await createInstanceUser(fd({
      organizationId: org.id, name: 'Instance Created', email, password: PASSWORD,
      role: 'admin', instanceAdmin: 'on',
    }))

    expect(result.status).toBe('identity_created')
    const user = await db.query.users.findFirst({ where: eq(users.email, email) })
    expect(user?.instanceRole).toBe('instance_admin')
    expect(await membershipRow(user!.id, org.id)).toMatchObject({
      role: 'admin', isActive: true, isPrimary: true,
    })
  })

  it('new identity without the checkbox stays a regular org user', async () => {
    const email = `iam796-inst-${randomUUID().slice(0, 8)}@test.example`
    await createInstanceUser(fd({
      organizationId: org.id, name: 'Plain User', email, password: PASSWORD, role: 'viewer',
    }))

    const user = await db.query.users.findFirst({ where: eq(users.email, email) })
    expect(user?.instanceRole).toBeNull()
    expect(await membershipRow(user!.id, org.id)).toMatchObject({ role: 'viewer' })
  })

  it('existing identity: platform-admin checkbox is honored and audited, not ignored', async () => {
    const otherOrg = await createTestOrg()
    const existing = await createTestUser(otherOrg.id, 'viewer')

    const result = await createInstanceUser(fd({
      organizationId: org.id, name: existing.name, email: existing.email,
      password: 'irrelevant', role: 'contributor', instanceAdmin: 'on',
    }))

    expect(result.status).toBe('membership_added')
    expect(result.message).toMatch(/platform admin/i)
    const user = await db.query.users.findFirst({ where: eq(users.id, existing.id) })
    expect(user?.instanceRole).toBe('instance_admin')
    expect(await membershipRow(existing.id, org.id)).toMatchObject({ role: 'contributor' })

    const [promoteAudit] = await db.select().from(auditLog).where(and(
      eq(auditLog.action, 'instance.user.promote'),
      eq(auditLog.entityId, existing.id),
    ))
    expect(promoteAudit, 'promotion via the create form must be audited').toBeTruthy()

    await cleanupOrg(otherOrg.id)
  })

  it('existing identity already holding platform admin is not re-promoted', async () => {
    const otherOrg = await createTestOrg()
    const existing = await createTestUser(otherOrg.id, 'viewer')
    await db.update(users).set({ instanceRole: 'instance_admin' }).where(eq(users.id, existing.id))

    const result = await createInstanceUser(fd({
      organizationId: org.id, name: existing.name, email: existing.email,
      password: 'irrelevant', role: 'viewer', instanceAdmin: 'on',
    }))

    expect(result.status).toBe('membership_added')
    expect(result.message).not.toMatch(/platform admin/i)

    await cleanupOrg(otherOrg.id)
  })
})

describe('org-side removal is membership-scoped (#799)', () => {
  it('deactivating a multi-org member only deactivates the local membership', async () => {
    const otherOrg = await createTestOrg()
    const guest = await createTestUser(otherOrg.id, 'viewer')
    await db.insert(userOrganizationMemberships).values([
      { userId: guest.id, organizationId: otherOrg.id, role: 'viewer', isPrimary: true },
      { userId: guest.id, organizationId: org.id, role: 'contributor' },
    ])

    await deactivateUser(guest.id)

    expect((await membershipRow(guest.id, org.id)).isActive).toBe(false)
    expect((await membershipRow(guest.id, otherOrg.id)).isActive, 'other org untouched').toBe(true)
    const account = await db.query.users.findFirst({ where: eq(users.id, guest.id) })
    expect(account?.isActive, 'identity stays active — they still belong elsewhere').toBe('true')

    await cleanupOrg(otherOrg.id)
  })

  it('deactivating a platform admin does not deactivate their identity', async () => {
    const padmin = await createTestUser(org.id, 'viewer')
    await db.update(users).set({ instanceRole: 'instance_admin' }).where(eq(users.id, padmin.id))
    await db.insert(userOrganizationMemberships).values({
      userId: padmin.id, organizationId: org.id, role: 'viewer', isPrimary: true,
    })

    await deactivateUser(padmin.id)

    expect((await membershipRow(padmin.id, org.id)).isActive).toBe(false)
    const account = await db.query.users.findFirst({ where: eq(users.id, padmin.id) })
    expect(account?.isActive, 'platform admins keep /instance access').toBe('true')
    expect(account?.instanceRole).toBe('instance_admin')
  })

  it('deactivating a sole-anchor user still deactivates the account (unchanged)', async () => {
    const solo = await createTestUser(org.id, 'viewer')
    await db.insert(userOrganizationMemberships).values({
      userId: solo.id, organizationId: org.id, role: 'viewer', isPrimary: true,
    })

    await deactivateUser(solo.id)

    const account = await db.query.users.findFirst({ where: eq(users.id, solo.id) })
    expect(account?.isActive).toBe('false')
  })

  it('deleting a multi-org member severs the membership, keeps the identity, repoints home', async () => {
    const otherOrg = await createTestOrg()
    // Homed in the actor's org, member of both, last-active here.
    const dual = await createTestUser(org.id, 'viewer')
    await db.insert(userOrganizationMemberships).values([
      { userId: dual.id, organizationId: org.id, role: 'viewer', isPrimary: true },
      { userId: dual.id, organizationId: otherOrg.id, role: 'contributor' },
    ])
    await db.update(users).set({ lastActiveOrganizationId: org.id }).where(eq(users.id, dual.id))

    await deleteUser(dual.id)

    const account = await db.query.users.findFirst({ where: eq(users.id, dual.id) })
    expect(account, 'identity must survive').toBeTruthy()
    expect(account?.organizationId, 'home repointed to surviving membership').toBe(otherOrg.id)
    expect(account?.lastActiveOrganizationId, 'stale last-active cleared').toBeNull()
    expect(await membershipRow(dual.id, org.id)).toBeUndefined()
    expect((await membershipRow(dual.id, otherOrg.id)).role).toBe('contributor')

    await db.delete(users).where(eq(users.id, dual.id))
    await cleanupOrg(otherOrg.id)
  })

  it('deleting a sole-org platform admin is blocked and rolls back', async () => {
    const padmin = await createTestUser(org.id, 'viewer')
    await db.update(users).set({ instanceRole: 'instance_admin' }).where(eq(users.id, padmin.id))
    await db.insert(userOrganizationMemberships).values({
      userId: padmin.id, organizationId: org.id, role: 'viewer', isPrimary: true,
    })

    await expect(deleteUser(padmin.id)).rejects.toThrow(/platform admin/i)
    expect(await membershipRow(padmin.id, org.id), 'rollback keeps the membership').toBeTruthy()
    expect(await db.query.users.findFirst({ where: eq(users.id, padmin.id) })).toBeTruthy()
  })

  it('deleting a sole-anchor plain user still deletes the identity (unchanged)', async () => {
    const solo = await createTestUser(org.id, 'viewer')
    await db.insert(userOrganizationMemberships).values({
      userId: solo.id, organizationId: org.id, role: 'viewer', isPrimary: true,
    })

    await deleteUser(solo.id)
    expect(await db.query.users.findFirst({ where: eq(users.id, solo.id) })).toBeUndefined()
  })
})

describe('cross-org boundary stays silent-no-op (#796)', () => {
  it('acting on an unrelated user neither changes them nor mints a membership', async () => {
    const otherOrg = await createTestOrg()
    const foreign = await createTestUser(otherOrg.id, 'admin')

    await updateUserRole(foreign.id, 'viewer')
    await deactivateUser(foreign.id)
    await deleteUser(foreign.id)

    const account = await db.query.users.findFirst({ where: eq(users.id, foreign.id) })
    expect(account?.role, 'role unchanged').toBe('admin')
    expect(account?.isActive, 'still active').toBe('true')
    expect(
      await membershipRow(foreign.id, org.id),
      'no membership minted in the actor org',
    ).toBeUndefined()

    await cleanupOrg(otherOrg.id)
  })
})

describe('SSO guard sees instance-created users (#796)', () => {
  it('allows SSO sign-in for an identity created via the instance console', async () => {
    mockAuth.mockResolvedValue(makeSession(actor, { instanceRole: 'instance_admin' }))
    const email = `iam796-sso-${randomUUID().slice(0, 8)}@test.example`
    await createInstanceUser(fd({
      organizationId: org.id, name: 'SSO Candidate', email, password: PASSWORD, role: 'viewer',
    }))

    // Resolves through the membership row created with the identity — not
    // the legacy users-column fallback.
    expect(await checkSsoProvisioning(email)).toMatchObject({
      status: 'allowed', organizationId: org.id, role: 'viewer',
    })
  })
})
