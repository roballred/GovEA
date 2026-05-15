import { eq } from 'drizzle-orm'
import { db } from '../client'
import { organizations } from '../schema'

/**
 * Slugs of orgs that used to be in the dev fixtures but have since been
 * removed. The seeder upserts but never deletes, so without an explicit
 * cleanup step the orphaned org rows + all their children stay behind on
 * any DB seeded before the fixture removal landed.
 *
 * Add a slug here when retiring a fixture org. All child tables cascade.
 */
export const RETIRED_ORG_SLUGS = ['city-of-lakeside'] as const

/**
 * Deletes any org row whose slug is in `slugs`. Child rows cascade via the
 * `onDelete: 'cascade'` FK on every table that points at `organizations`,
 * so a single delete per slug is sufficient. Idempotent — a missing slug
 * is a no-op.
 *
 * Returns the slugs that were actually present and removed.
 */
export async function removeRetiredOrgs(slugs: readonly string[]): Promise<string[]> {
  const removed: string[] = []
  for (const slug of slugs) {
    const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) })
    if (org) {
      await db.delete(organizations).where(eq(organizations.id, org.id))
      removed.push(slug)
    }
  }
  return removed
}
