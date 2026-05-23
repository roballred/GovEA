/**
 * Integration tests: importPersonas server action (#596)
 *
 * Covers:
 *  - Role enforcement (viewer rejected; contributor accepted)
 *  - Basic create from CSV with all fixed columns
 *  - Upsert: existing persona matched case-insensitively by name and updated
 *  - Tag resolution: semicolon-joined names → ids from the "Persona Tag"
 *    taxonomy branch; unknown names reported as row warnings
 *  - Validation: invalid status / visibility skip the row
 *  - dryRun: returns counters and errors WITHOUT writing any rows
 *  - Multi-line description regression (#596) — exercises the quote-aware
 *    parser shared from `@/lib/csv`
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { personas, personaTags, taxonomyTerms } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { importPersonas } from '@/actions/personas'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function csvForm(content: string): FormData {
  const fd = new FormData()
  const blob = new Blob([content], { type: 'text/csv' })
  fd.append('csvFile', new File([blob], 'personas.csv', { type: 'text/csv' }))
  return fd
}

async function seedTagRoot(orgId: string) {
  const [root] = await db.insert(taxonomyTerms).values({
    id: randomUUID(),
    organizationId: orgId,
    name: 'Persona Tag',
    slug: 'persona-tag',
    parentId: null,
  }).returning()
  return root.id
}

async function seedTag(orgId: string, rootId: string, name: string) {
  const [tag] = await db.insert(taxonomyTerms).values({
    id: randomUUID(),
    organizationId: orgId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    parentId: rootId,
  }).returning()
  return tag.id
}

describe('importPersonas (#596)', () => {
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
    await expect(importPersonas(csvForm('name\nTest Persona\n'))).rejects.toThrow('Forbidden')
  })

  it('creates new personas from CSV (contributor)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,type,status,visibility,tags',
      'Resident,Lives in the city,External,published,org,',
      'Permitting Clerk,Reviews permit applications,Staff,draft,org,',
    ].join('\n')

    const result = await importPersonas(csvForm(csv), false)
    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toEqual([])

    const rows = await db.select().from(personas).where(eq(personas.organizationId, orgId))
    expect(rows.some(r => r.name === 'Resident' && r.status === 'published')).toBe(true)
    expect(rows.some(r => r.name === 'Permitting Clerk' && r.type === 'Staff')).toBe(true)
  })

  it('upserts existing personas by name (case-insensitive)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,type,status,visibility,tags',
      'resident,Updated description,External,published,org,',
    ].join('\n')

    const result = await importPersonas(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.updated).toBe(1)

    const row = await db.query.personas.findFirst({
      where: and(eq(personas.organizationId, orgId), eq(personas.name, 'Resident')),
    })
    expect(row?.description).toBe('Updated description')
  })

  it('resolves tag names to ids from the Persona Tag taxonomy', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const rootId = await seedTagRoot(orgId)
    const mobileId = await seedTag(orgId, rootId, 'mobile-first')
    const a11yId = await seedTag(orgId, rootId, 'accessibility')

    const csv = [
      'name,description,type,status,visibility,tags',
      'Field Inspector,On-the-go inspections,Staff,published,org,mobile-first; accessibility; unknown-tag',
    ].join('\n')

    const result = await importPersonas(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.errors.some(e => e.includes('unknown-tag'))).toBe(true)

    const persona = await db.query.personas.findFirst({
      where: and(eq(personas.organizationId, orgId), eq(personas.name, 'Field Inspector')),
    })
    expect(persona).toBeDefined()
    const links = await db.select().from(personaTags).where(eq(personaTags.personaId, persona!.id))
    expect(links.map(l => l.tagId).sort()).toEqual([mobileId, a11yId].sort())
  })

  it('replaces tag links on upsert (no leftover from earlier import)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const persona = await db.query.personas.findFirst({
      where: and(eq(personas.organizationId, orgId), eq(personas.name, 'Field Inspector')),
    })
    expect(persona).toBeDefined()
    const csv = [
      'name,description,type,status,visibility,tags',
      'Field Inspector,On-the-go inspections,Staff,published,org,mobile-first',
    ].join('\n')
    await importPersonas(csvForm(csv), false)
    const links = await db.select().from(personaTags).where(eq(personaTags.personaId, persona!.id))
    expect(links).toHaveLength(1)
  })

  it('skips rows with invalid status / visibility', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,type,status,visibility,tags',
      'Bad Status,desc,External,not-a-status,org,',
      'Bad Vis,desc,External,draft,not-a-visibility,',
    ].join('\n')

    const result = await importPersonas(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.skipped).toBe(2)
    expect(result.errors.some(e => e.includes('invalid status'))).toBe(true)
    expect(result.errors.some(e => e.includes('invalid visibility'))).toBe(true)
  })

  it('dryRun does not write rows', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const csv = [
      'name,description,type,status,visibility,tags',
      'Dry Run Persona,never created,External,published,org,',
    ].join('\n')

    const before = await db.select().from(personas).where(eq(personas.organizationId, orgId))
    const result = await importPersonas(csvForm(csv), true)
    expect(result.created).toBe(1)
    const after = await db.select().from(personas).where(eq(personas.organizationId, orgId))
    expect(after).toHaveLength(before.length)
    expect(after.some(r => r.name === 'Dry Run Persona')).toBe(false)
  })

  it('handles multi-line description through quote-aware parser', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv =
      'name,description,type,status,visibility,tags\n' +
      'MultiLine Persona,"Lives in the city.\nUses mobile first.\nNeeds accessibility.",External,published,org,\n'

    const result = await importPersonas(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)

    const row = await db.query.personas.findFirst({
      where: and(eq(personas.organizationId, orgId), eq(personas.name, 'MultiLine Persona')),
    })
    expect(row?.description).toBe('Lives in the city.\nUses mobile first.\nNeeds accessibility.')
  })

  it('round-trip: re-importing an existing row reports updated=1 with no field changes', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,type,status,visibility,tags',
      'Permitting Clerk,Reviews permit applications,Staff,draft,org,',
    ].join('\n')
    const result = await importPersonas(csvForm(csv), false)
    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)

    const row = await db.query.personas.findFirst({
      where: and(eq(personas.organizationId, orgId), eq(personas.name, 'Permitting Clerk')),
    })
    expect(row).toMatchObject({
      description: 'Reviews permit applications',
      type: 'Staff',
      status: 'draft',
    })
  })

  it('reports CSV with no data rows', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const result = await importPersonas(csvForm('name,description\n'), false)
    expect(result.errors).toContain('CSV has no data rows')
  })

  it('reports missing file', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    const result = await importPersonas(fd, false)
    expect(result.errors).toContain('No file provided')
  })
})
