/**
 * Integration tests: cross-org boundary enforcement
 *
 * Verifies that assertOwnership() blocks callers from mutating content
 * they do not own. Tests use two independent orgs (A and B).
 *
 * Covers:
 *  - Editing a capability that belongs to another org
 *  - Deleting a capability that belongs to another org
 *  - Updating a user role for a user in another org (silent no-op due to WHERE scope)
 *  - Row integrity: targeted rows are unchanged after blocked attempts
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { editCapability, deleteCapability } from '@/actions/capabilities'
import { updateUserRole } from '@/actions/users'
import { db } from '@/db/client'
import { capabilities } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, insertCapability, findUser,
  type TestOrg, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function capForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('name', overrides.name ?? 'Cross-Org Attempt')
  fd.set('status', overrides.status ?? 'published')
  fd.set('visibility', overrides.visibility ?? 'org')
  // #567 Part B — the cross-org tests are about org boundaries, not the
  // publish-readiness gate; pre-acknowledge so the gate doesn't trip them.
  if ((overrides.status ?? 'published') === 'published') {
    fd.set('acknowledgePublishIncomplete', 'on')
  }
  return fd
}

describe('cross-org boundary enforcement', () => {
  let orgA: TestOrg, orgB: TestOrg
  let adminA: TestUser, contributorA: TestUser
  let adminB: TestUser
  let capBId: string  // capability owned by org B

  beforeAll(async () => {
    ;[orgA, orgB] = await Promise.all([createTestOrg(), createTestOrg()])
    ;[adminA, contributorA, adminB] = await Promise.all([
      createTestUser(orgA.id, 'admin'),
      createTestUser(orgA.id, 'contributor'),
      createTestUser(orgB.id, 'admin'),
    ])
    // Insert a capability in org B directly — no session needed for setup
    const cap = await insertCapability(orgB.id, 'Org B Exclusive Capability')
    capBId = cap.id
  })

  afterAll(() =>
    Promise.all([cleanupOrg(orgA.id), cleanupOrg(orgB.id)]),
  )

  // ── assertOwnership guards on capability mutations ─────────────────────────

  it('contributor from org A cannot edit a capability owned by org B', async () => {
    mockAuth.mockResolvedValue(makeSession(contributorA))

    await expect(
      editCapability(capBId, capForm({ name: 'Hijacked', status: 'published', visibility: 'org' })),
    ).rejects.toThrow(/Forbidden/)

    // Row must be unchanged
    const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capBId) })
    expect(cap?.name).toBe('Org B Exclusive Capability')
    expect(cap?.organizationId).toBe(orgB.id)
  })

  it('admin from org A cannot edit a capability owned by org B', async () => {
    mockAuth.mockResolvedValue(makeSession(adminA))

    await expect(
      editCapability(capBId, capForm({ name: 'Also Hijacked', status: 'draft', visibility: 'org' })),
    ).rejects.toThrow(/Forbidden/)

    const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capBId) })
    expect(cap?.name).toBe('Org B Exclusive Capability')
  })

  it('admin from org A cannot delete a capability owned by org B', async () => {
    mockAuth.mockResolvedValue(makeSession(adminA))

    await expect(deleteCapability(capBId)).rejects.toThrow(/Forbidden/)

    // Row must still exist
    const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capBId) })
    expect(cap).toBeDefined()
    expect(cap?.organizationId).toBe(orgB.id)
  })

  it('org B admin successfully operates on their own capability (sanity check)', async () => {
    mockAuth.mockResolvedValue(makeSession(adminB))

    await expect(
      editCapability(capBId, capForm({ name: 'B Updated', status: 'published', visibility: 'org' })),
    ).resolves.not.toThrow()

    const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capBId) })
    expect(cap?.name).toBe('B Updated')
  })

  // ── updateUserRole org scoping ─────────────────────────────────────────────

  it('org A admin cannot change the role of an org B user', async () => {
    mockAuth.mockResolvedValue(makeSession(adminA))

    const before = await findUser(adminB.id)
    // updateUserRole adds WHERE org_id = caller's org — org B user is outside scope
    // so 0 rows are updated (silent no-op, no error thrown)
    await updateUserRole(adminB.id, 'viewer')

    const after = await findUser(adminB.id)
    expect(after?.role).toBe(before?.role)  // unchanged
  })
})
