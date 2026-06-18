/**
 * Integration tests: value stream stage entry/exit criteria (#810).
 *
 * Covers:
 *  - addStage persists entry and exit criteria (and trims/normalises empties)
 *  - editStage updates criteria; clearing a field stores null
 *  - getValueStream surfaces criteria on each stage for display
 *  - reordering stages (moveStage) preserves their criteria
 *  - audit logging captures criteria on create and edit (before/after)
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { valueStreamStages, auditLog } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { addStage, editStage, moveStage, getValueStream } from '@/actions/value-streams'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  insertValueStream,
  type TestOrg, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

async function stagesFor(vsId: string) {
  return db.query.valueStreamStages.findMany({
    where: eq(valueStreamStages.valueStreamId, vsId),
    orderBy: (s, { asc }) => [asc(s.order)],
  })
}

describe('value stream stage criteria (#810)', () => {
  let org: TestOrg
  let contributor: TestUser
  let vs: { id: string }

  beforeAll(async () => {
    org = await createTestOrg()
    contributor = await createTestUser(org.id, 'contributor')
    vs = await insertValueStream(org.id)
    mockAuth.mockResolvedValue(makeSession(contributor))
  })

  afterAll(() => cleanupOrg(org.id))

  it('addStage persists entry and exit criteria', async () => {
    await addStage(vs.id, 'Intake', 'Application received', 'Citizen has an account', 'Documents validated')

    const [stage] = await stagesFor(vs.id)
    expect(stage.name).toBe('Intake')
    expect(stage.entryCriteria).toBe('Citizen has an account')
    expect(stage.exitCriteria).toBe('Documents validated')
  })

  it('addStage stores null for blank / whitespace-only criteria', async () => {
    await addStage(vs.id, 'Review', '', '   ', '')

    const review = (await stagesFor(vs.id)).find(s => s.name === 'Review')!
    expect(review.entryCriteria).toBeNull()
    expect(review.exitCriteria).toBeNull()
  })

  it('addStage defaults criteria to null when the args are omitted', async () => {
    await addStage(vs.id, 'Decision', 'Approve or deny')

    const decision = (await stagesFor(vs.id)).find(s => s.name === 'Decision')!
    expect(decision.entryCriteria).toBeNull()
    expect(decision.exitCriteria).toBeNull()
  })

  it('editStage updates criteria and can clear them', async () => {
    const intake = (await stagesFor(vs.id)).find(s => s.name === 'Intake')!

    await editStage(intake.id, 'Intake', 'Application received', 'Citizen authenticated', 'All forms signed')
    let updated = (await stagesFor(vs.id)).find(s => s.id === intake.id)!
    expect(updated.entryCriteria).toBe('Citizen authenticated')
    expect(updated.exitCriteria).toBe('All forms signed')

    // Clearing a criterion stores null, not an empty string.
    await editStage(intake.id, 'Intake', 'Application received', '', 'All forms signed')
    updated = (await stagesFor(vs.id)).find(s => s.id === intake.id)!
    expect(updated.entryCriteria).toBeNull()
    expect(updated.exitCriteria).toBe('All forms signed')
  })

  it('getValueStream surfaces criteria on each stage', async () => {
    const loaded = await getValueStream(vs.id)
    expect(loaded).not.toBeNull()
    const intake = loaded!.stages.find(s => s.name === 'Intake')!
    expect(intake.exitCriteria).toBe('All forms signed')
  })

  it('reordering stages preserves their criteria', async () => {
    const before = await stagesFor(vs.id)
    const intake = before.find(s => s.name === 'Intake')!
    const review = before.find(s => s.name === 'Review')!

    // Give Review distinctive criteria so we can assert it survives the move.
    await editStage(review.id, 'Review', '', 'Intake complete', 'Reviewer signed off')

    // Move Intake down past Review and confirm both keep their own criteria.
    await moveStage(intake.id, 'down')

    const after = await stagesFor(vs.id)
    const intakeAfter = after.find(s => s.id === intake.id)!
    const reviewAfter = after.find(s => s.id === review.id)!

    expect(intakeAfter.exitCriteria).toBe('All forms signed')
    expect(reviewAfter.entryCriteria).toBe('Intake complete')
    expect(reviewAfter.exitCriteria).toBe('Reviewer signed off')
    // Order actually changed: Review now precedes Intake.
    expect(reviewAfter.order).toBeLessThan(intakeAfter.order)
  })

  it('audit log captures criteria on stage create', async () => {
    await addStage(vs.id, 'Audited Create', '', 'Entry X', 'Exit Y')
    const created = (await stagesFor(vs.id)).find(s => s.name === 'Audited Create')!

    const [entry] = await db.select().from(auditLog).where(
      and(eq(auditLog.action, 'value_stream.stage.create'), eq(auditLog.entityId, created.id)),
    )
    expect(entry).toBeDefined()
    expect(entry.entityType).toBe('value_stream_stage')
    expect(entry.after).toMatchObject({ name: 'Audited Create', entryCriteria: 'Entry X', exitCriteria: 'Exit Y' })
  })

  it('audit log captures before/after criteria on stage edit', async () => {
    const target = (await stagesFor(vs.id)).find(s => s.name === 'Audited Create')!

    await editStage(target.id, 'Audited Create', '', 'Entry Z', 'Exit Y')

    const entries = await db.select().from(auditLog).where(
      and(eq(auditLog.action, 'value_stream.stage.edit'), eq(auditLog.entityId, target.id)),
    )
    expect(entries.length).toBeGreaterThan(0)
    const latest = entries[entries.length - 1]
    expect(latest.before).toMatchObject({ entryCriteria: 'Entry X' })
    expect(latest.after).toMatchObject({ entryCriteria: 'Entry Z', exitCriteria: 'Exit Y' })
  })
})
