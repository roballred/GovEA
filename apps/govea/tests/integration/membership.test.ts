/**
 * Integration tests: user_organization_memberships (#693 slice 1 / #703)
 *
 * Slice 1 is behavior-neutral — nothing reads memberships yet (auth resolution
 * is slice 2). These tests pin the membership model itself:
 *   - one membership per (user, organization) — the unique guard
 *   - the same user can hold memberships in different orgs (the whole point)
 *   - role is per-membership (not per user row)
 * See docs/design/multi-org-membership.md.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { userOrganizationMemberships } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { createTestOrg, createTestUser, cleanupOrg } from './helpers/db'

describe('user_organization_memberships (#693 slice 1)', () => {
  let orgAId: string
  let orgBId: string
  let userId: string

  beforeAll(async () => {
    const orgA = await createTestOrg()
    const orgB = await createTestOrg()
    orgAId = orgA.id
    orgBId = orgB.id
    const user = await createTestUser(orgAId, 'admin')
    userId = user.id
  })

  afterAll(async () => {
    await cleanupOrg(orgAId)
    await cleanupOrg(orgBId)
  })

  it('accepts one membership per (user, organization)', async () => {
    await db.insert(userOrganizationMemberships).values({
      userId, organizationId: orgAId, role: 'admin', isPrimary: true,
    })
    const rows = await db.select().from(userOrganizationMemberships)
      .where(and(eq(userOrganizationMemberships.userId, userId), eq(userOrganizationMemberships.organizationId, orgAId)))
    expect(rows).toHaveLength(1)
    expect(rows[0].role).toBe('admin')
    expect(rows[0].isPrimary).toBe(true)
    expect(rows[0].isActive).toBe(true) // defaults to active
  })

  it('rejects a duplicate membership for the same (user, organization)', async () => {
    await expect(db.insert(userOrganizationMemberships).values({
      userId, organizationId: orgAId, role: 'viewer',
    })).rejects.toThrow()
  })

  it('allows the same user to be a member of a different org, with a different role', async () => {
    await db.insert(userOrganizationMemberships).values({
      userId, organizationId: orgBId, role: 'viewer', isPrimary: false,
    })
    const rows = await db.select().from(userOrganizationMemberships)
      .where(eq(userOrganizationMemberships.userId, userId))
    expect(rows).toHaveLength(2)
    const byOrg = Object.fromEntries(rows.map(r => [r.organizationId, r.role]))
    expect(byOrg[orgAId]).toBe('admin')   // per-membership role
    expect(byOrg[orgBId]).toBe('viewer')  // different role, same identity
  })
})
