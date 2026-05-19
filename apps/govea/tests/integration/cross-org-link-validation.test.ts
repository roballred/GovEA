/**
 * Integration tests: cross-org link request-time validation (#536)
 *
 * requestCrossOrgLink must reject a request whose source content has
 * visibility='org', because the source would become invisible to the
 * target after approval and the approved link would silently disappear
 * from the target's view. Source must be published at 'connections' or
 * 'instance' visibility before federating.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { requestCrossOrgLink } from '@/actions/cross-org-links'
import { db } from '@/db/client'
import { crossOrgLinks } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, insertCapability,
  type TestOrg, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('cross-org link request-time visibility validation (#536)', () => {
  let orgA: TestOrg, orgB: TestOrg
  let adminA: TestUser
  let orgPrivateSourceId: string
  let connectionsSourceId: string
  let instanceTargetId: string

  beforeAll(async () => {
    ;[orgA, orgB] = await Promise.all([createTestOrg(), createTestOrg()])
    adminA = await createTestUser(orgA.id, 'admin')

    const [orgPrivate, connectionsSrc, instanceTgt] = await Promise.all([
      insertCapability(orgA.id, { name: 'Org-Private Source', visibility: 'org' }),
      insertCapability(orgA.id, { name: 'Connections Source', visibility: 'connections' }),
      insertCapability(orgB.id, { name: 'Instance Target', visibility: 'instance' }),
    ])
    orgPrivateSourceId = orgPrivate.id
    connectionsSourceId = connectionsSrc.id
    instanceTargetId = instanceTgt.id
  })

  afterAll(() =>
    Promise.all([cleanupOrg(orgA.id), cleanupOrg(orgB.id)]),
  )

  it('rejects a cross-org link request when source visibility is "org"', async () => {
    mockAuth.mockResolvedValue(makeSession(adminA))

    await expect(
      requestCrossOrgLink('capability', orgPrivateSourceId, instanceTargetId, 'implements'),
    ).rejects.toThrow(/connections or instance visibility/)

    // No row was inserted
    const rows = await db.query.crossOrgLinks.findMany({
      where: and(
        eq(crossOrgLinks.sourceEntityId, orgPrivateSourceId),
        eq(crossOrgLinks.targetEntityId, instanceTargetId),
      ),
    })
    expect(rows).toHaveLength(0)
  })

  it('allows a cross-org link request when source visibility is "connections"', async () => {
    mockAuth.mockResolvedValue(makeSession(adminA))

    await expect(
      requestCrossOrgLink('capability', connectionsSourceId, instanceTargetId, 'implements'),
    ).resolves.not.toThrow()

    const rows = await db.query.crossOrgLinks.findMany({
      where: and(
        eq(crossOrgLinks.sourceEntityId, connectionsSourceId),
        eq(crossOrgLinks.targetEntityId, instanceTargetId),
      ),
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
  })
})
