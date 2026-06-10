/**
 * Integration tests: direct value-stream ↔ business-capability links (#734).
 *
 * Covers:
 *  - Contributor can link/unlink a stream-level capability on their own org.
 *  - Cross-org enforcement: foreign capability (target) and foreign value
 *    stream (source) are both rejected — the link can never reference another
 *    org's row through the local junction.
 *  - getValueStream surfaces direct (stream-level) links distinctly from
 *    stage-level links, so the UI can tell them apart.
 *  - FK cascade: deleting the value stream or the capability removes the
 *    junction rows.
 *  - Backup export → import round-trips the new junction.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  valueStreams, valueStreamCapabilities, valueStreamStages, valueStreamStageCapabilities,
  capabilities,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { linkValueStreamCapability, unlinkValueStreamCapability } from '@/actions/links'
import { getValueStream, deleteValueStream } from '@/actions/value-streams'
import { buildArchiveExport } from '@/lib/backup-export'
import { importArchive } from '@/lib/backup-import'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  insertCapability, insertValueStream,
  type TestOrg, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

async function directLink(vsId: string, capId: string) {
  return db.query.valueStreamCapabilities.findFirst({
    where: and(
      eq(valueStreamCapabilities.valueStreamId, vsId),
      eq(valueStreamCapabilities.capabilityId, capId),
    ),
  })
}

describe('value stream ↔ capability direct links (#734)', () => {
  let orgA: TestOrg
  let orgB: TestOrg
  let contributorA: TestUser
  let capA: { id: string }
  let capA2: { id: string }
  let vsA: { id: string }
  let capB: { id: string }
  let vsB: { id: string }

  beforeAll(async () => {
    ;[orgA, orgB] = await Promise.all([createTestOrg(), createTestOrg()])
    contributorA = await createTestUser(orgA.id, 'contributor')
    ;[capA, capA2, vsA] = await Promise.all([
      insertCapability(orgA.id), insertCapability(orgA.id), insertValueStream(orgA.id),
    ])
    ;[capB, vsB] = await Promise.all([insertCapability(orgB.id), insertValueStream(orgB.id)])
    mockAuth.mockResolvedValue(makeSession(contributorA))
  })

  afterAll(async () => {
    await cleanupOrg(orgA.id)
    await cleanupOrg(orgB.id)
  })

  it('links a stream-level capability and is idempotent', async () => {
    await linkValueStreamCapability(vsA.id, capA.id)
    expect(await directLink(vsA.id, capA.id)).toBeDefined()

    // onConflictDoNothing → re-linking does not create a duplicate row.
    await linkValueStreamCapability(vsA.id, capA.id)
    const rows = await db.select().from(valueStreamCapabilities)
      .where(and(eq(valueStreamCapabilities.valueStreamId, vsA.id), eq(valueStreamCapabilities.capabilityId, capA.id)))
    expect(rows).toHaveLength(1)
  })

  it('rejects a foreign capability (target ownership)', async () => {
    await expect(linkValueStreamCapability(vsA.id, capB.id)).rejects.toThrow(/Forbidden/)
    expect(await directLink(vsA.id, capB.id)).toBeUndefined()
  })

  it('rejects a foreign value stream (source ownership)', async () => {
    await expect(linkValueStreamCapability(vsB.id, capA.id)).rejects.toThrow(/Forbidden/)
  })

  it('surfaces direct links distinctly from stage-level links', async () => {
    // Scaffold a stage with a stage-level capability (capA2) directly.
    const [stage] = await db.insert(valueStreamStages)
      .values({ valueStreamId: vsA.id, name: 'Stage 1', order: 0 }).returning()
    await db.insert(valueStreamStageCapabilities).values({ stageId: stage.id, capabilityId: capA2.id })

    const vs = await getValueStream(vsA.id)
    expect(vs).not.toBeNull()

    const directIds = vs!.valueStreamCapabilities.map(c => c.capability.id)
    const stageIds = vs!.stages.flatMap(s => s.stageCapabilities.map(sc => sc.capability.id))

    // capA is a whole-stream link; capA2 is a stage link. They are reported
    // through different fields and do not bleed into each other.
    expect(directIds).toContain(capA.id)
    expect(directIds).not.toContain(capA2.id)
    expect(stageIds).toContain(capA2.id)
    expect(stageIds).not.toContain(capA.id)
  })

  it('unlinks a stream-level capability', async () => {
    await unlinkValueStreamCapability(vsA.id, capA.id)
    expect(await directLink(vsA.id, capA.id)).toBeUndefined()
  })

  it('cascades when the capability is deleted', async () => {
    const org = await createTestOrg()
    const cap = await insertCapability(org.id)
    const vs = await insertValueStream(org.id)
    await db.insert(valueStreamCapabilities).values({ valueStreamId: vs.id, capabilityId: cap.id })

    await db.delete(capabilities).where(eq(capabilities.id, cap.id))
    expect(await directLink(vs.id, cap.id)).toBeUndefined()
    await cleanupOrg(org.id)
  })

  it('cascades when the value stream is deleted', async () => {
    const org = await createTestOrg()
    const admin = await createTestUser(org.id, 'admin')
    const cap = await insertCapability(org.id)
    const vs = await insertValueStream(org.id)
    await db.insert(valueStreamCapabilities).values({ valueStreamId: vs.id, capabilityId: cap.id })

    mockAuth.mockResolvedValue(makeSession(admin))
    await deleteValueStream(vs.id)
    mockAuth.mockResolvedValue(makeSession(contributorA))

    expect(await directLink(vs.id, cap.id)).toBeUndefined()
    // The capability itself is untouched by the value-stream delete.
    expect(await db.query.capabilities.findFirst({ where: eq(capabilities.id, cap.id) })).toBeDefined()
    await cleanupOrg(org.id)
  })

  it('round-trips the direct link through backup export → import', async () => {
    const org = await createTestOrg()
    const admin = await createTestUser(org.id, 'admin')
    const cap = await insertCapability(org.id, { status: 'published' })
    const vs = await insertValueStream(org.id, { status: 'published' })
    await db.insert(valueStreamCapabilities).values({ valueStreamId: vs.id, capabilityId: cap.id })

    const archive = await buildArchiveExport(org.id)
    // Import wipes the destination org's content, then restores from the archive.
    await importArchive(org.id, admin.id, archive.body)

    expect(await directLink(vs.id, cap.id)).toBeDefined()
    await cleanupOrg(org.id)
  })
})
