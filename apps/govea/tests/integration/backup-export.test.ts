/**
 * Integration tests: operational backup & export (#529 PR1).
 *
 * Covers:
 *   - Recipe / Content / Archive exports return a valid envelope + payload
 *   - Envelope explicitly lists passwordHash / SMTP / audit_log as excludes
 *   - Content export is cross-org-isolated (no orgB rows in orgA export)
 *   - Exclude discipline: no `passwordHash` / SMTP credential field names /
 *     audit_log key anywhere in any export body
 *   - recordExport updates lastExportAt + lastExportBytes
 *
 * Capability: ac-backup-export
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { organizations, personas } from '@/db/schema'
import {
  buildRecipeExport,
  buildContentExport,
  buildArchiveExport,
  recordExport,
  BACKUP_FORMAT_VERSION,
} from '@/lib/backup-export'
import {
  cleanupOrg,
  createTestOrg,
  insertCapability,
  insertPersona,
  insertApplication,
  type TestOrg,
} from './helpers/db'

let orgA: TestOrg
let orgB: TestOrg

beforeAll(async () => {
  ;[orgA, orgB] = await Promise.all([createTestOrg(), createTestOrg()])
  await insertCapability(orgA.id, { name: `Cap-A-${Date.now()}`, status: 'published' })
  await insertPersona(orgA.id, { name: `Persona-A-${Date.now()}`, status: 'published' })
  await insertApplication(orgA.id, { name: `App-A-${Date.now()}`, status: 'published' })
  await insertPersona(orgB.id, { name: `Persona-B-${Date.now()}`, status: 'published' })
})

afterAll(async () => {
  await cleanupOrg(orgA.id)
  await cleanupOrg(orgB.id)
})

// ── Envelope shape ──────────────────────────────────────────────────────────

describe('export envelope', () => {
  it('recipe export carries the documented envelope fields', async () => {
    const out = await buildRecipeExport(orgA.id)
    const parsed = JSON.parse(out.body)
    expect(parsed.envelope.format).toBe(BACKUP_FORMAT_VERSION)
    expect(parsed.envelope.shape).toBe('recipe')
    expect(parsed.envelope.orgId).toBe(orgA.id)
    expect(parsed.envelope.orgSlug).toBe(orgA.slug)
    expect(Array.isArray(parsed.envelope.excludes)).toBe(true)
    expect(parsed.envelope.excludes.some((s: string) => s.includes('passwordHash'))).toBe(true)
    expect(parsed.envelope.excludes.some((s: string) => s.toLowerCase().includes('smtp'))).toBe(true)
    expect(parsed.envelope.excludes.some((s: string) => s.includes('audit_log'))).toBe(true)
  })

  it('content export envelope has shape=content', async () => {
    const out = await buildContentExport(orgA.id)
    const parsed = JSON.parse(out.body)
    expect(parsed.envelope.shape).toBe('content')
  })

  it('archive export envelope has shape=archive and contains both halves', async () => {
    const out = await buildArchiveExport(orgA.id)
    const parsed = JSON.parse(out.body)
    expect(parsed.envelope.shape).toBe('archive')
    expect(parsed.recipe).toBeDefined()
    expect(parsed.content).toBeDefined()
  })

  it('filenames carry the org slug, the shape, and end with .json', async () => {
    const out = await buildArchiveExport(orgA.id)
    expect(out.filename).toMatch(new RegExp(`^govea-${orgA.slug}-archive-`))
    expect(out.filename.endsWith('.json')).toBe(true)
  })
})

// ── Content scope ───────────────────────────────────────────────────────────

describe('content export', () => {
  it('includes orgA personas + capabilities + applications', async () => {
    const out = await buildContentExport(orgA.id)
    const parsed = JSON.parse(out.body)
    expect(parsed.content.personas.length).toBeGreaterThan(0)
    expect(parsed.content.capabilities.length).toBeGreaterThan(0)
    expect(parsed.content.applications.length).toBeGreaterThan(0)
  })

  it('does NOT include other orgs personas (cross-org isolation)', async () => {
    const out = await buildContentExport(orgA.id)
    const parsed = JSON.parse(out.body)
    const orgBPersonaIds = (await db.query.personas.findMany({
      where: eq(personas.organizationId, orgB.id),
    })).map(p => p.id)
    const exportedIds = new Set<string>(parsed.content.personas.map((p: { id: string }) => p.id))
    for (const id of orgBPersonaIds) {
      expect(exportedIds.has(id)).toBe(false)
    }
  })

  it('includes a relationships object with junction arrays present', async () => {
    const out = await buildContentExport(orgA.id)
    const parsed = JSON.parse(out.body)
    expect(parsed.content.relationships).toBeDefined()
    for (const key of [
      'capabilityPersonas',
      'applicationCapabilities',
      'objectiveCapabilities',
      'initiativeCapabilities',
      'adrCapabilities',
    ]) {
      expect(Array.isArray(parsed.content.relationships[key])).toBe(true)
    }
  })
})

// ── Exclude discipline ─────────────────────────────────────────────────────

describe('exclude discipline', () => {
  it('archive payload (recipe + content) contains no passwordHash field anywhere', async () => {
    const out = await buildArchiveExport(orgA.id)
    const parsed = JSON.parse(out.body)
    // Stringify only the payload halves — the envelope intentionally names
    // the excluded field for operator readability ("users.passwordHash").
    const payloadStr = JSON.stringify({ recipe: parsed.recipe, content: parsed.content })
    // Field-name shape: "passwordHash" appearing as a JSON key.
    expect(payloadStr).not.toContain('"passwordHash"')
    expect(payloadStr).not.toContain('"password_hash"')
  })

  it('archive payload contains no SMTP-credential field names', async () => {
    const out = await buildArchiveExport(orgA.id)
    const parsed = JSON.parse(out.body)
    const payloadStr = JSON.stringify({ recipe: parsed.recipe, content: parsed.content }).toLowerCase()
    expect(payloadStr).not.toContain('"smtppassword"')
    expect(payloadStr).not.toContain('"smtp_password"')
    expect(payloadStr).not.toContain('"email_password"')
  })

  it('archive export contains no audit_log section', async () => {
    const out = await buildArchiveExport(orgA.id)
    const parsed = JSON.parse(out.body)
    expect(parsed.content?.auditLog).toBeUndefined()
    expect(parsed.content?.audit_log).toBeUndefined()
  })
})

// ── recordExport bookkeeping ───────────────────────────────────────────────

describe('recordExport', () => {
  it('updates lastExportAt + lastExportBytes on the org row', async () => {
    await recordExport(orgA.id, 12345)
    const after = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgA.id),
      columns: { lastExportAt: true, lastExportBytes: true },
    })
    expect(after?.lastExportBytes).toBe(12345)
    expect(after?.lastExportAt).toBeInstanceOf(Date)
  })
})
