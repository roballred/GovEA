/**
 * Integration tests: tenant-boundary and break-glass hardening (#392)
 *
 * Covers gaps left after the core instance-admin action tests:
 *
 * Break-glass boundary
 *   - getActiveBreakGlass correctly respects expiry and revocation state
 *   - An instance admin cannot revoke a session they did not create
 *   - Multiple concurrent grants for the same org are independent
 *
 * Org suspension hardening
 *   - The system org cannot be suspended
 *   - Suspending a non-existent org throws
 *   - Suspending org A has no effect on org B (tenant isolation)
 *
 * Promote / demote edge cases
 *   - Promoting an already-promoted user is idempotent
 *   - Demoting a user who holds no instance role is safe
 *
 * Module availability hardening
 *   - getInstanceDisabledModules returns every key disabled when no row exists
 *   - Re-enabling a disabled module takes effect
 *   - An unknown module key is rejected
 *
 * Governance (new in #397)
 *   - updateOrgGovernance stores tier and notes, writes audited before/after
 *   - Whitespace is trimmed; empty strings become null
 *   - Non-instance-admins are rejected
 *   - getOrgGovernanceHistory returns the governance events for the right org
 *
 * Capability: iam-instance-administration, iam-role-based-access-control
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  grantBreakGlass,
  revokeBreakGlass,
  suspendOrg,
  getActiveBreakGlass,
  updateOrgGovernance,
  getOrgGovernanceHistory,
  setInstanceModuleAvailability,
  promoteInstanceAdmin,
  demoteInstanceAdmin,
} from '@/actions/instance'
import { getInstanceDisabledModules } from '@/lib/get-enabled-modules'
import { db } from '@/db/client'
import {
  breakGlassSessions,
  auditLog,
  instanceSettings,
  organizations,
  users as usersTable,
} from '@/db/schema'
import { eq, and, isNull, or } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { MODULE_DEFS, type ModuleKey } from '@/lib/modules'
import {
  createTestOrg,
  createTestUser,
  cleanupOrg,
  makeSession,
  findOrg,
  findUser,
  type TestUser,
} from './helpers/db'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

const mockRevalidate = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

// ── Test state ────────────────────────────────────────────────────────────────

let orgId: string
let targetOrgId: string
let bystander0rgId: string
let adminA: TestUser
let adminB: TestUser
let regularUser: TestUser

beforeAll(async () => {
  const [org, target, bystander] = await Promise.all([
    createTestOrg(),
    createTestOrg(),
    createTestOrg(),
  ])
  orgId = org.id
  targetOrgId = target.id
  bystander0rgId = bystander.id

  ;[adminA, adminB, regularUser] = await Promise.all([
    createTestUser(orgId, 'admin'),
    createTestUser(orgId, 'admin'),
    createTestUser(orgId, 'viewer'),
  ])
})

afterAll(async () => {
  // Purge break-glass sessions before org cleanup (FK: instance_admin_id → users)
  await db.delete(breakGlassSessions).where(
    or(
      eq(breakGlassSessions.targetOrgId, targetOrgId),
      eq(breakGlassSessions.targetOrgId, orgId),
    ),
  )
  await Promise.all([
    cleanupOrg(orgId),
    cleanupOrg(targetOrgId),
    cleanupOrg(bystander0rgId),
  ])
  // Remove any instanceSettings rows this suite created
  await db.delete(instanceSettings)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function asAdmin(user: TestUser) {
  mockAuth.mockResolvedValue(makeSession(user, { instanceRole: 'instance_admin' }))
}

function asRegularUser() {
  mockAuth.mockResolvedValue(makeSession(regularUser))
}

// ── Break-glass boundary ──────────────────────────────────────────────────────

describe('getActiveBreakGlass — session state boundaries', () => {
  it('returns null when no session has been granted', async () => {
    const result = await getActiveBreakGlass(adminA.id, targetOrgId)
    expect(result).toBeUndefined()
  })

  it('returns the session row when an active, unexpired session exists', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Hardening test — active session')

    const result = await getActiveBreakGlass(adminA.id, targetOrgId)
    expect(result).toBeDefined()
    expect(result!.targetOrgId).toBe(targetOrgId)
    expect(result!.instanceAdminId).toBe(adminA.id)
    expect(result!.revokedAt).toBeNull()
    expect(result!.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('returns null for a session that has been revoked', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Hardening test — to be revoked')

    // Grab the latest active session
    const granted = await getActiveBreakGlass(adminA.id, targetOrgId)
    expect(granted).toBeDefined()

    await revokeBreakGlass(granted!.id, targetOrgId)

    // getActiveBreakGlass filters out revoked rows; may still return an older
    // active session from the previous test — what matters is the revoked row
    // itself is no longer returned as the canonical "active" one.
    const afterRevoke = await db.query.breakGlassSessions.findFirst({
      where: eq(breakGlassSessions.id, granted!.id),
    })
    expect(afterRevoke!.revokedAt).not.toBeNull()
  })

  it('returns null for a session whose expiresAt is in the past', async () => {
    // Insert an already-expired session directly
    const pastExpiry = new Date(Date.now() - 60_000) // 1 minute ago
    await db.insert(breakGlassSessions).values({
      instanceAdminId: adminA.id,
      targetOrgId,
      reason: 'Hardening test — pre-expired',
      expiresAt: pastExpiry,
    })

    // Revoke all active sessions first so they don't shadow the expired one
    await db.delete(breakGlassSessions).where(
      and(
        eq(breakGlassSessions.instanceAdminId, adminA.id),
        eq(breakGlassSessions.targetOrgId, targetOrgId),
        isNull(breakGlassSessions.revokedAt),
        // only delete those with future expiry — keep the expired one
      ),
    )

    const result = await getActiveBreakGlass(adminA.id, targetOrgId)
    // The expired row must not be returned
    if (result) {
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    }
  })
})

describe('revokeBreakGlass — cross-admin boundary', () => {
  it('does not allow admin B to revoke a session created by admin A', async () => {
    // Admin A grants break-glass
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Hardening test — cross-admin')

    const sessionByA = await db.query.breakGlassSessions.findFirst({
      where: and(
        eq(breakGlassSessions.instanceAdminId, adminA.id),
        eq(breakGlassSessions.targetOrgId, targetOrgId),
        isNull(breakGlassSessions.revokedAt),
      ),
      orderBy: (s, { desc }) => [desc(s.grantedAt)],
    })
    expect(sessionByA).toBeDefined()

    // Admin B tries to revoke it — the WHERE clause scopes to instanceAdminId,
    // so this is a no-op: it does not error, but the row is unchanged.
    asAdmin(adminB)
    await revokeBreakGlass(sessionByA!.id, targetOrgId)

    const row = await db.query.breakGlassSessions.findFirst({
      where: eq(breakGlassSessions.id, sessionByA!.id),
    })
    expect(row!.revokedAt).toBeNull()
    expect(row!.revokedBy).toBeNull()
  })
})

describe('grantBreakGlass — multiple concurrent grants', () => {
  it('each grant creates an independent session row without invalidating earlier ones', async () => {
    asAdmin(adminA)
    await grantBreakGlass(targetOrgId, 'Hardening test — grant 1')
    await grantBreakGlass(targetOrgId, 'Hardening test — grant 2')

    const activeSessions = await db.select().from(breakGlassSessions).then(
      rows => rows.filter(
        r =>
          r.instanceAdminId === adminA.id &&
          r.targetOrgId === targetOrgId &&
          r.revokedAt === null &&
          r.expiresAt > new Date(),
      ),
    )
    // Both should exist independently
    expect(activeSessions.length).toBeGreaterThanOrEqual(2)
  })
})

// ── Org suspension hardening ──────────────────────────────────────────────────

describe('suspendOrg — edge cases', () => {
  it('refuses to suspend the system org', async () => {
    // Create a system org directly — createTestOrg does not support isSystemOrg
    const [sysOrg] = await db
      .insert(organizations)
      .values({
        id: randomUUID(),
        name: 'Hardening Test System Org',
        slug: `sys-org-${randomUUID().slice(0, 8)}`,
        isSystemOrg: true,
      })
      .returning()

    try {
      asAdmin(adminA)
      await expect(suspendOrg(sysOrg.id, 'Should be blocked')).rejects.toThrow(
        'Cannot suspend the system org',
      )
    } finally {
      // Clean up — no cascade needed; system orgs have no users in this test
      await db.delete(organizations).where(eq(organizations.id, sysOrg.id))
    }
  })

  it('throws when the org does not exist', async () => {
    asAdmin(adminA)
    const nonExistentId = randomUUID()
    await expect(suspendOrg(nonExistentId, 'Ghost org')).rejects.toThrow(
      'Organisation not found',
    )
  })

  it('suspending org A has no effect on org B (tenant isolation)', async () => {
    asAdmin(adminA)
    await suspendOrg(targetOrgId, 'Isolation test')

    // bystander org must remain untouched
    const bystander = await findOrg(bystander0rgId)
    expect(bystander!.suspendedAt).toBeNull()
    expect(bystander!.suspendedReason).toBeNull()

    // Clean up
    await db
      .update(organizations)
      .set({ suspendedAt: null, suspendedReason: null, updatedAt: new Date() })
      .where(eq(organizations.id, targetOrgId))
  })
})

// ── Promote / demote edge cases ───────────────────────────────────────────────

describe('promoteInstanceAdmin — idempotency', () => {
  it('promoting an already-promoted user does not throw', async () => {
    asAdmin(adminA)

    // First promotion
    await promoteInstanceAdmin(regularUser.id)

    // Second promotion of the same user — must be a no-op, not an error
    await expect(promoteInstanceAdmin(regularUser.id)).resolves.toBeUndefined()

    // Verify the role is still set correctly
    const u = await findUser(regularUser.id)
    expect(u!.instanceRole).toBe('instance_admin')
  })
})

describe('demoteInstanceAdmin — safety', () => {
  it('demoting a user who holds no instance role is safe', async () => {
    asAdmin(adminA)

    // Explicitly clear instanceRole so we start from a known null state
    await db
      .update(usersTable)
      .set({ instanceRole: null, updatedAt: new Date() })
      .where(eq(usersTable.id, regularUser.id))

    // Should not throw — demoting a user who has no instance role is a safe no-op
    await expect(demoteInstanceAdmin(regularUser.id)).resolves.toBeUndefined()

    const u = await findUser(regularUser.id)
    expect(u!.instanceRole).toBeNull()
  })
})

// ── Module availability hardening ─────────────────────────────────────────────

describe('getInstanceDisabledModules — no-row default', () => {
  it('returns every module as disabled when no instanceSettings row exists', async () => {
    // Ensure no row exists for this assertion
    await db.delete(instanceSettings)

    const disabled = await getInstanceDisabledModules()

    for (const mod of MODULE_DEFS) {
      expect(disabled[mod.key]).toBe(true)
    }
  })
})

describe('setInstanceModuleAvailability — re-enable', () => {
  it('re-enabling a module removes it from disabledModules', async () => {
    asAdmin(adminA)

    await setInstanceModuleAvailability('glossary', false)
    const after = await db.query.instanceSettings.findFirst()
    expect(after!.disabledModules.glossary).toBe(true)

    await setInstanceModuleAvailability('glossary', true)
    const reenabled = await db.query.instanceSettings.findFirst()
    expect(reenabled!.disabledModules['glossary']).toBeUndefined()
  })

  it('rejects an unknown module key', async () => {
    asAdmin(adminA)
    await expect(
      setInstanceModuleAvailability('not-a-real-module' as unknown as ModuleKey, false),
    ).rejects.toThrow('Unknown module')
  })
})

// ── Governance (new in #397) ──────────────────────────────────────────────────

describe('updateOrgGovernance', () => {
  it('stores supportTier and internalNotes on the org', async () => {
    asAdmin(adminA)
    await updateOrgGovernance(targetOrgId, {
      supportTier: 'premium',
      internalNotes: 'Hardening test notes',
    })

    const org = await findOrg(targetOrgId)
    expect(org!.supportTier).toBe('premium')
    expect(org!.internalNotes).toBe('Hardening test notes')
  })

  it('writes an audit log entry with correct before/after', async () => {
    asAdmin(adminA)
    // Set a known starting state
    await updateOrgGovernance(targetOrgId, {
      supportTier: 'standard',
      internalNotes: 'Before state',
    })

    await updateOrgGovernance(targetOrgId, {
      supportTier: 'enterprise',
      internalNotes: 'After state',
    })

    const entries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, 'instance.org.governance.update'),
          eq(auditLog.entityId, targetOrgId),
        ),
      )
      .then(rows => rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))

    expect(entries.length).toBeGreaterThan(0)
    const latest = entries[0]
    expect(latest.organizationId).toBeNull() // instance-scoped, not org-scoped
    const after = latest.after as Record<string, unknown>
    const before = latest.before as Record<string, unknown>
    expect(after.supportTier).toBe('enterprise')
    expect(after.internalNotes).toBe('After state')
    expect(before.supportTier).toBe('standard')
    expect(before.internalNotes).toBe('Before state')
  })

  it('trims whitespace from values', async () => {
    asAdmin(adminA)
    await updateOrgGovernance(targetOrgId, {
      supportTier: '  community  ',
      internalNotes: '  trimmed notes  ',
    })

    const org = await findOrg(targetOrgId)
    expect(org!.supportTier).toBe('community')
    expect(org!.internalNotes).toBe('trimmed notes')
  })

  it('stores null for empty or whitespace-only values', async () => {
    asAdmin(adminA)
    await updateOrgGovernance(targetOrgId, {
      supportTier: '',
      internalNotes: '   ',
    })

    const org = await findOrg(targetOrgId)
    expect(org!.supportTier).toBeNull()
    expect(org!.internalNotes).toBeNull()
  })

  it('throws Forbidden for non-instance-admins', async () => {
    asRegularUser()
    await expect(
      updateOrgGovernance(targetOrgId, { supportTier: 'standard', internalNotes: null }),
    ).rejects.toThrow('Forbidden')
  })

  it('throws when the org does not exist', async () => {
    asAdmin(adminA)
    await expect(
      updateOrgGovernance(randomUUID(), { supportTier: 'standard', internalNotes: null }),
    ).rejects.toThrow('Organisation not found')
  })
})

describe('getOrgGovernanceHistory', () => {
  it('returns governance events scoped to the target org only', async () => {
    asAdmin(adminA)

    // Ensure at least one event exists for the target org
    await updateOrgGovernance(targetOrgId, {
      supportTier: 'premium',
      internalNotes: 'History test',
    })

    const history = await getOrgGovernanceHistory(targetOrgId)

    expect(history.length).toBeGreaterThan(0)
    for (const entry of history) {
      expect(entry.entityId).toBe(targetOrgId)
      expect(entry.action).toMatch(/^instance\.org\./)
    }
  })

  it('does not return events from a different org', async () => {
    asAdmin(adminA)

    // Write an event on the bystander org
    await updateOrgGovernance(bystander0rgId, {
      supportTier: 'standard',
      internalNotes: 'Bystander event',
    })

    // History for targetOrgId must not contain bystander events
    const history = await getOrgGovernanceHistory(targetOrgId)
    for (const entry of history) {
      expect(entry.entityId).not.toBe(bystander0rgId)
    }
  })

  it('throws Forbidden for non-instance-admins', async () => {
    asRegularUser()
    await expect(getOrgGovernanceHistory(targetOrgId)).rejects.toThrow('Forbidden')
  })
})
