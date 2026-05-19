/**
 * Regression test for #558: `/objectives/[id]` detail page crashed because
 * Drizzle's auto-generated SQL aliases for the deeply-nested chain
 *   strategicObjectives → objectiveCapabilities → capability
 *                       → applicationCapabilities → application
 * exceeded Postgres's 63-character NAMEDATALEN limit. Postgres silently
 * truncated the aliases, then failed to resolve the truncated names in the
 * generated LATERAL subqueries.
 *
 * The fix in `actions/objectives.ts:getObjective` splits the deep `with`
 * chain into two flatter queries (the objective + its direct relations,
 * then a separate query for the applicationCapabilities per capability),
 * grafting the second result onto the first to preserve the consumer-facing
 * shape.
 *
 * This test exercises the exact shape that broke before the fix: an
 * objective linked to a capability that is linked to an application. If
 * the long-alias regression returns, this test fails on a real Postgres
 * instance — the symptom is a thrown PostgresError, not a wrong-shape
 * return.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { db } from '@/db/client'
import { objectiveCapabilities, applicationCapabilities } from '@/db/schema'
import { getObjective } from '@/actions/objectives'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, insertCapability, insertApplication, insertObjective,
  type TestOrg, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('getObjective deep relation chain (#558)', () => {
  let org: TestOrg
  let admin: TestUser
  let objectiveId: string
  let capabilityId: string
  let applicationId: string

  beforeAll(async () => {
    org = await createTestOrg()
    admin = await createTestUser(org.id, 'admin')

    const objective = await insertObjective(org.id, { status: 'published' })
    const capability = await insertCapability(org.id, { status: 'published' })
    const application = await insertApplication(org.id, { status: 'published' })
    objectiveId = objective.id
    capabilityId = capability.id
    applicationId = application.id

    await db.insert(objectiveCapabilities).values({ objectiveId, capabilityId })
    await db.insert(applicationCapabilities).values({ applicationId, capabilityId })
  })

  afterAll(async () => {
    await cleanupOrg(org.id)
  })

  it('does not throw when fetching an objective with a capability that has an application', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))

    // The bug manifested as a PostgresError thrown by the underlying
    // Drizzle query. If this call resolves at all (even to null), the
    // alias-length regression has not returned.
    const objective = await getObjective(objectiveId)
    expect(objective).not.toBeNull()
  })

  it('returns the deep relation chain in the shape the detail page consumes', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))

    const objective = await getObjective(objectiveId)
    expect(objective).not.toBeNull()
    expect(objective!.id).toBe(objectiveId)

    // The detail page does:
    //   objective.objectiveCapabilities.flatMap(({ capability }) =>
    //     capability.applicationCapabilities.map(({ application }) => ...)
    //   )
    // If any layer of that chain is missing, the page throws at runtime.
    expect(objective!.objectiveCapabilities).toHaveLength(1)
    const oc = objective!.objectiveCapabilities[0]
    expect(oc.capability.id).toBe(capabilityId)
    expect(oc.capability.applicationCapabilities).toHaveLength(1)
    expect(oc.capability.applicationCapabilities[0].application.id).toBe(applicationId)
  })

  it('returns an empty applicationCapabilities array when a linked capability has no applications', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))

    // Add a second capability with no application link.
    const orphanCap = await insertCapability(org.id, { name: 'Orphan capability', status: 'published' })
    await db.insert(objectiveCapabilities).values({ objectiveId, capabilityId: orphanCap.id })

    const objective = await getObjective(objectiveId)
    expect(objective).not.toBeNull()
    const orphan = objective!.objectiveCapabilities.find(oc => oc.capability.id === orphanCap.id)
    expect(orphan).toBeDefined()
    expect(orphan!.capability.applicationCapabilities).toEqual([])
  })
})
