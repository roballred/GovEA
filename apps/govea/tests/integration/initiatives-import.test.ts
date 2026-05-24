/**
 * Integration tests: importInitiatives server action (#629)
 *
 * Covers:
 *  - Role enforcement (viewer rejected)
 *  - Basic create with all fixed columns
 *  - Case-insensitive upsert by name
 *  - Junction resolution (capabilities + objectives); unknown names → warnings
 *  - Junction replacement on upsert
 *  - Status / visibility validation
 *  - dryRun does not write rows
 *  - Multi-line description round-trip via shared @/lib/csv parser
 *  - Round-trip property: re-importing an existing row reports updated=1
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  initiatives, initiativeCapabilities, initiativeObjectives,
  capabilities, strategicObjectives,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { importInitiatives } from '@/actions/initiatives'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function csvForm(content: string): FormData {
  const fd = new FormData()
  const blob = new Blob([content], { type: 'text/csv' })
  fd.append('csvFile', new File([blob], 'initiatives.csv', { type: 'text/csv' }))
  return fd
}

async function seedCapability(orgId: string, name: string) {
  const [row] = await db.insert(capabilities).values({
    id: randomUUID(), organizationId: orgId, name,
  }).returning()
  return row.id
}

async function seedObjective(orgId: string, name: string) {
  const [row] = await db.insert(strategicObjectives).values({
    id: randomUUID(), organizationId: orgId, name,
  }).returning()
  return row.id
}

describe('importInitiatives (#629)', () => {
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
    await expect(importInitiatives(csvForm('name\nTest\n'))).rejects.toThrow('Forbidden')
  })

  it('creates new initiatives from CSV (contributor)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,status,start_date,end_date,visibility,capabilities,objectives',
      'Auth Modernization,Move all apps to OIDC,active,Q1 FY2026,Q4 FY2026,org,,',
      'Permitting Refresh,Replace legacy permit system,proposed,Q3 FY2026,,org,,',
    ].join('\n')

    const result = await importInitiatives(csvForm(csv), false)
    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toEqual([])

    const rows = await db.select().from(initiatives).where(eq(initiatives.organizationId, orgId))
    expect(rows.some(r => r.name === 'Auth Modernization' && r.status === 'active')).toBe(true)
    expect(rows.some(r => r.name === 'Permitting Refresh' && r.startDate === 'Q3 FY2026')).toBe(true)
  })

  it('upserts existing initiatives by name (case-insensitive)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,status,start_date,end_date,visibility,capabilities,objectives',
      'auth modernization,Updated description,active,Q1 FY2026,Q4 FY2026,org,,',
    ].join('\n')

    const result = await importInitiatives(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.updated).toBe(1)

    const row = await db.query.initiatives.findFirst({
      where: and(eq(initiatives.organizationId, orgId), eq(initiatives.name, 'Auth Modernization')),
    })
    expect(row?.description).toBe('Updated description')
  })

  it('resolves capability + objective names; unknown names become warnings', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const capId = await seedCapability(orgId, 'Identity')
    const objId = await seedObjective(orgId, 'Improve Security Posture')

    const csv = [
      'name,description,status,start_date,end_date,visibility,capabilities,objectives',
      'Wire OIDC,Reduce password sprawl,active,Q2 FY2026,,org,Identity; Unknown Cap,Improve Security Posture; Unknown Obj',
    ].join('\n')

    const result = await importInitiatives(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.errors.some(e => e.includes('Unknown Cap'))).toBe(true)
    expect(result.errors.some(e => e.includes('Unknown Obj'))).toBe(true)

    const init = await db.query.initiatives.findFirst({
      where: and(eq(initiatives.organizationId, orgId), eq(initiatives.name, 'Wire OIDC')),
    })
    expect(init).toBeDefined()
    const [caps, objs] = await Promise.all([
      db.select().from(initiativeCapabilities).where(eq(initiativeCapabilities.initiativeId, init!.id)),
      db.select().from(initiativeObjectives).where(eq(initiativeObjectives.initiativeId, init!.id)),
    ])
    expect(caps.map(c => c.capabilityId)).toEqual([capId])
    expect(objs.map(o => o.objectiveId)).toEqual([objId])
  })

  it('replaces both junctions on upsert', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const init = await db.query.initiatives.findFirst({
      where: and(eq(initiatives.organizationId, orgId), eq(initiatives.name, 'Wire OIDC')),
    })
    expect(init).toBeDefined()
    const csv = [
      'name,description,status,start_date,end_date,visibility,capabilities,objectives',
      'Wire OIDC,Reduce password sprawl,active,Q2 FY2026,,org,,',
    ].join('\n')
    await importInitiatives(csvForm(csv), false)
    const [caps, objs] = await Promise.all([
      db.select().from(initiativeCapabilities).where(eq(initiativeCapabilities.initiativeId, init!.id)),
      db.select().from(initiativeObjectives).where(eq(initiativeObjectives.initiativeId, init!.id)),
    ])
    expect(caps).toHaveLength(0)
    expect(objs).toHaveLength(0)
  })

  it('skips rows with invalid status / visibility', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,status,start_date,end_date,visibility,capabilities,objectives',
      'Bad Status,desc,not-a-status,,,org,,',
      'Bad Vis,desc,proposed,,,not-a-visibility,,',
    ].join('\n')

    const result = await importInitiatives(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.skipped).toBe(2)
    expect(result.errors.some(e => e.includes('invalid status'))).toBe(true)
    expect(result.errors.some(e => e.includes('invalid visibility'))).toBe(true)
  })

  it('dryRun does not write rows', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const csv = [
      'name,description,status,start_date,end_date,visibility,capabilities,objectives',
      'Dry Run Init,never created,proposed,,,org,,',
    ].join('\n')

    const before = await db.select().from(initiatives).where(eq(initiatives.organizationId, orgId))
    const result = await importInitiatives(csvForm(csv), true)
    expect(result.created).toBe(1)
    const after = await db.select().from(initiatives).where(eq(initiatives.organizationId, orgId))
    expect(after).toHaveLength(before.length)
    expect(after.some(r => r.name === 'Dry Run Init')).toBe(false)
  })

  it('handles multi-line description through quote-aware parser', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv =
      'name,description,status,start_date,end_date,visibility,capabilities,objectives\n' +
      'MultiLine Init,"Phase 1: scope\nPhase 2: pilot\nPhase 3: rollout",active,Q1 FY2026,Q4 FY2026,org,,\n'

    const result = await importInitiatives(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)

    const row = await db.query.initiatives.findFirst({
      where: and(eq(initiatives.organizationId, orgId), eq(initiatives.name, 'MultiLine Init')),
    })
    expect(row?.description).toBe('Phase 1: scope\nPhase 2: pilot\nPhase 3: rollout')
  })

  it('round-trip: re-importing an existing row reports updated=1 with no field changes', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,status,start_date,end_date,visibility,capabilities,objectives',
      'Permitting Refresh,Replace legacy permit system,proposed,Q3 FY2026,,org,,',
    ].join('\n')
    const result = await importInitiatives(csvForm(csv), false)
    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)

    const row = await db.query.initiatives.findFirst({
      where: and(eq(initiatives.organizationId, orgId), eq(initiatives.name, 'Permitting Refresh')),
    })
    expect(row).toMatchObject({
      description: 'Replace legacy permit system',
      status: 'proposed',
      startDate: 'Q3 FY2026',
    })
  })

  it('reports CSV with no data rows', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const result = await importInitiatives(csvForm('name,description\n'), false)
    expect(result.errors).toContain('CSV has no data rows')
  })

  it('reports missing file', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    const result = await importInitiatives(fd, false)
    expect(result.errors).toContain('No file provided')
  })
})
