/**
 * Integration tests: contributor-readable audit log (#597)
 *
 * Covers the getAuditEntries() helper that powers /audit:
 *  - Admin sees every audit row for their org
 *  - Contributor sees only architecture-content entity types
 *  - Sensitive entity types (user, organization, instance_settings,
 *    org_connection, admin_notice, act_as_session, break_glass_session,
 *    platform_config) never appear in the contributor view
 *  - Org scope is honoured for both roles (cross-org rows hidden)
 *
 * The page-level redirect for Viewers is enforced by canEdit() in the
 * RBAC helper and exercised by other test suites; this suite assumes the
 * page-level gate is in place and tests only the query the page issues
 * after the gate passes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { auditLog } from '@/db/schema'
import {
  CONTRIBUTOR_VISIBLE_ENTITY_TYPES,
  getAuditEntries,
} from '@/lib/audit-view'
import {
  createTestOrg, cleanupOrg,
} from './helpers/db'

const ADMIN_ONLY_ENTITY_TYPES = [
  'user',
  'organization',
  'instance_settings',
  'org_connection',
  'admin_notice',
  'act_as_session',
  'break_glass_session',
  'platform_config',
] as const

async function seedAuditRow(orgId: string, entityType: string, action: string) {
  await db.insert(auditLog).values({
    id: randomUUID(),
    organizationId: orgId,
    entityType,
    entityId: randomUUID(),
    action,
    userId: null,
    after: { test: true },
  })
}

describe('getAuditEntries (#597)', () => {
  let orgA: string
  let orgB: string

  beforeAll(async () => {
    const [a, b] = await Promise.all([createTestOrg(), createTestOrg()])
    orgA = a.id
    orgB = b.id

    // Seed Org A with one row per entity type — both contributor-visible and
    // admin-only — plus one row in Org B that should never leak.
    for (const t of CONTRIBUTOR_VISIBLE_ENTITY_TYPES) {
      await seedAuditRow(orgA, t, `${t}.create`)
    }
    for (const t of ADMIN_ONLY_ENTITY_TYPES) {
      await seedAuditRow(orgA, t, `${t}.create`)
    }
    // Cross-org noise
    await seedAuditRow(orgB, 'capability', 'capability.create')
  })

  afterAll(async () => {
    await Promise.all([cleanupOrg(orgA), cleanupOrg(orgB)])
  })

  it('admin sees every entity type for their org', async () => {
    const rows = await getAuditEntries(orgA, 'admin')
    const seenTypes = new Set(rows.map(r => r.log.entityType))
    for (const t of CONTRIBUTOR_VISIBLE_ENTITY_TYPES) {
      expect(seenTypes.has(t)).toBe(true)
    }
    for (const t of ADMIN_ONLY_ENTITY_TYPES) {
      expect(seenTypes.has(t)).toBe(true)
    }
  })

  it('contributor sees architecture-content entity types', async () => {
    const rows = await getAuditEntries(orgA, 'contributor')
    const seenTypes = new Set(rows.map(r => r.log.entityType))
    for (const t of CONTRIBUTOR_VISIBLE_ENTITY_TYPES) {
      expect(seenTypes.has(t)).toBe(true)
    }
  })

  it('contributor never sees admin-only entity types', async () => {
    const rows = await getAuditEntries(orgA, 'contributor')
    const seenTypes = new Set(rows.map(r => r.log.entityType))
    for (const t of ADMIN_ONLY_ENTITY_TYPES) {
      expect(seenTypes.has(t)).toBe(false)
    }
  })

  it('admin only sees rows from their own org', async () => {
    const rows = await getAuditEntries(orgA, 'admin')
    expect(rows.every(r => r.log.organizationId === orgA)).toBe(true)
  })

  it('contributor only sees rows from their own org', async () => {
    const rows = await getAuditEntries(orgA, 'contributor')
    expect(rows.every(r => r.log.organizationId === orgA)).toBe(true)
  })

  it('allowlist does not include any of the explicit admin-only types', () => {
    // Defensive check — if someone copy-pastes a new type into the allowlist
    // we want a sharp failure rather than a silent leak.
    const allowlist = new Set<string>(CONTRIBUTOR_VISIBLE_ENTITY_TYPES)
    for (const t of ADMIN_ONLY_ENTITY_TYPES) {
      expect(allowlist.has(t)).toBe(false)
    }
  })
})
