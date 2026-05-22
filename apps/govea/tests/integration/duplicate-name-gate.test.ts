/**
 * Integration tests: duplicate-name soft-warn gate (#566)
 *
 * Covers:
 *   - DuplicateNameAcknowledgmentRequiredError thrown on collision
 *   - acknowledgeDuplicate=on bypasses the gate
 *   - Case + whitespace normalisation: 'Online Permitting', 'online permitting',
 *     and 'Online  Permitting' (double-space) all collide with each other
 *   - Per-org scope: same name across different orgs is OK
 *   - All 7 entity types use the gate (capability, application, persona,
 *     initiative, objective, service, glossary)
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  capabilities, applications, personas, initiatives,
  strategicObjectives, services, glossaryTerms,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { createCapability } from '@/actions/capabilities'
import { createApplication } from '@/actions/applications'
import { createPersona } from '@/actions/personas'
import { createInitiative } from '@/actions/initiatives'
import { createObjective } from '@/actions/objectives'
import { createService } from '@/actions/services'
import { createGlossaryTerm } from '@/actions/glossary'
import {
  findDuplicateName, normaliseName,
  DuplicateNameAcknowledgmentRequiredError,
} from '@/lib/duplicate-name-gate'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('duplicate-name soft-warn gate (#566)', () => {
  let orgId: string
  let otherOrgId: string
  let contributor: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    const other = await createTestOrg()
    orgId = org.id
    otherOrgId = other.id
    contributor = await createTestUser(orgId, 'contributor')
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
    await cleanupOrg(otherOrgId)
  })

  // ── normaliseName ────────────────────────────────────────────────────────

  it('normaliseName lowercases + trims + collapses whitespace', () => {
    expect(normaliseName('Online Permitting')).toBe('online permitting')
    expect(normaliseName('  Online   Permitting  ')).toBe('online permitting')
    expect(normaliseName('online\tpermitting')).toBe('online permitting')
    expect(normaliseName('')).toBe('')
    expect(normaliseName(null)).toBe('')
  })

  // ── findDuplicateName ────────────────────────────────────────────────────

  it('findDuplicateName: returns existing row on case-insensitive match', async () => {
    await db.insert(capabilities).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Budget Reporting', status: 'draft', visibility: 'org',
    })
    const dup = await findDuplicateName('capability', orgId, 'budget reporting')
    expect(dup?.existingName).toBe('Budget Reporting')
  })

  it('findDuplicateName: returns null when no match', async () => {
    const dup = await findDuplicateName('capability', orgId, `Nonexistent-${randomUUID().slice(0, 6)}`)
    expect(dup).toBeNull()
  })

  it('findDuplicateName: whitespace-normalises (double space collides)', async () => {
    await db.insert(capabilities).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Permits  Issuance', // intentional double space
      status: 'draft', visibility: 'org',
    })
    const dup = await findDuplicateName('capability', orgId, 'Permits Issuance')
    expect(dup?.existingName).toBe('Permits  Issuance')
  })

  it('findDuplicateName: scoped to org (same name in another org returns null)', async () => {
    await db.insert(capabilities).values({
      id: randomUUID(), organizationId: otherOrgId,
      name: 'Different Org Cap', status: 'draft', visibility: 'org',
    })
    const dup = await findDuplicateName('capability', orgId, 'Different Org Cap')
    expect(dup).toBeNull()
  })

  // ── Gate fires on createCapability ────────────────────────────────────────

  it('createCapability without ack throws DuplicateNameAcknowledgmentRequiredError', async () => {
    await db.insert(capabilities).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Capability For Dup Test', status: 'draft', visibility: 'org',
    })
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('name', 'capability for dup test') // lowercase variation
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    await expect(createCapability(fd)).rejects.toThrow(DuplicateNameAcknowledgmentRequiredError)
  })

  it('createCapability with acknowledgeDuplicate=on succeeds', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('name', 'Capability For Dup Test') // same name, ack'd
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    fd.set('acknowledgeDuplicate', 'on')
    await createCapability(fd)
    const rows = await db.select().from(capabilities)
      .where(and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Capability For Dup Test')))
    expect(rows.length).toBeGreaterThanOrEqual(2) // original + new ack'd duplicate
  })

  it('error message carries the canonical existing name', async () => {
    await db.insert(capabilities).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Online Permitting', status: 'draft', visibility: 'org',
    })
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('name', 'ONLINE PERMITTING')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    try {
      await createCapability(fd)
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(DuplicateNameAcknowledgmentRequiredError)
      const e = err as DuplicateNameAcknowledgmentRequiredError
      expect(e.code).toBe('DUPLICATE_NAME_ACK_REQUIRED')
      expect(e.existingName).toBe('Online Permitting')
      expect(e.message).toContain('Online Permitting')
      expect(e.message).toContain('already exists in this organization')
    }
  })

  // ── Each entity type uses the gate ────────────────────────────────────────

  it('createApplication uses the gate', async () => {
    await db.insert(applications).values({
      id: randomUUID(), organizationId: orgId, name: 'Existing App',
      status: 'draft', visibility: 'org',
    })
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('name', 'existing app')
    fd.set('lifecycleStatus', 'active')
    await expect(createApplication(fd)).rejects.toThrow(DuplicateNameAcknowledgmentRequiredError)
  })

  it('createPersona uses the gate', async () => {
    await db.insert(personas).values({
      id: randomUUID(), organizationId: orgId, name: 'Existing Persona',
      status: 'draft', visibility: 'org',
    })
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('name', 'EXISTING PERSONA')
    await expect(createPersona(fd)).rejects.toThrow(DuplicateNameAcknowledgmentRequiredError)
  })

  it('createInitiative uses the gate', async () => {
    await db.insert(initiatives).values({
      id: randomUUID(), organizationId: orgId, name: 'Existing Initiative',
      status: 'proposed', visibility: 'org',
    })
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('name', 'Existing Initiative')
    fd.set('status', 'proposed')
    fd.set('visibility', 'org')
    await expect(createInitiative(fd)).rejects.toThrow(DuplicateNameAcknowledgmentRequiredError)
  })

  it('createObjective uses the gate', async () => {
    await db.insert(strategicObjectives).values({
      id: randomUUID(), organizationId: orgId, name: 'Existing Objective',
      status: 'draft', visibility: 'org',
    })
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('name', 'existing objective')
    await expect(createObjective(fd)).rejects.toThrow(DuplicateNameAcknowledgmentRequiredError)
  })

  it('createService uses the gate', async () => {
    await db.insert(services).values({
      id: randomUUID(), organizationId: orgId, name: 'Existing Service',
      channels: [], status: 'draft', visibility: 'org',
    })
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('name', 'existing service')
    await expect(createService(fd)).rejects.toThrow(DuplicateNameAcknowledgmentRequiredError)
  })

  it('createGlossaryTerm uses the gate', async () => {
    await db.insert(glossaryTerms).values({
      id: randomUUID(), organizationId: orgId, term: 'Existing Term',
      definition: 'a thing', status: 'draft', visibility: 'org',
    })
    mockAuth.mockResolvedValue(makeSession(contributor))
    const fd = new FormData()
    fd.set('term', 'EXISTING TERM')
    fd.set('definition', 'another thing')
    await expect(createGlossaryTerm(fd)).rejects.toThrow(DuplicateNameAcknowledgmentRequiredError)
  })
})
