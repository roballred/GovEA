/**
 * Integration tests: seed retired-org cleanup (#492)
 *
 * Guards against silent regressions in the seeder's "delete retired fixture
 * orgs" path. Without this step, removing an org from `dev-fixtures.ts`
 * leaves orphaned rows in every dev DB seeded before the removal — exactly
 * the situation that produced #492 (City of Lakeside lingering after #488).
 *
 * Capability: ac-admin-dashboard
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { organizations, users, capabilities } from '@/db/schema'
import { removeRetiredOrgs, RETIRED_ORG_SLUGS } from '@/db/seeds/cleanup'

// Use a unique slug per test run so a parallel suite or a stale row from a
// previous failed test doesn't bleed in. Track the slugs we create so we
// can scrub them in afterAll even if assertions fail.
const createdSlugs: string[] = []

function makeSlug(label: string) {
  const slug = `retired-test-${label}-${randomUUID().slice(0, 8)}`
  createdSlugs.push(slug)
  return slug
}

afterAll(async () => {
  if (createdSlugs.length > 0) {
    await db.delete(organizations).where(inArray(organizations.slug, createdSlugs))
  }
})

beforeEach(async () => {
  // Defensive: clear any rows our previous tests created in case afterAll
  // didn't run (e.g. on a watch-mode rerun mid-test).
  if (createdSlugs.length > 0) {
    await db.delete(organizations).where(inArray(organizations.slug, createdSlugs))
  }
})

describe('RETIRED_ORG_SLUGS', () => {
  it('includes city-of-lakeside (the slug that motivated #492)', () => {
    expect(RETIRED_ORG_SLUGS).toContain('city-of-lakeside')
  })
})

describe('removeRetiredOrgs', () => {
  it('deletes a matching org and cascades to its child rows', async () => {
    const slug = makeSlug('cascade')
    const [org] = await db.insert(organizations).values({
      name: 'Retired Test Org',
      slug,
      theme: 'govea',
      enabledModules: {},
    }).returning()

    // Cascade test: a user row + a capability row that point at the org.
    // The schema's onDelete: 'cascade' is what makes a single org delete
    // sufficient — codify that here so a future FK change doesn't silently
    // turn this seed step into a partial cleanup.
    await db.insert(users).values({
      organizationId: org.id,
      email: `${slug}@test.example`,
      name: 'Retired User',
      role: 'viewer',
      isActive: 'true',
    })
    await db.insert(capabilities).values({
      organizationId: org.id,
      name: 'Retired Capability',
    })

    const removed = await removeRetiredOrgs([slug])
    expect(removed).toEqual([slug])

    const orgAfter = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) })
    expect(orgAfter).toBeUndefined()

    const usersAfter = await db.query.users.findMany({ where: eq(users.organizationId, org.id) })
    expect(usersAfter).toHaveLength(0)

    const capsAfter = await db.query.capabilities.findMany({ where: eq(capabilities.organizationId, org.id) })
    expect(capsAfter).toHaveLength(0)
  })

  it('is a no-op when the slug is not present', async () => {
    const removed = await removeRetiredOrgs([makeSlug('absent')])
    expect(removed).toEqual([])
  })

  it('is idempotent — second call removes nothing', async () => {
    const slug = makeSlug('idempotent')
    await db.insert(organizations).values({
      name: 'Retired Idempotent',
      slug,
      theme: 'govea',
      enabledModules: {},
    })

    const first = await removeRetiredOrgs([slug])
    const second = await removeRetiredOrgs([slug])
    expect(first).toEqual([slug])
    expect(second).toEqual([])
  })
})
