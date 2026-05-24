/**
 * Integration tests: importObjectives server action (#629)
 *
 * Same coverage shape as initiatives-import.test.ts. Objective-specific
 * fields exercised: success_metric, time_horizon. Junctions: capabilities,
 * value_streams.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  strategicObjectives, objectiveCapabilities, objectiveValueStreams,
  capabilities, valueStreams,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { importObjectives } from '@/actions/objectives'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function csvForm(content: string): FormData {
  const fd = new FormData()
  const blob = new Blob([content], { type: 'text/csv' })
  fd.append('csvFile', new File([blob], 'objectives.csv', { type: 'text/csv' }))
  return fd
}

async function seedCapability(orgId: string, name: string) {
  const [row] = await db.insert(capabilities).values({
    id: randomUUID(), organizationId: orgId, name,
  }).returning()
  return row.id
}

async function seedValueStream(orgId: string, name: string) {
  const [row] = await db.insert(valueStreams).values({
    id: randomUUID(), organizationId: orgId, name,
  }).returning()
  return row.id
}

describe('importObjectives (#629)', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  it('rejects viewer role', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(importObjectives(csvForm('name\nTest\n'))).rejects.toThrow('Forbidden')
  })

  it('creates new objectives from CSV (contributor)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,success_metric,time_horizon,status,visibility,capabilities,value_streams',
      'Improve Security Posture,Reduce attack surface,Critical CVEs at zero,FY2026,published,org,,',
      'Customer Self-Service,Shift volume from call centre,30% of permits online,3-year,draft,org,,',
    ].join('\n')

    const result = await importObjectives(csvForm(csv), false)
    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toEqual([])

    const rows = await db.select().from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId))
    expect(rows.some(r => r.name === 'Improve Security Posture' && r.successMetric === 'Critical CVEs at zero')).toBe(true)
    expect(rows.some(r => r.name === 'Customer Self-Service' && r.timeHorizon === '3-year')).toBe(true)
  })

  it('upserts existing objectives by name (case-insensitive)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,success_metric,time_horizon,status,visibility,capabilities,value_streams',
      'improve security posture,Updated desc,Critical CVEs at zero,FY2026,published,org,,',
    ].join('\n')
    const result = await importObjectives(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.updated).toBe(1)

    const row = await db.query.strategicObjectives.findFirst({
      where: and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.name, 'Improve Security Posture')),
    })
    expect(row?.description).toBe('Updated desc')
  })

  it('resolves capability + value_stream names; unknown names become warnings', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const capId = await seedCapability(orgId, 'Identity')
    const vsId = await seedValueStream(orgId, 'Permit Issuance')

    const csv = [
      'name,description,success_metric,time_horizon,status,visibility,capabilities,value_streams',
      'Secure Permits,Tighten the permit chain,100% audit pass,FY2026,published,org,Identity; Unknown Cap,Permit Issuance; Unknown VS',
    ].join('\n')
    const result = await importObjectives(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.errors.some(e => e.includes('Unknown Cap'))).toBe(true)
    expect(result.errors.some(e => e.includes('Unknown VS'))).toBe(true)

    const obj = await db.query.strategicObjectives.findFirst({
      where: and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.name, 'Secure Permits')),
    })
    expect(obj).toBeDefined()
    const [caps, vs] = await Promise.all([
      db.select().from(objectiveCapabilities).where(eq(objectiveCapabilities.objectiveId, obj!.id)),
      db.select().from(objectiveValueStreams).where(eq(objectiveValueStreams.objectiveId, obj!.id)),
    ])
    expect(caps.map(c => c.capabilityId)).toEqual([capId])
    expect(vs.map(v => v.valueStreamId)).toEqual([vsId])
  })

  it('replaces both junctions on upsert', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const obj = await db.query.strategicObjectives.findFirst({
      where: and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.name, 'Secure Permits')),
    })
    expect(obj).toBeDefined()
    const csv = [
      'name,description,success_metric,time_horizon,status,visibility,capabilities,value_streams',
      'Secure Permits,Tighten the permit chain,100% audit pass,FY2026,published,org,,',
    ].join('\n')
    await importObjectives(csvForm(csv), false)
    const [caps, vs] = await Promise.all([
      db.select().from(objectiveCapabilities).where(eq(objectiveCapabilities.objectiveId, obj!.id)),
      db.select().from(objectiveValueStreams).where(eq(objectiveValueStreams.objectiveId, obj!.id)),
    ])
    expect(caps).toHaveLength(0)
    expect(vs).toHaveLength(0)
  })

  it('skips rows with invalid status / visibility', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,success_metric,time_horizon,status,visibility,capabilities,value_streams',
      'Bad Status,desc,,,not-a-status,org,,',
      'Bad Vis,desc,,,draft,not-a-visibility,,',
    ].join('\n')
    const result = await importObjectives(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.skipped).toBe(2)
    expect(result.errors.some(e => e.includes('invalid status'))).toBe(true)
    expect(result.errors.some(e => e.includes('invalid visibility'))).toBe(true)
  })

  it('dryRun does not write rows', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const csv = [
      'name,description,success_metric,time_horizon,status,visibility,capabilities,value_streams',
      'Dry Run Obj,never created,,,,org,,',
    ].join('\n')
    const before = await db.select().from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId))
    const result = await importObjectives(csvForm(csv), true)
    expect(result.created).toBe(1)
    const after = await db.select().from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId))
    expect(after).toHaveLength(before.length)
    expect(after.some(r => r.name === 'Dry Run Obj')).toBe(false)
  })

  it('handles multi-line description through quote-aware parser', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv =
      'name,description,success_metric,time_horizon,status,visibility,capabilities,value_streams\n' +
      'MultiLine Obj,"Reduce risk.\nIncrease trust.\nLower TCO.",,,draft,org,,\n'
    const result = await importObjectives(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)

    const row = await db.query.strategicObjectives.findFirst({
      where: and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.name, 'MultiLine Obj')),
    })
    expect(row?.description).toBe('Reduce risk.\nIncrease trust.\nLower TCO.')
  })

  it('round-trip: re-importing an existing row reports updated=1 with no field changes', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,success_metric,time_horizon,status,visibility,capabilities,value_streams',
      'Customer Self-Service,Shift volume from call centre,30% of permits online,3-year,draft,org,,',
    ].join('\n')
    const result = await importObjectives(csvForm(csv), false)
    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)

    const row = await db.query.strategicObjectives.findFirst({
      where: and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.name, 'Customer Self-Service')),
    })
    expect(row).toMatchObject({
      description: 'Shift volume from call centre',
      successMetric: '30% of permits online',
      timeHorizon: '3-year',
      status: 'draft',
    })
  })

  it('reports CSV with no data rows', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const result = await importObjectives(csvForm('name,description\n'), false)
    expect(result.errors).toContain('CSV has no data rows')
  })

  it('reports missing file', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    const result = await importObjectives(fd, false)
    expect(result.errors).toContain('No file provided')
  })
})
