/**
 * Integration tests: SSO provisioning guard (#213)
 *
 * Covers:
 *  - Not-provisioned identity is blocked (no DB record for the email)
 *  - Deactivated user is blocked
 *  - User with no org binding is blocked (defense-in-depth; schema makes this
 *    impossible in normal operation but guard must handle it explicitly)
 *  - Fully provisioned, active user with org binding is allowed
 *  - Duplicate email across orgs is rejected at the DB level (#269)
 *  - #693: org binding resolves through memberships first (same resolution
 *    as credentials sign-in), with the users-row pointer as fallback
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { users, userOrganizationMemberships } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { checkSsoProvisioning } from '@/lib/sso-guard'
import {
  createTestOrg, createTestUser, cleanupOrg,
  type TestUser,
} from './helpers/db'

describe('checkSsoProvisioning', () => {
  let orgId: string
  let activeUser: TestUser
  let inactiveUser: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[activeUser, inactiveUser] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
    // Deactivate the inactive user directly
    await db.update(users).set({ isActive: 'false' }).where(eq(users.id, inactiveUser.id))
  })

  afterAll(() => cleanupOrg(orgId))

  it('returns not_provisioned for an email not in the database', async () => {
    const result = await checkSsoProvisioning('no-such-user@example.com')
    expect(result.status).toBe('not_provisioned')
  })

  it('returns deactivated for an inactive user', async () => {
    const result = await checkSsoProvisioning(inactiveUser.email)
    expect(result.status).toBe('deactivated')
    if (result.status === 'deactivated') {
      expect(result.userId).toBe(inactiveUser.id)
    }
  })

  it('returns allowed for a fully provisioned, active user', async () => {
    const result = await checkSsoProvisioning(activeUser.email)
    expect(result.status).toBe('allowed')
    if (result.status === 'allowed') {
      expect(result.userId).toBe(activeUser.id)
      expect(result.organizationId).toBe(orgId)
      expect(result.role).toBe('contributor')
    }
  })

  it('allowed result carries correct role and org', async () => {
    const adminUser = await createTestUser(orgId, 'admin')
    const result = await checkSsoProvisioning(adminUser.email)
    expect(result.status).toBe('allowed')
    if (result.status === 'allowed') {
      expect(result.role).toBe('admin')
      expect(result.organizationId).toBe(orgId)
    }
  })

  // NOTE: The `no_org_binding` branch in checkSsoProvisioning exists as
  // defense-in-depth for a scenario the current schema makes impossible:
  // `users.organization_id` is NOT NULL (enforced since migration 0009), so
  // there is no way to insert or update a row to organizationId = null via
  // Drizzle or PostgreSQL. The guard is kept in production code for forward
  // compatibility (e.g. if the constraint is ever relaxed or a raw SQL import
  // creates a null row), but the test case cannot be exercised against the
  // current schema without violating the NOT NULL constraint.
  //
  // If the schema ever allows null org bindings again, re-enable this test.
})

describe('global email uniqueness (#269)', () => {
  let orgAId: string
  let orgBId: string

  beforeAll(async () => {
    const [orgA, orgB] = await Promise.all([createTestOrg(), createTestOrg()])
    orgAId = orgA.id
    orgBId = orgB.id
  })

  afterAll(async () => {
    await Promise.all([cleanupOrg(orgAId), cleanupOrg(orgBId)])
  })

  it('rejects inserting the same email into a second org', async () => {
    const suffix = randomUUID().slice(0, 8)
    const sharedEmail = `shared-${suffix}@test.example`

    // First insert into org A — must succeed
    await db.insert(users).values({
      id: randomUUID(),
      organizationId: orgAId,
      email: sharedEmail,
      name: 'User A',
      role: 'viewer',
      isActive: 'true',
    })

    // Second insert with same email into org B — must fail with unique violation.
    // drizzle@0.45.x wraps DB errors as "Failed query: ..."; the Postgres unique
    // constraint text is in error.cause, so we check the full error chain.
    const insertError = await db.insert(users).values({
      id: randomUUID(),
      organizationId: orgBId,
      email: sharedEmail,
      name: 'User B',
      role: 'viewer',
      isActive: 'true',
    }).catch((e: unknown) => e)
    expect(insertError).toBeInstanceOf(Error)
    const errText = [(insertError as Error).message, String((insertError as Error).cause ?? '')].join(' ')
    expect(errText).toMatch(/unique|duplicate/i)
  })

  it('checkSsoProvisioning resolves to exactly one user when email is globally unique', async () => {
    const user = await createTestUser(orgAId, 'contributor')
    const result = await checkSsoProvisioning(user.email)
    expect(result.status).toBe('allowed')
    if (result.status === 'allowed') {
      expect(result.userId).toBe(user.id)
      expect(result.organizationId).toBe(orgAId)
    }
  })
})

// ── #693 — membership-aware org binding ──────────────────────────────────────
// SSO sign-in must resolve the same membership set as credentials sign-in:
// memberships are the source of truth, the users-row org pointer is fallback.
describe('checkSsoProvisioning — multi-org memberships (#693)', () => {
  let orgAId: string
  let orgBId: string
  let multiOrgUser: TestUser

  beforeAll(async () => {
    const [a, b] = await Promise.all([createTestOrg(), createTestOrg()])
    orgAId = a.id
    orgBId = b.id
    multiOrgUser = await createTestUser(orgAId, 'admin')
    await db.insert(userOrganizationMemberships).values([
      { userId: multiOrgUser.id, organizationId: orgAId, role: 'admin', isPrimary: true },
      { userId: multiOrgUser.id, organizationId: orgBId, role: 'viewer' },
    ])
  })

  afterAll(async () => {
    await cleanupOrg(orgAId)
    await cleanupOrg(orgBId)
  })

  it('resolves via memberships when the home-org membership is revoked (#756 scenario)', async () => {
    // Home pointer says org B, but the B membership is revoked and the only
    // active membership is in A. Credentials sign-in resolves A via the jwt
    // callback; SSO must agree — the old users-row-only check said B.
    const mover = await createTestUser(orgBId, 'viewer')
    await db.insert(userOrganizationMemberships).values([
      { userId: mover.id, organizationId: orgBId, role: 'viewer', isActive: false },
      { userId: mover.id, organizationId: orgAId, role: 'contributor' },
    ])

    const result = await checkSsoProvisioning(mover.email)
    expect(result.status).toBe('allowed')
    if (result.status === 'allowed') {
      expect(result.organizationId).toBe(orgAId)
      expect(result.role).toBe('contributor')
    }
  })

  it('resolves the membership role of the last-selected org — per-org roles, same as credentials', async () => {
    await db.update(users)
      .set({ lastActiveOrganizationId: orgBId })
      .where(eq(users.id, multiOrgUser.id))

    const result = await checkSsoProvisioning(multiOrgUser.email)
    expect(result.status).toBe('allowed')
    if (result.status === 'allowed') {
      expect(result.organizationId).toBe(orgBId)
      expect(result.role).toBe('viewer') // viewer in B, admin in A
    }
  })

  it('falls back to the users-row pointer for accounts with no membership rows', async () => {
    // Pre-membership accounts (or rows missed by backfill) keep working: the
    // denormalized home pointer is the documented fallback (#693 Q1).
    const legacy = await createTestUser(orgAId, 'contributor')

    const result = await checkSsoProvisioning(legacy.email)
    expect(result.status).toBe('allowed')
    if (result.status === 'allowed') {
      expect(result.organizationId).toBe(orgAId)
      expect(result.role).toBe('contributor')
    }
  })
})
