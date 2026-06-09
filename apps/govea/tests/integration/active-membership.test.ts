/**
 * Integration tests: resolveActiveMembership (#693 slice 2 / #705)
 *
 * Pins the server-side resolution of a user's *active* org/role from
 * user_organization_memberships — the value that flows into the JWT/session.
 * Selection order: primary active → oldest active → null.
 * See docs/design/multi-org-membership.md.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { db } from '@/db/client'
import { userOrganizationMemberships } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { resolveActiveMembership } from '@/lib/active-membership'
import { createTestOrg, createTestUser, cleanupOrg } from './helpers/db'

describe('resolveActiveMembership (#693 slice 2)', () => {
  const orgIds: string[] = []

  afterEach(async () => {
    while (orgIds.length) await cleanupOrg(orgIds.pop()!)
  })

  async function org() {
    const o = await createTestOrg()
    orgIds.push(o.id)
    return o.id
  }

  it('returns the primary active membership', async () => {
    const a = await org(); const b = await org()
    const user = await createTestUser(a, 'viewer')
    await db.insert(userOrganizationMemberships).values([
      { userId: user.id, organizationId: a, role: 'viewer', isPrimary: false },
      { userId: user.id, organizationId: b, role: 'admin', isPrimary: true },
    ])
    const active = await resolveActiveMembership(user.id)
    expect(active).toEqual({ organizationId: b, role: 'admin' })
  })

  it('falls back to the oldest active membership when none is primary', async () => {
    const a = await org(); const b = await org()
    const user = await createTestUser(a, 'viewer')
    const older = new Date('2026-01-01T00:00:00Z')
    const newer = new Date('2026-02-01T00:00:00Z')
    await db.insert(userOrganizationMemberships).values([
      { userId: user.id, organizationId: b, role: 'admin', isPrimary: false, createdAt: newer },
      { userId: user.id, organizationId: a, role: 'contributor', isPrimary: false, createdAt: older },
    ])
    const active = await resolveActiveMembership(user.id)
    expect(active).toEqual({ organizationId: a, role: 'contributor' })
  })

  it('ignores inactive memberships and returns null when none are active', async () => {
    const a = await org()
    const user = await createTestUser(a, 'admin')
    await db.insert(userOrganizationMemberships).values({
      userId: user.id, organizationId: a, role: 'admin', isPrimary: true, isActive: false,
    })
    const active = await resolveActiveMembership(user.id)
    expect(active).toBeNull()
  })

  it('returns null when the user has no membership rows', async () => {
    const a = await org()
    const user = await createTestUser(a, 'admin')
    const rows = await db.select().from(userOrganizationMemberships)
      .where(eq(userOrganizationMemberships.userId, user.id))
    expect(rows).toHaveLength(0)
    expect(await resolveActiveMembership(user.id)).toBeNull()
  })

  // #693 slice 3a — last-selected (preferredOrgId) takes precedence.
  it('honors a valid preferred org over the primary', async () => {
    const a = await org(); const b = await org()
    const user = await createTestUser(a, 'viewer')
    await db.insert(userOrganizationMemberships).values([
      { userId: user.id, organizationId: a, role: 'admin', isPrimary: true },
      { userId: user.id, organizationId: b, role: 'contributor', isPrimary: false },
    ])
    const active = await resolveActiveMembership(user.id, b)
    expect(active).toEqual({ organizationId: b, role: 'contributor' })
  })

  it('ignores a preferred org the user is no longer an active member of', async () => {
    const a = await org(); const stale = await org()
    const user = await createTestUser(a, 'viewer')
    await db.insert(userOrganizationMemberships).values({
      userId: user.id, organizationId: a, role: 'admin', isPrimary: true,
    })
    // preferred points at an org with no active membership → fall back to primary
    const active = await resolveActiveMembership(user.id, stale)
    expect(active).toEqual({ organizationId: a, role: 'admin' })
  })
})
