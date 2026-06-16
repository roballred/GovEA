/**
 * Integration tests: operational backup IMPORT (#529 PR2).
 *
 * Covers:
 *   - Bad envelope rejected (non-JSON, missing envelope, wrong format,
 *     wrong shape, missing recipe/content)
 *   - Round-trip: export org A archive → wipe → import → ids restored
 *   - createdBy normalized to importing admin on inserted rows
 *   - Cross-org isolation: importing into org A doesn't disturb org B
 *   - Cross-org restore: importing org A archive into org B places
 *     content in org B
 *   - Cross-org links wiped on import
 *   - Audit log entry written with sourceOrgId in `before`
 *   - recordImport bookkeeping
 *
 * Capability: ac-backup-export
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  organizations, personas, capabilities,
  strategies, strategyGoals, strategyCapabilities,
  crossOrgLinks, auditLog,
} from '@/db/schema'
import { buildArchiveExport } from '@/lib/backup-export'
import { importArchive, recordImport, BackupImportError } from '@/lib/backup-import'
import {
  cleanupOrg,
  createTestOrg,
  createTestUser,
  insertCapability,
  insertPersona,
  insertApplication,
  insertStrategy,
  insertGoal,
  type TestOrg,
  type TestUser,
} from './helpers/db'

let orgA: TestOrg
let orgB: TestOrg
let adminA: TestUser
let adminB: TestUser

beforeAll(async () => {
  ;[orgA, orgB] = await Promise.all([createTestOrg(), createTestOrg()])
  ;[adminA, adminB] = await Promise.all([
    createTestUser(orgA.id, 'admin'),
    createTestUser(orgB.id, 'admin'),
  ])
  await insertCapability(orgA.id, { name: `Cap-A1-${Date.now()}`, status: 'published' })
  await insertCapability(orgA.id, { name: `Cap-A2-${Date.now()}`, status: 'published' })
  await insertPersona(orgA.id, { name: `Persona-A1-${Date.now()}`, status: 'published' })
  await insertApplication(orgA.id, { name: `App-A1-${Date.now()}`, status: 'published' })
  await insertPersona(orgB.id, { name: `Persona-B1-${Date.now()}`, status: 'published' })
})

afterAll(async () => {
  await cleanupOrg(orgA.id)
  await cleanupOrg(orgB.id)
})

// ── Envelope validation ───────────────────────────────────────────────────

describe('envelope validation', () => {
  it('rejects non-JSON input', async () => {
    await expect(importArchive(orgA.id, adminA.id, 'not json')).rejects.toThrow(BackupImportError)
  })

  it('rejects missing envelope', async () => {
    await expect(importArchive(orgA.id, adminA.id, '{}')).rejects.toThrow(/envelope/i)
  })

  it('rejects unsupported format version', async () => {
    const fake = JSON.stringify({
      envelope: { format: '99.0', shape: 'archive', orgId: 'x', orgSlug: 'x', orgName: 'x', exportedAt: '', excludes: [] },
      recipe: {},
      content: {},
    })
    await expect(importArchive(orgA.id, adminA.id, fake)).rejects.toThrow(/format version/i)
  })

  it('rejects non-archive shape', async () => {
    const fake = JSON.stringify({
      envelope: { format: '1.0', shape: 'recipe', orgId: 'x', orgSlug: 'x', orgName: 'x', exportedAt: '', excludes: [] },
      recipe: {},
      content: {},
    })
    await expect(importArchive(orgA.id, adminA.id, fake)).rejects.toThrow(/archive/i)
  })

  it("rejects archive missing recipe or content", async () => {
    const fake = JSON.stringify({
      envelope: { format: '1.0', shape: 'archive', orgId: 'x', orgSlug: 'x', orgName: 'x', exportedAt: '', excludes: [] },
      content: {},
    })
    await expect(importArchive(orgA.id, adminA.id, fake)).rejects.toThrow(/recipe.*content/i)
  })
})

// ── Round-trip ────────────────────────────────────────────────────────────

describe('round-trip: export → wipe → import', () => {
  it('preserves capability ids and counts', async () => {
    const before = await db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgA.id),
    })
    const beforeIds = new Set(before.map(c => c.id))
    expect(before.length).toBeGreaterThan(0)

    const archive = await buildArchiveExport(orgA.id)
    await db.delete(capabilities).where(eq(capabilities.organizationId, orgA.id))
    expect((await db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgA.id),
    })).length).toBe(0)

    const result = await importArchive(orgA.id, adminA.id, archive.body)
    expect(result.sourceOrgId).toBe(orgA.id)
    expect(result.sourceOrgSlug).toBe(orgA.slug)

    const restored = await db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgA.id),
    })
    expect(restored.length).toBe(before.length)
    const restoredIds = new Set(restored.map(c => c.id))
    for (const id of beforeIds) expect(restoredIds.has(id)).toBe(true)
  })

  it('round-trips strategies and their goal/capability links (ADR-0005 R6)', async () => {
    const strat = await insertStrategy(orgA.id, { name: `Strat-A-${Date.now()}`, status: 'active' })
    const goal = await insertGoal(orgA.id, { name: `StratGoal-A-${Date.now()}`, status: 'published' })
    const cap = await insertCapability(orgA.id, { name: `StratCap-A-${Date.now()}`, status: 'published' })
    await db.insert(strategyGoals).values({ strategyId: strat.id, goalId: goal.id })
    await db.insert(strategyCapabilities).values({ strategyId: strat.id, capabilityId: cap.id })

    const archive = await buildArchiveExport(orgA.id)
    await importArchive(orgA.id, adminA.id, archive.body)

    const restoredStrat = await db.query.strategies.findFirst({ where: eq(strategies.id, strat.id) })
    expect(restoredStrat?.status).toBe('active')
    expect((await db.select().from(strategyGoals)
      .where(and(eq(strategyGoals.strategyId, strat.id), eq(strategyGoals.goalId, goal.id)))).length).toBe(1)
    expect((await db.select().from(strategyCapabilities)
      .where(and(eq(strategyCapabilities.strategyId, strat.id), eq(strategyCapabilities.capabilityId, cap.id)))).length).toBe(1)
  })

  it('normalizes createdBy to the importing admin on restored rows', async () => {
    const archive = await buildArchiveExport(orgA.id)
    await importArchive(orgA.id, adminA.id, archive.body)
    const restored = await db.query.personas.findMany({
      where: eq(personas.organizationId, orgA.id),
    })
    expect(restored.length).toBeGreaterThan(0)
    for (const p of restored) expect(p.createdBy).toBe(adminA.id)
  })
})

// ── Cross-org isolation ──────────────────────────────────────────────────

describe('cross-org isolation', () => {
  it('importing org A archive into org A leaves org B untouched', async () => {
    const before = await db.query.personas.findMany({
      where: eq(personas.organizationId, orgB.id),
    })
    const archive = await buildArchiveExport(orgA.id)
    await importArchive(orgA.id, adminA.id, archive.body)
    const after = await db.query.personas.findMany({
      where: eq(personas.organizationId, orgB.id),
    })
    expect(after.length).toBe(before.length)
    expect(after.map(p => p.id).sort()).toEqual(before.map(p => p.id).sort())
  })

  it('rejects cross-org restore (envelope orgId must match destination)', async () => {
    // PR2 constraint: import is same-org only. Cross-org migration is
    // future work because UUIDs are table-unique and would collide.
    const archive = await buildArchiveExport(orgA.id)
    await expect(importArchive(orgB.id, adminB.id, archive.body))
      .rejects.toThrow(/different organization|cross-org/i)
  })
})

// ── Cross-org link wipe ──────────────────────────────────────────────────

describe('cross-org link wipe', () => {
  it('clears outbound cross-org links on the destination', async () => {
    // Ensure orgB has at least one capability so we can build a link.
    let orgBCap = (await db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgB.id),
    }))[0]
    if (!orgBCap) {
      await insertCapability(orgB.id, { name: `Cap-B-link-${Date.now()}`, status: 'published' })
      orgBCap = (await db.query.capabilities.findMany({
        where: eq(capabilities.organizationId, orgB.id),
      }))[0]
    }
    const orgACap = (await db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgA.id),
    }))[0]
    if (!orgACap) throw new Error('no orgA capability')

    await db.insert(crossOrgLinks).values({
      sourceOrgId: orgA.id,
      sourceEntityType: 'capability',
      sourceEntityId: orgACap.id,
      targetOrgId: orgB.id,
      targetEntityType: 'capability',
      targetEntityId: orgBCap.id,
      linkType: 'extends',
      status: 'active',
    })

    const archive = await buildArchiveExport(orgA.id)
    await importArchive(orgA.id, adminA.id, archive.body)

    const remaining = await db.query.crossOrgLinks.findMany({
      where: and(eq(crossOrgLinks.sourceOrgId, orgA.id), eq(crossOrgLinks.targetOrgId, orgB.id)),
    })
    expect(remaining.length).toBe(0)
  })
})

// ── Audit ────────────────────────────────────────────────────────────────

describe('audit log', () => {
  it('writes admin_backup.import_archive with sourceOrgId in before', async () => {
    const archive = await buildArchiveExport(orgA.id)
    await importArchive(orgA.id, adminA.id, archive.body)
    const row = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.action, 'admin_backup.import_archive'),
        eq(auditLog.organizationId, orgA.id),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })
    expect(row).toBeDefined()
    const before = row?.before as Record<string, unknown> | undefined
    expect(before?.sourceOrgId).toBe(orgA.id)
    expect(before?.sourceOrgSlug).toBe(orgA.slug)
    expect(before?.format).toBe('1.0')
    const after = row?.after as Record<string, unknown> | undefined
    expect(after?.inserted).toBeDefined()
  })
})

// ── recordImport ─────────────────────────────────────────────────────────

describe('recordImport', () => {
  it('updates lastImportAt + lastImportBytes', async () => {
    await recordImport(orgA.id, 67890)
    const row = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgA.id),
      columns: { lastImportAt: true, lastImportBytes: true },
    })
    expect(row?.lastImportBytes).toBe(67890)
    expect(row?.lastImportAt).toBeInstanceOf(Date)
  })
})
