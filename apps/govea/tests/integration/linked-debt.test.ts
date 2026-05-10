/**
 * Cross-page debt surfacing helpers (#381 PR-2).
 *
 * Asserts:
 *   1. getLinkedDebt returns counts + per-severity breakdown + items
 *      sorted by severity then title for a given entity.
 *   2. Federation rule: caller-org sees own debt always; sees connected-
 *      org debt only when visibility is 'connections' or 'instance';
 *      never sees another org's `org`-visibility debt against the same
 *      entity.
 *   3. Viewer role-gating excludes security-sensitive items and
 *      non-published items.
 *   4. The limit param caps the items array but not the total.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  architectureDebtItems,
  debtCapabilities,
  capabilities,
  orgConnections,
} from '@/db/schema'
import { getLinkedDebt } from '@/lib/linked-debt'
import { createTestOrg, cleanupOrg, type TestOrg } from './helpers/db'

let orgA: TestOrg
let orgB: TestOrg
let sharedCapId: string

async function insertDebt(orgId: string, opts: {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status?: 'draft' | 'published'
  visibility?: 'org' | 'connections' | 'instance'
  securitySensitive?: boolean
  capabilityId: string
}) {
  const id = randomUUID()
  await db.insert(architectureDebtItems).values({
    id,
    organizationId: orgId,
    title: opts.title,
    debtType: 'capability-gap',
    severity: opts.severity,
    status: opts.status ?? 'published',
    visibility: opts.visibility ?? 'org',
    securitySensitive: opts.securitySensitive ?? false,
    source: 'human',
  })
  await db.insert(debtCapabilities).values({ debtItemId: id, capabilityId: opts.capabilityId })
  return id
}

beforeAll(async () => {
  ;[orgA, orgB] = await Promise.all([
    createTestOrg({ name: 'Linked Debt Org A', slug: `lda-${randomUUID().slice(0, 8)}` }),
    createTestOrg({ name: 'Linked Debt Org B', slug: `ldb-${randomUUID().slice(0, 8)}` }),
  ])
  // Capability owned by Org B but visibility lets Org A see it via connection
  sharedCapId = randomUUID()
  await db.insert(capabilities).values({
    id: sharedCapId,
    organizationId: orgB.id,
    name: 'Shared Capability',
    status: 'published',
    visibility: 'connections',
  })
  // Connect Org A and Org B
  await db.insert(orgConnections).values({
    fromOrgId: orgA.id,
    toOrgId: orgB.id,
    status: 'active',
  })
})

afterAll(async () => {
  await db.delete(orgConnections)
  await Promise.all([cleanupOrg(orgA.id), cleanupOrg(orgB.id)])
})

beforeEach(async () => {
  await db.delete(architectureDebtItems).where(eq(architectureDebtItems.organizationId, orgA.id))
  await db.delete(architectureDebtItems).where(eq(architectureDebtItems.organizationId, orgB.id))
})

describe('getLinkedDebt — basic aggregation', () => {
  it('returns zero state for an entity with no linked debt', async () => {
    const summary = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin')
    expect(summary).toEqual({ total: 0, bySeverity: {}, openCount: 0, items: [] })
  })

  it('counts all visible items and breaks down by severity', async () => {
    await insertDebt(orgA.id, { title: 'Crit-1', severity: 'critical', capabilityId: sharedCapId })
    await insertDebt(orgA.id, { title: 'High-1', severity: 'high', capabilityId: sharedCapId })
    await insertDebt(orgA.id, { title: 'High-2', severity: 'high', capabilityId: sharedCapId })

    const summary = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin')
    expect(summary.total).toBe(3)
    expect(summary.bySeverity).toEqual({ critical: 1, high: 2 })
    expect(summary.openCount).toBe(3) // all published
  })

  it('orders items by severity then alpha by title', async () => {
    await insertDebt(orgA.id, { title: 'Z-Low', severity: 'low', capabilityId: sharedCapId })
    await insertDebt(orgA.id, { title: 'A-Crit', severity: 'critical', capabilityId: sharedCapId })
    await insertDebt(orgA.id, { title: 'B-High', severity: 'high', capabilityId: sharedCapId })
    await insertDebt(orgA.id, { title: 'A-High', severity: 'high', capabilityId: sharedCapId })

    const summary = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin')
    expect(summary.items.map(i => i.title)).toEqual(['A-Crit', 'A-High', 'B-High', 'Z-Low'])
  })

  it('caps items by the limit param but keeps total accurate', async () => {
    for (let i = 0; i < 8; i++) {
      await insertDebt(orgA.id, { title: `Item-${i}`, severity: 'medium', capabilityId: sharedCapId })
    }

    const summary = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin', 3)
    expect(summary.total).toBe(8)
    expect(summary.items).toHaveLength(3)
  })
})

describe('getLinkedDebt — federation rules', () => {
  it('caller sees own org-visibility debt against a cross-org entity', async () => {
    await insertDebt(orgA.id, {
      title: 'Org A debt against Org B capability',
      severity: 'high',
      visibility: 'org',
      capabilityId: sharedCapId,
    })

    const summary = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin')
    expect(summary.total).toBe(1)
    expect(summary.items[0].title).toBe('Org A debt against Org B capability')
  })

  it('caller does NOT see another org\'s `org`-visibility debt against a shared entity', async () => {
    // Org B records its own private debt against its own capability
    await insertDebt(orgB.id, {
      title: 'Org B private debt',
      severity: 'critical',
      visibility: 'org',
      capabilityId: sharedCapId,
    })

    // Org A views the same capability — shouldn't see Org B's private debt
    const summary = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin')
    expect(summary.total).toBe(0)
  })

  it('caller sees connected-org debt at `connections` visibility', async () => {
    await insertDebt(orgB.id, {
      title: 'Org B shared debt',
      severity: 'medium',
      visibility: 'connections',
      capabilityId: sharedCapId,
    })

    const summary = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin')
    expect(summary.total).toBe(1)
    expect(summary.items[0].title).toBe('Org B shared debt')
  })

  it('caller sees connected-org debt at `instance` visibility', async () => {
    await insertDebt(orgB.id, {
      title: 'Org B instance-wide debt',
      severity: 'high',
      visibility: 'instance',
      capabilityId: sharedCapId,
    })

    const summary = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin')
    expect(summary.total).toBe(1)
  })
})

describe('getLinkedDebt — role gating', () => {
  it('viewer does not see non-published items', async () => {
    await insertDebt(orgA.id, { title: 'Pub', severity: 'low', status: 'published', capabilityId: sharedCapId })
    await insertDebt(orgA.id, { title: 'Draft', severity: 'low', status: 'draft', capabilityId: sharedCapId })

    const adminView = await getLinkedDebt('capability', sharedCapId, orgA.id, 'admin')
    const viewerView = await getLinkedDebt('capability', sharedCapId, orgA.id, 'viewer')

    expect(adminView.total).toBe(2)
    expect(viewerView.total).toBe(1)
    expect(viewerView.items[0].title).toBe('Pub')
  })

  it('viewer never sees security-sensitive items even when published', async () => {
    await insertDebt(orgA.id, {
      title: 'Sensitive',
      severity: 'critical',
      status: 'published',
      securitySensitive: true,
      capabilityId: sharedCapId,
    })
    await insertDebt(orgA.id, {
      title: 'Safe',
      severity: 'low',
      status: 'published',
      capabilityId: sharedCapId,
    })

    const viewerView = await getLinkedDebt('capability', sharedCapId, orgA.id, 'viewer')
    expect(viewerView.total).toBe(1)
    expect(viewerView.items[0].title).toBe('Safe')
  })
})
