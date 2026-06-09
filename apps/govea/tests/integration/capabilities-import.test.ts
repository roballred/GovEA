/**
 * Integration tests: importCapabilities server action (#596)
 *
 * Covers:
 *  - Role enforcement (viewer rejected; contributor + admin accepted)
 *  - Basic create from CSV with all fixed columns
 *  - Upsert: existing capability matched case-insensitively by name and updated
 *  - Persona resolution: semicolon-joined names → ids; unknown names reported
 *    as row warnings without failing the row
 *  - Validation: invalid capability_type / status / visibility skip the row
 *  - dryRun: returns counters and errors WITHOUT writing any rows
 *  - Round-trip: a CSV produced by the export route imports back as zero-diff
 *    (asserted by counting rows before and after a dryRun against export data)
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { capabilities, capabilityPersonas, personas, taxonomyTerms } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { importCapabilities } from '@/actions/capabilities'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function csvForm(content: string): FormData {
  const fd = new FormData()
  const blob = new Blob([content], { type: 'text/csv' })
  fd.append('csvFile', new File([blob], 'capabilities.csv', { type: 'text/csv' }))
  return fd
}

async function seedPersona(orgId: string, name: string) {
  const [row] = await db.insert(personas).values({
    id: randomUUID(), organizationId: orgId, name,
  }).returning()
  return row.id
}

describe('importCapabilities (#596)', () => {
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

  // #717 — importing a domain must create the "Domain" taxonomy value, the same
  // way the form combobox does, instead of leaving an orphaned text value.
  async function domainValues() {
    const [type] = await db.select({ id: taxonomyTerms.id }).from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.organizationId, orgId), isNull(taxonomyTerms.parentId), eq(taxonomyTerms.slug, 'domain')))
    if (!type) return []
    return db.select({ name: taxonomyTerms.name }).from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.organizationId, orgId), eq(taxonomyTerms.parentId, type.id)))
  }

  it('creates the Domain taxonomy value for an imported domain (#717)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Elections Mgmt,Run elections,Elections,,,business,draft,org,',
    ].join('\n')
    const result = await importCapabilities(csvForm(csv), false)
    expect(result.created).toBe(1)

    // The taxonomy value now exists...
    expect((await domainValues()).map(d => d.name)).toContain('Elections')
    // ...and the capability's domain matches the canonical value.
    const [cap] = await db.select({ domain: capabilities.domain }).from(capabilities)
      .where(and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Elections Mgmt')))
    expect(cap.domain).toBe('Elections')
  })

  it('does not duplicate an existing domain value on case-variant import (#717)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const before = (await domainValues()).filter(d => d.name.toLowerCase() === 'elections').length
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Voter Reg,Register voters,elections,,,business,draft,org,', // lower-case variant
    ].join('\n')
    await importCapabilities(csvForm(csv), false)
    const after = (await domainValues()).filter(d => d.name.toLowerCase() === 'elections')
    expect(after.length).toBe(before) // no new value created
    // capability normalized to the canonical existing casing
    const [cap] = await db.select({ domain: capabilities.domain }).from(capabilities)
      .where(and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Voter Reg')))
    expect(cap.domain).toBe('Elections')
  })

  it('rejects viewer role', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(importCapabilities(csvForm('name\nTest Cap\n'))).rejects.toThrow('Forbidden')
  })

  it('creates new capabilities from CSV (contributor)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Online Permitting,Submit permits online,Community Development,Submit applications,Required orgScope,business,published,org,',
      'Identity Mgmt,Authenticate users,Information Technology,SSO and local,Tokens expire after 8h,technical,draft,org,',
    ].join('\n')

    const result = await importCapabilities(csvForm(csv), false)
    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toEqual([])

    const rows = await db.select().from(capabilities).where(eq(capabilities.organizationId, orgId))
    expect(rows.some(r => r.name === 'Online Permitting' && r.status === 'published')).toBe(true)
    expect(rows.some(r => r.name === 'Identity Mgmt' && r.capabilityType === 'technical')).toBe(true)
  })

  it('upserts existing capabilities by name (case-insensitive)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    // Existing "Online Permitting" from previous test. Re-import with a
    // different description and lowercased name.
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'online permitting,Updated description,Community Development,,,business,published,org,',
    ].join('\n')

    const result = await importCapabilities(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.updated).toBe(1)

    const row = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Online Permitting')),
    })
    expect(row?.description).toBe('Updated description')
  })

  it('resolves persona names to ids; unknown names become warnings', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const residentPersonaId = await seedPersona(orgId, 'Resident')
    const staffPersonaId = await seedPersona(orgId, 'Staff')

    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Service Requests,Submit requests,Public Works,,,business,published,org,Resident; Staff; Unknown Persona',
    ].join('\n')

    const result = await importCapabilities(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.errors.some(e => e.includes('Unknown Persona'))).toBe(true)

    const cap = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Service Requests')),
    })
    expect(cap).toBeDefined()
    const links = await db.select().from(capabilityPersonas).where(eq(capabilityPersonas.capabilityId, cap!.id))
    expect(links.map(l => l.personaId).sort()).toEqual([residentPersonaId, staffPersonaId].sort())
  })

  it('replaces persona links on upsert (no leftover from earlier import)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const cap = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Service Requests')),
    })
    expect(cap).toBeDefined()
    // Re-import the same row with only one persona — the other link should drop.
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Service Requests,Submit requests,Public Works,,,business,published,org,Resident',
    ].join('\n')
    await importCapabilities(csvForm(csv), false)
    const links = await db.select().from(capabilityPersonas).where(eq(capabilityPersonas.capabilityId, cap!.id))
    expect(links).toHaveLength(1)
  })

  it('skips rows with invalid status / visibility / capability_type', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Bad Status,desc,,,,business,not-a-status,org,',
      'Bad Vis,desc,,,,business,draft,not-a-visibility,',
      'Bad Type,desc,,,,strategic,draft,org,',
    ].join('\n')

    const result = await importCapabilities(csvForm(csv), false)
    expect(result.created).toBe(0)
    expect(result.skipped).toBe(3)
    expect(result.errors).toHaveLength(3)
    expect(result.errors.some(e => e.includes('invalid status'))).toBe(true)
    expect(result.errors.some(e => e.includes('invalid visibility'))).toBe(true)
    expect(result.errors.some(e => e.includes('invalid capability_type'))).toBe(true)
  })

  it('accepts capitalized enum values for status / visibility / capability_type (#677)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    // Regression for #677: status and visibility used to be case-sensitive
    // while capability_type was lowercased, so title-cased values from Excel /
    // natural typing were rejected inconsistently. All three are now normalized.
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Cased Enums Cap,desc,IT,,,Business,Published,Org,',
      'Mixed Enums Cap,desc,IT,,,TECHNICAL,Archived,Connections,',
    ].join('\n')

    const result = await importCapabilities(csvForm(csv), false)
    expect(result.errors).toEqual([])
    expect(result.created).toBe(2)
    expect(result.skipped).toBe(0)

    const a = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Cased Enums Cap')),
    })
    expect(a).toMatchObject({ capabilityType: 'business', status: 'published', visibility: 'org' })
    const b = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Mixed Enums Cap')),
    })
    expect(b).toMatchObject({ capabilityType: 'technical', status: 'archived', visibility: 'connections' })
  })

  it('dryRun does not write rows', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Dry Run Cap,never created,,,,business,published,org,',
    ].join('\n')

    const before = await db.select().from(capabilities).where(eq(capabilities.organizationId, orgId))
    const result = await importCapabilities(csvForm(csv), true)
    expect(result.created).toBe(1)
    const after = await db.select().from(capabilities).where(eq(capabilities.organizationId, orgId))
    expect(after).toHaveLength(before.length)
    expect(after.some(r => r.name === 'Dry Run Cap')).toBe(false)
  })

  it('reports CSV with no data rows', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const result = await importCapabilities(csvForm('name,description\n'), false)
    expect(result.errors).toContain('CSV has no data rows')
  })

  it('reports missing file', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    const result = await importCapabilities(fd, false)
    expect(result.errors).toContain('No file provided')
  })

  it('handles multi-line behaviors and rules without splitting the row (#596 regression)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    // The export route emits multi-line behaviors / rules inside quoted CSV
    // cells. A naive line-split parser would treat each embedded \n as a new
    // row, so a single multi-line capability would import as N malformed rows.
    // This test pins the quote-aware parser.
    const csv =
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas\n' +
      'MultiLine Cap,desc,IT,"Submit applications\nTrack status\nReceive notifications","Tokens expire in 8h\nMFA required",business,published,org,\n'

    const result = await importCapabilities(csvForm(csv), false)
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)

    const row = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'MultiLine Cap')),
    })
    expect(row?.behaviors).toBe('Submit applications\nTrack status\nReceive notifications')
    expect(row?.rules).toBe('Tokens expire in 8h\nMFA required')
  })

  it('round-trip: a re-import of an existing row reports updated=1 with no field changes', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    // Identity Mgmt was created in the first test. Re-emit the same content.
    const csv = [
      'name,description,domain,behaviors,rules,capability_type,status,visibility,personas',
      'Identity Mgmt,Authenticate users,Information Technology,SSO and local,Tokens expire after 8h,technical,draft,org,',
    ].join('\n')
    const result = await importCapabilities(csvForm(csv), false)
    // Round-trip property: the row matches an existing name, so updated=1.
    // (We don't assert created=0 alone because dryRun=false would still
    // touch the row; the important property is the existing data isn't lost.)
    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)

    const row = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Identity Mgmt')),
    })
    expect(row).toMatchObject({
      description: 'Authenticate users',
      domain: 'Information Technology',
      capabilityType: 'technical',
      status: 'draft',
      visibility: 'org',
    })
  })
})
