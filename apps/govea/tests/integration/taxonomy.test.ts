/**
 * Integration tests: taxonomy server actions
 *
 * Covers duplicate prevention for taxonomy types and values.
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTaxonomyTerm, editTaxonomyTerm } from '@/actions/taxonomy'
import { db } from '@/db/client'
import { taxonomyTerms } from '@/db/schema'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  type TestUser,
} from './helpers/db'
import { and, eq, isNull } from 'drizzle-orm'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function termForm(name: string, parentId?: string) {
  const fd = new FormData()
  fd.set('name', name)
  if (parentId) fd.set('parentId', parentId)
  return fd
}

async function findType(orgId: string, slug: string) {
  return db.query.taxonomyTerms.findFirst({
    where: and(
      eq(taxonomyTerms.organizationId, orgId),
      isNull(taxonomyTerms.parentId),
      eq(taxonomyTerms.slug, slug),
    ),
  })
}

async function findValue(orgId: string, parentId: string, slug: string) {
  return db.query.taxonomyTerms.findFirst({
    where: and(
      eq(taxonomyTerms.organizationId, orgId),
      eq(taxonomyTerms.parentId, parentId),
      eq(taxonomyTerms.slug, slug),
    ),
  })
}

describe('taxonomy duplicate prevention', () => {
  let orgId: string
  let contributor: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    contributor = await createTestUser(orgId, 'contributor')
  })

  afterAll(() => cleanupOrg(orgId))

  beforeEach(() => {
    mockAuth.mockResolvedValue(makeSession(contributor))
  })

  it('rejects duplicate type names within an organization', async () => {
    await createTaxonomyTerm(termForm('Criticality'))

    await expect(createTaxonomyTerm(termForm('criticality')))
      .rejects.toThrow('A taxonomy type named "Criticality" already exists.')
  })

  it('rejects duplicate value names within the same type', async () => {
    await createTaxonomyTerm(termForm('Risk Class'))
    const type = await findType(orgId, 'risk-class')
    expect(type).toBeDefined()

    await createTaxonomyTerm(termForm('High', type!.id))

    await expect(createTaxonomyTerm(termForm('high', type!.id)))
      .rejects.toThrow('A value named "High" already exists in this taxonomy type.')
  })

  it('allows the same value name under different types', async () => {
    await createTaxonomyTerm(termForm('Business Fit'))
    await createTaxonomyTerm(termForm('Technical Fit'))
    const businessFit = await findType(orgId, 'business-fit')
    const technicalFit = await findType(orgId, 'technical-fit')
    expect(businessFit).toBeDefined()
    expect(technicalFit).toBeDefined()

    await createTaxonomyTerm(termForm('High', businessFit!.id))
    await createTaxonomyTerm(termForm('High', technicalFit!.id))

    expect(await findValue(orgId, businessFit!.id, 'high')).toBeDefined()
    expect(await findValue(orgId, technicalFit!.id, 'high')).toBeDefined()
  })

  it('rejects renaming a type to collide with another type', async () => {
    await createTaxonomyTerm(termForm('Operating Model'))
    await createTaxonomyTerm(termForm('Delivery Model'))
    const deliveryModel = await findType(orgId, 'delivery-model')
    expect(deliveryModel).toBeDefined()

    await expect(editTaxonomyTerm(deliveryModel!.id, termForm('Operating Model')))
      .rejects.toThrow('A taxonomy type named "Operating Model" already exists.')
  })

  it('rejects renaming a value to collide within the same type', async () => {
    await createTaxonomyTerm(termForm('Sensitivity'))
    const type = await findType(orgId, 'sensitivity')
    expect(type).toBeDefined()

    await createTaxonomyTerm(termForm('Public', type!.id))
    await createTaxonomyTerm(termForm('Confidential', type!.id))
    const confidential = await findValue(orgId, type!.id, 'confidential')
    expect(confidential).toBeDefined()

    await expect(editTaxonomyTerm(confidential!.id, termForm('Public')))
      .rejects.toThrow('A value named "Public" already exists in this taxonomy type.')
  })
})
