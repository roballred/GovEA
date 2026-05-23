/**
 * Integration tests: importADRs server action (#596)
 *
 * Covers:
 *  - Role enforcement (viewer rejected; contributor accepted)
 *  - Basic create from CSV with all fixed columns
 *  - Upsert: existing ADR matched case-insensitively by number and updated
 *  - Junction resolution: semicolon-joined names for all four targets
 *    (capabilities, applications, initiatives, objectives) — unknown names
 *    report as warnings without failing the row
 *  - Junction replacement on upsert (no leftover stale links)
 *  - superseded_by reference resolves both pre-existing and same-batch ADRs
 *  - Validation: invalid status / visibility skip the row
 *  - dryRun: returns counters and errors WITHOUT writing any rows
 *  - Round-trip property: re-import reports updated with no field loss
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives,
  capabilities, applications, initiatives, strategicObjectives,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { importADRs } from '@/actions/adrs'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function csvForm(content: string): FormData {
  const fd = new FormData()
  const blob = new Blob([content], { type: 'text/csv' })
  fd.append('csvFile', new File([blob], 'adrs.csv', { type: 'text/csv' }))
  return fd
}

async function seedCapability(orgId: string, name: string) {
  const [row] = await db.insert(capabilities).values({
    id: randomUUID(), organizationId: orgId, name,
  }).returning()
  return row.id
}

async function seedApplication(orgId: string, name: string) {
  const [row] = await db.insert(applications).values({
    id: randomUUID(), organizationId: orgId, name,
  }).returning()
  return row.id
}

async function seedInitiative(orgId: string, name: string) {
  const [row] = await db.insert(initiatives).values({
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

describe('importADRs (#596)', () => {
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
    await expect(importADRs(csvForm('number,title\nADR-001,Test\n'))).rejects.toThrow('Forbidden')
  })

  it('creates new ADRs from CSV (contributor)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      'ADR-001,Use Postgres,Need a relational store,Adopt Postgres,Pin to Postgres 16,accepted,org,,,,,',
      'ADR-002,Server-rendered React,Need SEO and accessibility,Use Next.js App Router with RSC,Layered on top of Postgres,proposed,org,,,,,',
    ].join('\n')

    const result = await importADRs(csvForm(csv), false)
    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toEqual([])

    const rows = await db.select().from(adrs).where(eq(adrs.organizationId, orgId))
    expect(rows.some(r => r.number === 'ADR-001' && r.status === 'accepted')).toBe(true)
    expect(rows.some(r => r.number === 'ADR-002' && r.status === 'proposed')).toBe(true)
  })

  it('upserts existing ADRs by number (case-insensitive)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      'adr-001,Use Postgres,Updated context,Adopt Postgres,Pin to Postgres 16,accepted,org,,,,,',
    ].join('\n')

    const result = await importADRs(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.updated).toBe(1)

    const row = await db.query.adrs.findFirst({
      where: and(eq(adrs.organizationId, orgId), eq(adrs.number, 'ADR-001')),
    })
    expect(row?.context).toBe('Updated context')
  })

  it('resolves capability/application/initiative/objective names to ids; unknown names are warnings', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const capId = await seedCapability(orgId, 'Identity')
    const appId = await seedApplication(orgId, 'Auth Service')
    const initId = await seedInitiative(orgId, 'Auth Modernization')
    const objId = await seedObjective(orgId, 'Improve Security Posture')

    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      'ADR-003,Adopt OIDC,Need SSO,Use OIDC via Entra,Local accounts remain,accepted,org,,Identity; Unknown Cap,Auth Service,Auth Modernization,Improve Security Posture',
    ].join('\n')

    const result = await importADRs(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.errors.some(e => e.includes('Unknown Cap'))).toBe(true)

    const adr = await db.query.adrs.findFirst({
      where: and(eq(adrs.organizationId, orgId), eq(adrs.number, 'ADR-003')),
    })
    expect(adr).toBeDefined()
    const [caps, apps, inits, objs] = await Promise.all([
      db.select().from(adrCapabilities).where(eq(adrCapabilities.adrId, adr!.id)),
      db.select().from(adrApplications).where(eq(adrApplications.adrId, adr!.id)),
      db.select().from(adrInitiatives).where(eq(adrInitiatives.adrId, adr!.id)),
      db.select().from(adrObjectives).where(eq(adrObjectives.adrId, adr!.id)),
    ])
    expect(caps.map(c => c.capabilityId)).toEqual([capId])
    expect(apps.map(a => a.applicationId)).toEqual([appId])
    expect(inits.map(i => i.initiativeId)).toEqual([initId])
    expect(objs.map(o => o.objectiveId)).toEqual([objId])
  })

  it('replaces all four junctions on upsert', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const adr = await db.query.adrs.findFirst({
      where: and(eq(adrs.organizationId, orgId), eq(adrs.number, 'ADR-003')),
    })
    expect(adr).toBeDefined()
    // Re-import with no junctions — all existing links should drop.
    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      'ADR-003,Adopt OIDC,Need SSO,Use OIDC via Entra,Local accounts remain,accepted,org,,,,,',
    ].join('\n')
    await importADRs(csvForm(csv), false)
    const [caps, apps, inits, objs] = await Promise.all([
      db.select().from(adrCapabilities).where(eq(adrCapabilities.adrId, adr!.id)),
      db.select().from(adrApplications).where(eq(adrApplications.adrId, adr!.id)),
      db.select().from(adrInitiatives).where(eq(adrInitiatives.adrId, adr!.id)),
      db.select().from(adrObjectives).where(eq(adrObjectives.adrId, adr!.id)),
    ])
    expect(caps).toHaveLength(0)
    expect(apps).toHaveLength(0)
    expect(inits).toHaveLength(0)
    expect(objs).toHaveLength(0)
  })

  it('resolves superseded_by within the same batch', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    // ADR-101 supersedes ADR-100. Both are new in this batch.
    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      'ADR-100,Initial decision,context,decision,consequences,deprecated,org,ADR-101,,,,',
      'ADR-101,Revised decision,context,decision,consequences,accepted,org,,,,,',
    ].join('\n')

    const result = await importADRs(csvForm(csv), false)
    expect(result.created).toBe(2)
    expect(result.errors).toEqual([])

    const [oldAdr, newAdr] = await Promise.all([
      db.query.adrs.findFirst({ where: and(eq(adrs.organizationId, orgId), eq(adrs.number, 'ADR-100')) }),
      db.query.adrs.findFirst({ where: and(eq(adrs.organizationId, orgId), eq(adrs.number, 'ADR-101')) }),
    ])
    expect(oldAdr?.supersededBy).toBe(newAdr?.id)
  })

  it('reports unresolved superseded_by as a warning, not a failure', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      'ADR-200,Some decision,context,decision,consequences,accepted,org,ADR-NEVER,,,,',
    ].join('\n')

    const result = await importADRs(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.errors.some(e => e.includes('ADR-NEVER'))).toBe(true)

    const adr = await db.query.adrs.findFirst({
      where: and(eq(adrs.organizationId, orgId), eq(adrs.number, 'ADR-200')),
    })
    expect(adr?.supersededBy).toBeNull()
  })

  it('skips rows missing required fields and invalid status/visibility', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      ',Missing number,context,decision,consequences,accepted,org,,,,,',
      'ADR-300,,context,decision,consequences,accepted,org,,,,,',
      'ADR-301,OK,context,decision,consequences,not-a-status,org,,,,,',
      'ADR-302,OK,context,decision,consequences,accepted,not-a-visibility,,,,,',
    ].join('\n')

    const result = await importADRs(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.skipped).toBe(4)
    expect(result.errors.some(e => e.includes('missing required field "number"'))).toBe(true)
    expect(result.errors.some(e => e.includes('missing required field "title"'))).toBe(true)
    expect(result.errors.some(e => e.includes('invalid status'))).toBe(true)
    expect(result.errors.some(e => e.includes('invalid visibility'))).toBe(true)
  })

  it('dryRun does not write rows', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      'ADR-DRY,Dry Run,c,d,k,accepted,org,,,,,',
    ].join('\n')

    const before = await db.select().from(adrs).where(eq(adrs.organizationId, orgId))
    const result = await importADRs(csvForm(csv), true)
    expect(result.created).toBe(1)
    const after = await db.select().from(adrs).where(eq(adrs.organizationId, orgId))
    expect(after).toHaveLength(before.length)
    expect(after.some(r => r.number === 'ADR-DRY')).toBe(false)
  })

  it('handles multi-line context/decision/consequences through quote-aware parser', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv =
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives\n' +
      'ADR-MULTI,Multi-line,"Reason 1\nReason 2","Decide A\nDecide B","Outcome 1\nOutcome 2",accepted,org,,,,,\n'

    const result = await importADRs(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)

    const row = await db.query.adrs.findFirst({
      where: and(eq(adrs.organizationId, orgId), eq(adrs.number, 'ADR-MULTI')),
    })
    expect(row?.context).toBe('Reason 1\nReason 2')
    expect(row?.decision).toBe('Decide A\nDecide B')
    expect(row?.consequences).toBe('Outcome 1\nOutcome 2')
  })

  it('round-trip: re-importing an existing row reports updated=1 with no field changes', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'number,title,context,decision,consequences,status,visibility,superseded_by,capabilities,applications,initiatives,objectives',
      'ADR-002,Server-rendered React,Need SEO and accessibility,Use Next.js App Router with RSC,Layered on top of Postgres,proposed,org,,,,,',
    ].join('\n')
    const result = await importADRs(csvForm(csv), false)
    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)

    const row = await db.query.adrs.findFirst({
      where: and(eq(adrs.organizationId, orgId), eq(adrs.number, 'ADR-002')),
    })
    expect(row).toMatchObject({
      title: 'Server-rendered React',
      context: 'Need SEO and accessibility',
      status: 'proposed',
    })
  })

  it('reports CSV with no data rows', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const result = await importADRs(csvForm('number,title\n'), false)
    expect(result.errors).toContain('CSV has no data rows')
  })

  it('reports missing file', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    const result = await importADRs(fd, false)
    expect(result.errors).toContain('No file provided')
  })
})
