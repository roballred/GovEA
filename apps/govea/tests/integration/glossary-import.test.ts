/**
 * Integration tests: importGlossary server action (#721)
 *
 * Mirrors the capability import suite: role enforcement, create, case-insensitive
 * upsert by term, required-field + enum validation, dryRun writes nothing, and
 * domain values are created via ensureDomainValue (#717).
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { glossaryTerms, taxonomyTerms } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { importGlossary } from '@/actions/glossary'
import { createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser } from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function csvForm(content: string): FormData {
  const fd = new FormData()
  fd.append('csvFile', new File([new Blob([content], { type: 'text/csv' })], 'glossary.csv', { type: 'text/csv' }))
  return fd
}
const HEADER = 'term,definition,domain,notes,status,visibility'

describe('importGlossary (#721)', () => {
  let orgId: string
  let contributor: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
  })
  afterAll(() => cleanupOrg(orgId))

  async function termRow(term: string) {
    const [r] = await db.select().from(glossaryTerms)
      .where(and(eq(glossaryTerms.organizationId, orgId), eq(glossaryTerms.term, term)))
    return r
  }
  async function domainValues() {
    const [type] = await db.select({ id: taxonomyTerms.id }).from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.organizationId, orgId), isNull(taxonomyTerms.parentId), eq(taxonomyTerms.slug, 'domain')))
    if (!type) return [] as string[]
    const rows = await db.select({ name: taxonomyTerms.name }).from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.organizationId, orgId), eq(taxonomyTerms.parentId, type.id)))
    return rows.map(r => r.name)
  }

  it('rejects viewer role', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(importGlossary(csvForm(`${HEADER}\nTerm,Def,,,,`))).rejects.toThrow('Forbidden')
  })

  it('creates terms and creates the Domain taxonomy value', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [HEADER, 'API Gateway,A managed entry point,Integration,,published,org'].join('\n')
    const r = await importGlossary(csvForm(csv), false)
    expect(r.created).toBe(1)
    const row = await termRow('API Gateway')
    expect(row).toMatchObject({ definition: 'A managed entry point', domain: 'Integration', status: 'published' })
    expect(await domainValues()).toContain('Integration')
  })

  it('upserts by term (case-insensitive) — updates, no duplicate', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [HEADER, 'api gateway,Updated definition,,,published,org'].join('\n')
    const r = await importGlossary(csvForm(csv), false)
    expect(r.updated).toBe(1); expect(r.created).toBe(0)
    expect((await termRow('API Gateway')).definition).toBe('Updated definition')
    const all = await db.select().from(glossaryTerms)
      .where(and(eq(glossaryTerms.organizationId, orgId), eq(glossaryTerms.term, 'API Gateway')))
    expect(all).toHaveLength(1)
  })

  it('skips rows missing required fields / invalid enums', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = [
      HEADER,
      ',has def but no term,,,,',          // missing term
      'No Def,,,,,',                        // missing definition
      'Bad Status,def,,,nonsense,org',      // invalid status
    ].join('\n')
    const r = await importGlossary(csvForm(csv), false)
    expect(r.skipped).toBe(3)
    expect(r.errors.some(e => /term/.test(e))).toBe(true)
    expect(r.errors.some(e => /definition/.test(e))).toBe(true)
    expect(r.errors.some(e => /status/.test(e))).toBe(true)
  })

  it('dryRun writes nothing', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const before = (await db.select().from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId))).length
    const r = await importGlossary(csvForm([HEADER, 'Ephemeral,Should not persist,,,published,org'].join('\n')), true)
    expect(r.created).toBe(1) // counted in preview
    const after = (await db.select().from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId))).length
    expect(after).toBe(before) // but nothing written
  })
})
