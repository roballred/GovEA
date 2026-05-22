/**
 * Integration tests: audit-log filters (#531)
 *
 * Covers the three filter axes the UI exposes:
 *   - actor (actorUserId)
 *   - action namespace (actionNamespaces — match `action LIKE 'ns.%'`)
 *   - time window (since)
 *
 * Plus the option-lookup helpers (actor dropdown + namespace chip list)
 * that the page uses to drive the filter UI.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { auditLog } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  getAuditEntries, getAuditActorOptions, getAuditActionNamespaces,
  timeWindowToDate,
} from '@/lib/audit-view'
import {
  createTestOrg, createTestUser, cleanupOrg, type TestUser,
} from './helpers/db'

describe('audit-log filters (#531)', () => {
  let orgId: string
  let alice: TestUser
  let bob: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[alice, bob] = await Promise.all([
      createTestUser(orgId, 'admin', { name: 'Alice Admin' }),
      createTestUser(orgId, 'contributor', { name: 'Bob Contributor' }),
    ])

    // Seed audit events across actors / namespaces / time.
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    await db.insert(auditLog).values([
      { id: randomUUID(), organizationId: orgId, userId: alice.id, action: 'capability.edit', entityType: 'capability', createdAt: now },
      { id: randomUUID(), organizationId: orgId, userId: alice.id, action: 'capability.create', entityType: 'capability', createdAt: twoDaysAgo },
      { id: randomUUID(), organizationId: orgId, userId: bob.id,   action: 'capability.edit', entityType: 'capability', createdAt: tenDaysAgo },
      { id: randomUUID(), organizationId: orgId, userId: bob.id,   action: 'application.edit', entityType: 'application', createdAt: tenDaysAgo },
      { id: randomUUID(), organizationId: orgId, userId: alice.id, action: 'auth.login', entityType: 'user', createdAt: sixtyDaysAgo },
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  it('no filter: admin sees all events; contributor only sees architecture-content', async () => {
    const adminRows = await getAuditEntries(orgId, 'admin', {})
    expect(adminRows.length).toBe(5)
    const contribRows = await getAuditEntries(orgId, 'contributor', {})
    expect(contribRows.length).toBe(4) // excludes auth.login (entityType=user)
  })

  it('actor filter narrows to a single user', async () => {
    const rows = await getAuditEntries(orgId, 'admin', { actorUserId: alice.id })
    expect(rows.length).toBe(3)
    expect(rows.every(r => r.log.userId === alice.id)).toBe(true)
  })

  it('action namespace filter matches LIKE prefix (single namespace)', async () => {
    const rows = await getAuditEntries(orgId, 'admin', { actionNamespaces: ['application'] })
    expect(rows.length).toBe(1)
    expect(rows[0].log.action).toBe('application.edit')
  })

  it('action namespace filter ORs multiple namespaces', async () => {
    const rows = await getAuditEntries(orgId, 'admin', { actionNamespaces: ['application', 'auth'] })
    expect(rows.length).toBe(2)
    const actions = rows.map(r => r.log.action).sort()
    expect(actions).toEqual(['application.edit', 'auth.login'])
  })

  it('time window filter respects the cutoff (7d)', async () => {
    const since = timeWindowToDate('7d')!
    const rows = await getAuditEntries(orgId, 'admin', { since })
    expect(rows.length).toBe(2) // only today + 2-days-ago survive
  })

  it('filters combine: actor + namespace + time', async () => {
    const since = timeWindowToDate('30d')! // 30d cutoff drops the 60-day-old auth row
    const rows = await getAuditEntries(orgId, 'admin', {
      actorUserId: alice.id,
      actionNamespaces: ['capability'],
      since,
    })
    expect(rows.length).toBe(2) // alice's two capability events within 30d
  })

  it('getAuditActorOptions returns distinct actors in role scope', async () => {
    const admin = await getAuditActorOptions(orgId, 'admin')
    expect(admin.length).toBe(2)
    const contrib = await getAuditActorOptions(orgId, 'contributor')
    // alice only has architecture-content events visible to contributors via
    // capability.edit + capability.create; bob has capability + application
    // events. Both still appear because both have content events.
    expect(contrib.length).toBe(2)
  })

  it('getAuditActionNamespaces returns distinct, sorted namespaces', async () => {
    const admin = await getAuditActionNamespaces(orgId, 'admin')
    expect(admin).toEqual(['application', 'auth', 'capability'])
    const contrib = await getAuditActionNamespaces(orgId, 'contributor')
    expect(contrib).toEqual(['application', 'capability']) // auth hidden from contributor
  })
})
