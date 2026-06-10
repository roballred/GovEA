/**
 * Integration tests: instance admin server actions (#240)
 *
 * Verifies that:
 * - grantBreakGlass creates a session row and writes audit log
 * - revokeBreakGlass sets revokedAt and writes audit log
 * - suspendOrg sets suspendedAt and writes audit log
 * - unsuspendOrg clears suspendedAt and writes audit log
 * - promoteInstanceAdmin / demoteInstanceAdmin toggle instanceRole
 * - suspendUserAccount / reactivateUserAccount toggle isActive with audit log
 * - All actions reject non-instance-admins (Forbidden)
 * - Tenant content is not accessible to instance admin without active break-glass
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  grantBreakGlass, revokeBreakGlass,
  suspendOrg, unsuspendOrg,
  promoteInstanceAdmin, demoteInstanceAdmin, setInstanceModuleAvailability, createInstanceUser,
  suspendUserAccount, reactivateUserAccount,
} from '@/actions/instance'
import { db } from '@/db/client'
import { breakGlassSessions, auditLog, instanceSettings, organizations, users, userOrganizationMemberships } from '@/db/schema'
import { eq, and, isNull, or, desc } from 'drizzle-orm'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { getPlatformAuditEvents } from '@/lib/audit-view'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, findOrg, findUser,
  type TestUser,
} from './helpers/db'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

const mockRevalidate = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

// #720 — proxy-aware request telemetry. Default to nulls (no request scope) so
// every action runs; individual tests override to assert IP/UA capture.
const mockRequestContext = vi.hoisted(() => vi.fn(async () => ({ ip: null as string | null, userAgent: null as string | null })))
vi.mock('@/lib/request-context', async (orig) => ({
  ...(await orig<typeof import('@/lib/request-context')>()),
  getRequestContext: mockRequestContext,
}))

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
  // Break-glass sessions FK (instance_admin_id → users, ON DELETE no action) blocks
  // cascade-delete of users when cleanupOrg runs, so purge sessions first.
  await db.delete(breakGlassSessions).where(
    or(
      eq(breakGlassSessions.targetOrgId, targetOrgId),
      eq(breakGlassSessions.targetOrgId, orgId),
    )
  )
  await cleanupOrg(orgId)
  await cleanupOrg(targetOrgId)
  await db.delete(instanceSettings)
})

function asInstanceAdmin() {
  mockAuth.mockResolvedValue(makeSession(instanceAdmin, { instanceRole: 'instance_admin' }))
}

function asRegularAdmin() {
  mockAuth.mockResolvedValue(makeSession(regularAdmin))
}

// ── Break-glass grant ─────────────────────────────────────────────────────────

describe('grantBreakGlass', () => {
  it('creates a session row expiring in 1h by default', async () => {
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
    expect(session!.requiresApproval).toBe(false)
    const expiresMs = session!.expiresAt.getTime()
    expect(expiresMs).toBeGreaterThan(before + 59 * 60_000)
    expect(expiresMs).toBeLessThan(before + 61 * 60_000)
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

// ── Instance-wide module controls ────────────────────────────────────────────

describe('setInstanceModuleAvailability', () => {
  it('stores a global disable override and writes an audit log', async () => {
    asInstanceAdmin()

    await setInstanceModuleAvailability('personas', false)

    const settings = await db.query.instanceSettings.findFirst()
    expect(settings).toBeDefined()
    expect(settings!.disabledModules.personas).toBe(true)

    const entries = await db.select().from(auditLog)
      .where(eq(auditLog.action, 'instance.settings.module_availability'))
    expect(entries.length).toBeGreaterThan(0)
  })

  it('forces the module off for an org even when the org enabled it', async () => {
    asInstanceAdmin()

    await db.update(organizations)
      .set({ enabledModules: { personas: true }, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await setInstanceModuleAvailability('personas', false)

    mockAuth.mockResolvedValue(makeSession(regularAdmin))
    const effectiveModules = await getEnabledModules()
    expect(effectiveModules.personas).toBe(false)
  })

  it('throws Forbidden for non-instance-admins', async () => {
    asRegularAdmin()
    await expect(setInstanceModuleAvailability('personas', false)).rejects.toThrow('Forbidden')
  })
})

describe('createInstanceUser', () => {
  it('creates a user account in the selected organization', async () => {
    asInstanceAdmin()

    const formData = new FormData()
    formData.set('organizationId', targetOrgId)
    formData.set('name', 'Platform-Created User')
    formData.set('email', 'platform-created@test.example')
    formData.set('password', 'test-password')
    formData.set('role', 'viewer')

    await createInstanceUser(formData)

    const created = await db.query.users.findFirst({
      where: eq(users.email, 'platform-created@test.example'),
    })
    expect(created).toBeDefined()
    expect(created!.organizationId).toBe(targetOrgId)
    expect(created!.role).toBe('viewer')
    expect(created!.instanceRole).toBeNull()
  })

  it('can create a platform admin account directly', async () => {
    asInstanceAdmin()

    const formData = new FormData()
    formData.set('organizationId', targetOrgId)
    formData.set('name', 'Platform Admin User')
    formData.set('email', 'platform-admin-created@test.example')
    formData.set('password', 'test-password')
    formData.set('role', 'admin')
    formData.set('instanceAdmin', 'on')

    await createInstanceUser(formData)

    const created = await db.query.users.findFirst({
      where: eq(users.email, 'platform-admin-created@test.example'),
    })
    expect(created).toBeDefined()
    expect(created!.instanceRole).toBe('instance_admin')
  })

  it('throws Forbidden for non-instance-admins', async () => {
    asRegularAdmin()

    const formData = new FormData()
    formData.set('organizationId', targetOrgId)
    formData.set('name', 'Nope User')
    formData.set('email', 'nope@test.example')
    formData.set('password', 'test-password')
    formData.set('role', 'viewer')

    await expect(createInstanceUser(formData)).rejects.toThrow('Forbidden')
  })
})

describe('createInstanceUser — existing email → org membership (#756)', () => {
  function fd(email: string, role: 'admin' | 'contributor' | 'viewer') {
    const f = new FormData()
    f.set('organizationId', targetOrgId)
    f.set('name', 'Ignored For Existing Identity')
    f.set('email', email)
    // Password is required by the form but must be ignored for an existing
    // identity — deliberately weak here to prove it is never validated/applied.
    f.set('password', 'x')
    f.set('role', role)
    return f
  }

  async function membership(userId: string) {
    const [m] = await db.select().from(userOrganizationMemberships).where(and(
      eq(userOrganizationMemberships.userId, userId),
      eq(userOrganizationMemberships.organizationId, targetOrgId),
    ))
    return m ?? null
  }

  it('adds an existing identity to the selected org without crashing or duplicating the user', async () => {
    asInstanceAdmin()
    const existing = await createTestUser(orgId, 'admin')
    // Mark as a platform admin to prove instanceRole is preserved.
    await db.update(users).set({ instanceRole: 'instance_admin' }).where(eq(users.id, existing.id))
    const hashBefore = (await db.query.users.findFirst({ where: eq(users.id, existing.id) }))!.passwordHash

    const result = await createInstanceUser(fd(existing.email, 'contributor'))
    expect(result.status).toBe('membership_added')

    // No duplicate users row.
    const rows = await db.select().from(users).where(eq(users.email, existing.email))
    expect(rows).toHaveLength(1)
    // Identity fields preserved: instanceRole + password hash untouched.
    expect(rows[0].instanceRole).toBe('instance_admin')
    expect(rows[0].passwordHash).toBe(hashBefore)

    // Active membership in the target org with the requested role.
    const m = await membership(existing.id)
    expect(m).not.toBeNull()
    expect(m!.role).toBe('contributor')
    expect(m!.isActive).toBe(true)
  })

  it('returns a handled already_member result for an already-active membership (no role change)', async () => {
    asInstanceAdmin()
    const existing = await createTestUser(orgId, 'viewer')
    await db.insert(userOrganizationMemberships).values({
      userId: existing.id, organizationId: targetOrgId, role: 'admin', isActive: true,
    })

    const result = await createInstanceUser(fd(existing.email, 'viewer'))
    expect(result.status).toBe('already_member')
    // Existing active role is not downgraded by the create attempt.
    expect((await membership(existing.id))!.role).toBe('admin')
  })

  it('reactivates an inactive membership and updates its role', async () => {
    asInstanceAdmin()
    const existing = await createTestUser(orgId, 'viewer')
    await db.insert(userOrganizationMemberships).values({
      userId: existing.id, organizationId: targetOrgId, role: 'viewer', isActive: false,
    })

    const result = await createInstanceUser(fd(existing.email, 'admin'))
    expect(result.status).toBe('membership_reactivated')
    const m = await membership(existing.id)
    expect(m!.isActive).toBe(true)
    expect(m!.role).toBe('admin')
  })

  it('writes an instance-level audit event for the membership add', async () => {
    asInstanceAdmin()
    const existing = await createTestUser(orgId, 'viewer')
    await createInstanceUser(fd(existing.email, 'viewer'))

    const [evt] = await db.select().from(auditLog).where(and(
      eq(auditLog.action, 'instance.user.membership_add'),
      eq(auditLog.entityId, existing.id),
    ))
    expect(evt).toBeDefined()
    expect(evt.organizationId).toBeNull() // instance-level
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

// ── Suspend / reactivate user account ────────────────────────────────────────

describe('suspendUserAccount', () => {
  it('sets isActive to false', async () => {
    asInstanceAdmin()
    await suspendUserAccount(regularUser.id, 'Security incident test')

    const u = await findUser(regularUser.id)
    expect(u!.isActive).toBe('false')
  })

  it('writes an audit log entry with reason and target org', async () => {
    const entries = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.user.suspend'), eq(auditLog.entityId, regularUser.id)))
    expect(entries.length).toBeGreaterThan(0)
    const entry = entries[0]
    expect(entry.userId).toBe(instanceAdmin.id)
    expect((entry.after as Record<string, unknown>).reason).toBe('Security incident test')
    expect((entry.after as Record<string, unknown>).targetOrgId).toBe(orgId)
  })

  it('throws if trying to suspend yourself', async () => {
    asInstanceAdmin()
    await expect(suspendUserAccount(instanceAdmin.id, 'Self')).rejects.toThrow('Cannot suspend yourself')
  })

  it('throws when suspending the last active admin in an org', async () => {
    asInstanceAdmin()
    // regularAdmin is the only admin with isActive='true' in orgId
    // (regularUser.role='viewer', instanceAdmin is in orgId but may or may not be active)
    // Create an isolated org with exactly one admin to guarantee the guard fires
    const soloOrg = await createTestOrg()
    const soloAdmin = await createTestUser(soloOrg.id, 'admin')
    try {
      await expect(suspendUserAccount(soloAdmin.id, 'Last admin test')).rejects.toThrow(
        'Cannot suspend the last active admin'
      )
    } finally {
      await cleanupOrg(soloOrg.id)
    }
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asRegularAdmin()
    await expect(suspendUserAccount(regularUser.id, 'x')).rejects.toThrow('Forbidden')
  })
})

describe('reactivateUserAccount', () => {
  it('sets isActive back to true', async () => {
    asInstanceAdmin()
    // regularUser was suspended above; reactivate it
    await reactivateUserAccount(regularUser.id, 'Cleared — reactivation test')

    const u = await findUser(regularUser.id)
    expect(u!.isActive).toBe('true')
  })

  it('writes an audit log entry with reason and target org', async () => {
    const entries = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.user.reactivate'), eq(auditLog.entityId, regularUser.id)))
    expect(entries.length).toBeGreaterThan(0)
    const entry = entries[0]
    expect(entry.userId).toBe(instanceAdmin.id)
    expect((entry.after as Record<string, unknown>).reason).toBe('Cleared — reactivation test')
  })

  it('throws Forbidden for non-instance-admin', async () => {
    asRegularAdmin()
    await expect(reactivateUserAccount(regularUser.id, 'x')).rejects.toThrow('Forbidden')
  })
})

// ── Audit telemetry: source IP + user agent on instance-admin events (#720) ───

describe('instance-admin audit telemetry (#720)', () => {
  const IP = '203.0.113.7'
  const UA = 'Vitest/1.0 (audit-telemetry)'

  beforeAll(() => {
    mockRequestContext.mockResolvedValue({ ip: IP, userAgent: UA })
  })

  afterAll(() => {
    mockRequestContext.mockResolvedValue({ ip: null, userAgent: null })
  })

  async function latestMeta(action: string, entityId: string) {
    const [row] = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, action), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.createdAt))
      .limit(1)
    return (row?.metadata ?? null) as { ip?: string; userAgent?: string } | null
  }

  it('captures IP + user agent on a break-glass grant', async () => {
    asInstanceAdmin()
    await grantBreakGlass(targetOrgId, 'Telemetry test grant')
    const meta = await latestMeta('instance.break_glass.grant', targetOrgId)
    expect(meta?.ip).toBe(IP)
    expect(meta?.userAgent).toBe(UA)
  })

  it('captures IP + user agent on org suspend', async () => {
    asInstanceAdmin()
    await suspendOrg(targetOrgId, 'Telemetry test suspend')
    const meta = await latestMeta('instance.org.suspend', targetOrgId)
    expect(meta?.ip).toBe(IP)
    expect(meta?.userAgent).toBe(UA)
    await unsuspendOrg(targetOrgId) // restore state for any later assertions
  })

  it('captures IP + user agent on a platform-admin promotion', async () => {
    asInstanceAdmin()
    await promoteInstanceAdmin(regularUser.id, 'Telemetry test promote')
    const meta = await latestMeta('instance.user.promote', regularUser.id)
    expect(meta?.ip).toBe(IP)
    expect(meta?.userAgent).toBe(UA)
    await demoteInstanceAdmin(regularUser.id, 'Telemetry test cleanup')
  })

  it('records null IP/UA gracefully outside a request scope (no crash)', async () => {
    asInstanceAdmin()
    mockRequestContext.mockResolvedValueOnce({ ip: null, userAgent: null })
    await grantBreakGlass(targetOrgId, 'No-context grant')
    // The action still succeeds and writes an entry; telemetry is simply null.
    const [row] = await db.select().from(auditLog)
      .where(and(eq(auditLog.action, 'instance.break_glass.grant'), eq(auditLog.entityId, targetOrgId)))
      .orderBy(desc(auditLog.createdAt)).limit(1)
    expect(row).toBeDefined()
    expect((row.metadata as { ip: string | null }).ip).toBeNull()
  })

  it('surfaces platform events with telemetry + actor for the CSV export', async () => {
    asInstanceAdmin()
    await suspendOrg(targetOrgId, 'Platform-events export test')
    await unsuspendOrg(targetOrgId)

    const events = await getPlatformAuditEvents({ sinceDays: 1 })
    const suspendEvt = events.find(e => e.action === 'instance.org.suspend' && e.entityId === targetOrgId)
    expect(suspendEvt).toBeDefined()
    expect(suspendEvt!.ip).toBe(IP)
    expect(suspendEvt!.userAgent).toBe(UA)
    expect(suspendEvt!.actorEmail).toBe(instanceAdmin.email)
  })
})
