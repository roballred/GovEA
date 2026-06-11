/**
 * Integration tests for the Repository Duplicates report assembly (#718).
 *
 * Covers the acceptance-criteria matrix against real tables: capabilities
 * (exact + near), one non-capability entity (services), taxonomy values
 * scoped to their type, and conflicting same-type entity-taxonomy
 * assignments. Grouping math itself is unit-tested in
 * tests/unit/duplicate-report.test.ts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { capabilities, services, taxonomyTerms, entityTaxonomyValues } from '@/db/schema'
import { randomUUID } from 'node:crypto'
import { createTestOrg, cleanupOrg } from './helpers/db'
import { getRepositoryDuplicateReport, type DuplicateReportSection } from '@/lib/duplicate-report-data'

describe('repository duplicates report (#718)', () => {
  let orgId: string
  let otherOrgId: string
  let sections: DuplicateReportSection[]

  const capExactA = randomUUID()
  const capExactB = randomUUID()
  const capNearA = randomUUID()
  const capNearB = randomUUID()
  const svcA = randomUUID()
  const svcB = randomUUID()
  const otherOrgCapId = randomUUID()
  const typeId = randomUUID()
  const valueA = randomUUID()
  const valueB = randomUUID()
  const taggedCapability = capNearA

  const section = (key: string) => {
    const s = sections.find(x => x.key === key)
    if (!s) throw new Error(`missing section ${key}`)
    return s
  }

  beforeAll(async () => {
    const org = await createTestOrg()
    const other = await createTestOrg()
    orgId = org.id
    otherOrgId = other.id

    await db.insert(capabilities).values([
      // Exact pair (case + punctuation drift), same domain
      { id: capExactA, organizationId: orgId, name: 'Case Management', domain: 'Health', status: 'draft', visibility: 'org' },
      { id: capExactB, organizationId: orgId, name: 'case-management', domain: 'Health', status: 'published', visibility: 'org' },
      // Near pair within one domain
      { id: capNearA, organizationId: orgId, name: 'Online Permitting', domain: 'Licensing', status: 'draft', visibility: 'org' },
      { id: capNearB, organizationId: orgId, name: 'Permitting Online Portal', domain: 'Licensing', status: 'draft', visibility: 'org' },
      // Same name in ANOTHER org — must never appear in this org's report
      { id: otherOrgCapId, organizationId: otherOrgId, name: 'Case Management', domain: 'Health', status: 'draft', visibility: 'org' },
    ])

    await db.insert(services).values([
      { id: svcA, organizationId: orgId, name: 'Benefits Enrollment', status: 'draft', visibility: 'org' },
      { id: svcB, organizationId: orgId, name: 'Benefits  Enrollment!', status: 'draft', visibility: 'org' },
    ])

    await db.insert(taxonomyTerms).values([
      { id: typeId, organizationId: orgId, parentId: null, name: 'Service Area', slug: 'service-area' },
      // Duplicate value names within the same type
      { id: valueA, organizationId: orgId, parentId: typeId, name: 'Public Safety', slug: 'public-safety' },
      { id: valueB, organizationId: orgId, parentId: typeId, name: 'public safety', slug: 'public-safety-2' },
    ])

    // One capability tagged with BOTH same-type values whose names duplicate
    // each other — the conflicting-assignment case.
    await db.insert(entityTaxonomyValues).values([
      { id: randomUUID(), organizationId: orgId, entityType: 'capability', entityId: taggedCapability, taxonomyTermId: valueA },
      { id: randomUUID(), organizationId: orgId, entityType: 'capability', entityId: taggedCapability, taxonomyTermId: valueB },
    ])

    sections = await getRepositoryDuplicateReport(orgId)
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
    await cleanupOrg(otherOrgId)
  })

  it('reports a section for every supported entity type', () => {
    const keys = sections.map(s => s.key)
    for (const expected of [
      'capabilities', 'applications', 'personas', 'adrs', 'initiatives', 'objectives',
      'goals', 'services', 'value-streams', 'principles', 'glossary',
      'data-entities', 'data-attributes', 'data-relationships', 'data-business-keys',
      'taxonomy-types', 'taxonomy-values', 'taxonomy-assignments',
    ]) {
      expect(keys, `section ${expected} should exist`).toContain(expected)
    }
  })

  it('capabilities: finds the exact group and the near group, tiered', () => {
    const caps = section('capabilities')
    expect(caps.scanned).toBe(4) // other org's rows are not scanned

    const exact = caps.groups.find(g => g.tier === 'exact')
    expect(exact, 'exact group should exist').toBeDefined()
    expect(exact!.records.map(r => r.id).sort()).toEqual([capExactA, capExactB].sort())
    // Enough context to review: status chip and source link
    expect(exact!.records.every(r => r.status)).toBe(true)
    expect(exact!.records.every(r => r.href?.startsWith('/capabilities/'))).toBe(true)

    const near = caps.groups.find(g => g.tier === 'near')
    expect(near, 'near group should exist').toBeDefined()
    expect(near!.records.map(r => r.id).sort()).toEqual([capNearA, capNearB].sort())
    expect(near!.similarity).toBeLessThan(1)
  })

  it('never includes another organization’s records', () => {
    for (const s of sections) {
      for (const g of s.groups) {
        for (const r of g.records) {
          expect(r.id, `record ${r.name} in ${s.key}`).not.toBe(otherOrgCapId)
        }
      }
    }
    const exact = section('capabilities').groups.find(g => g.tier === 'exact')!
    expect(exact.records).toHaveLength(2) // not 3 — the other org's copy is excluded
  })

  it('services (non-capability entity): finds the exact group', () => {
    const svc = section('services')
    const exact = svc.groups.find(g => g.tier === 'exact')
    expect(exact).toBeDefined()
    expect(exact!.records.map(r => r.id).sort()).toEqual([svcA, svcB].sort())
  })

  it('taxonomy values: duplicate names within the same type are flagged with type context', () => {
    const vals = section('taxonomy-values')
    const exact = vals.groups.find(g => g.tier === 'exact')
    expect(exact).toBeDefined()
    expect(exact!.records.map(r => r.id).sort()).toEqual([valueA, valueB].sort())
    expect(exact!.records[0].context).toBe('Service Area')
  })

  it('assignments: one entity tagged with duplicate same-type values is flagged', () => {
    const assigns = section('taxonomy-assignments')
    expect(assigns.groups.length).toBeGreaterThanOrEqual(1)
    const group = assigns.groups[0]
    expect(group.records).toHaveLength(2)
    expect(group.records.map(r => r.name).sort()).toEqual(['Public Safety', 'public safety'])
    // Context names the type and the tagged entity
    expect(group.records[0].context).toContain('Service Area')
    expect(group.records[0].context).toContain('Online Permitting')
  })

  it('empty states: sections with no candidates report zero groups', () => {
    const apps = section('applications')
    expect(apps.groups).toEqual([])
  })

  it('detection is read-only — no records were mutated or removed', async () => {
    const caps = await db.query.capabilities.findMany({
      where: (c, { eq: e }) => e(c.organizationId, orgId),
    })
    expect(caps).toHaveLength(4)
    expect(caps.map(c => c.name).sort()).toEqual(
      ['Case Management', 'Online Permitting', 'Permitting Online Portal', 'case-management'].sort(),
    )
  })
})
