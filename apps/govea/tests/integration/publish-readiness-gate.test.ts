/**
 * Integration tests: publish-readiness soft-warn gate (#567 Part B)
 *
 * Covers the gate function in isolation (rule logic) + end-to-end
 * through the edit actions for capability, application, persona,
 * and objective.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  capabilities, applications, personas, strategicObjectives,
  applicationCapabilities, capabilityPersonas, auditLog,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  ensurePublishReady, checkPublishReadiness,
  PublishReadinessAcknowledgmentRequiredError,
} from '@/lib/publish-readiness-gate'
import { editCapability } from '@/actions/capabilities'
import { editApplication } from '@/actions/applications'
import { editPersona } from '@/actions/personas'
import { editObjective } from '@/actions/objectives'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function fdFromObject(obj: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(obj)) fd.set(k, v)
  return fd
}

describe('publish-readiness gate (#567 Part B)', () => {
  let orgId: string
  let user: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    user = await createTestUser(orgId, 'contributor')
  })
  afterAll(() => cleanupOrg(orgId))

  // ── checkPublishReadiness pure-logic ─────────────────────────────────────

  it('capability publish requires domain AND a persona/app/objective link', () => {
    const empty = fdFromObject({})
    expect(checkPublishReadiness('capability', empty, {})).toEqual([
      'domain',
      'persona, application, or objective link',
    ])
    expect(checkPublishReadiness('capability', fdFromObject({ domain: 'Finance' }), {})).toEqual([
      'persona, application, or objective link',
    ])
    expect(checkPublishReadiness('capability', fdFromObject({ domain: 'Finance' }), { personaCount: 1 })).toEqual([])
    expect(checkPublishReadiness('capability', fdFromObject({ domain: 'Finance' }), { applicationCount: 1 })).toEqual([])
  })

  it('application publish requires a capability link', () => {
    expect(checkPublishReadiness('application', fdFromObject({}), {})).toEqual(['capability link'])
    expect(checkPublishReadiness('application', fdFromObject({}), { capabilityCount: 1 })).toEqual([])
  })

  it('persona publish requires description OR type', () => {
    expect(checkPublishReadiness('persona', fdFromObject({}), {})).toEqual(['description or type'])
    expect(checkPublishReadiness('persona', fdFromObject({ description: 'A description' }), {})).toEqual([])
    expect(checkPublishReadiness('persona', fdFromObject({ type: 'internal' }), {})).toEqual([])
  })

  it('objective publish requires successMetric', () => {
    expect(checkPublishReadiness('objective', fdFromObject({}), {})).toEqual(['success metric'])
    expect(checkPublishReadiness('objective', fdFromObject({ successMetric: '90% on-time' }), {})).toEqual([])
  })

  // ── ensurePublishReady gate ───────────────────────────────────────────────

  it('ensurePublishReady is a no-op when not transitioning to published', () => {
    expect(() => ensurePublishReady({
      entityType: 'capability',
      formData: fdFromObject({}),
      linkCounts: {},
      transitioningToPublished: false,
      acknowledged: false,
    })).not.toThrow()
  })

  it('ensurePublishReady throws when ack missing + fields incomplete', () => {
    expect(() => ensurePublishReady({
      entityType: 'persona',
      formData: fdFromObject({}),
      transitioningToPublished: true,
      acknowledged: false,
    })).toThrow(PublishReadinessAcknowledgmentRequiredError)
  })

  it('ensurePublishReady returns missingFields when ack is present', () => {
    const result = ensurePublishReady({
      entityType: 'persona',
      formData: fdFromObject({}),
      transitioningToPublished: true,
      acknowledged: true,
    })
    expect(result.missingFields).toEqual(['description or type'])
  })

  // ── End-to-end: capability edit fires the gate on transition ─────────────

  it('editCapability transitioning to published with no domain throws', async () => {
    const [cap] = await db.insert(capabilities).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Cap Pub Test',
      status: 'draft', visibility: 'org',
    }).returning()
    mockAuth.mockResolvedValue(makeSession(user))
    const fd = new FormData()
    fd.set('name', 'Cap Pub Test')
    fd.set('status', 'published') // transition!
    fd.set('visibility', 'org')
    await expect(editCapability(cap.id, fd)).rejects.toThrow(PublishReadinessAcknowledgmentRequiredError)
  })

  it('editCapability transitioning with ack succeeds + writes audit row', async () => {
    const [cap] = await db.insert(capabilities).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Cap Pub Ack Test',
      status: 'draft', visibility: 'org',
    }).returning()
    mockAuth.mockResolvedValue(makeSession(user))
    const fd = new FormData()
    fd.set('name', 'Cap Pub Ack Test')
    fd.set('status', 'published')
    fd.set('visibility', 'org')
    fd.set('acknowledgePublishIncomplete', 'on')
    await editCapability(cap.id, fd)
    const after = await db.query.capabilities.findFirst({ where: eq(capabilities.id, cap.id) })
    expect(after?.status).toBe('published')
    const audit = await db.select().from(auditLog).where(and(
      eq(auditLog.entityId, cap.id),
      eq(auditLog.action, 'publish.acknowledged_incomplete'),
    ))
    expect(audit.length).toBe(1)
    const meta = audit[0].metadata as { missingFields: string[] }
    expect(meta.missingFields.length).toBeGreaterThan(0)
  })

  it('capability with domain + persona link publishes cleanly (no gate fire)', async () => {
    const [cap] = await db.insert(capabilities).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Cap Clean Publish',
      status: 'draft', visibility: 'org',
    }).returning()
    const [persona] = await db.insert(personas).values({
      id: randomUUID(), organizationId: orgId, name: 'Persona for Cap',
      status: 'draft', visibility: 'org',
    }).returning()
    await db.insert(capabilityPersonas).values({ capabilityId: cap.id, personaId: persona.id })

    mockAuth.mockResolvedValue(makeSession(user))
    const fd = new FormData()
    fd.set('name', 'Cap Clean Publish')
    fd.set('domain', 'Finance & Revenue')
    fd.set('status', 'published')
    fd.set('visibility', 'org')
    fd.append('personaIds', persona.id)
    await editCapability(cap.id, fd) // should not throw

    const after = await db.query.capabilities.findFirst({ where: eq(capabilities.id, cap.id) })
    expect(after?.status).toBe('published')
  })

  // ── End-to-end: application + persona + objective ───────────────────────

  it('editApplication publish with no capability link throws', async () => {
    const [app] = await db.insert(applications).values({
      id: randomUUID(), organizationId: orgId,
      name: 'App Pub Test', status: 'draft', visibility: 'org',
    }).returning()
    mockAuth.mockResolvedValue(makeSession(user))
    const fd = new FormData()
    fd.set('name', 'App Pub Test')
    fd.set('status', 'published')
    fd.set('lifecycleStatus', 'active')
    fd.set('visibility', 'org')
    await expect(editApplication(app.id, fd)).rejects.toThrow(PublishReadinessAcknowledgmentRequiredError)
  })

  it('editApplication publish with capability link succeeds', async () => {
    const [cap] = await db.insert(capabilities).values({
      id: randomUUID(), organizationId: orgId, name: 'Cap For App',
      status: 'draft', visibility: 'org',
    }).returning()
    const [app] = await db.insert(applications).values({
      id: randomUUID(), organizationId: orgId,
      name: 'App Pub Linked', status: 'draft', visibility: 'org',
    }).returning()
    await db.insert(applicationCapabilities).values({ applicationId: app.id, capabilityId: cap.id })

    mockAuth.mockResolvedValue(makeSession(user))
    const fd = new FormData()
    fd.set('name', 'App Pub Linked')
    fd.set('status', 'published')
    fd.set('lifecycleStatus', 'active')
    fd.set('visibility', 'org')
    fd.append('capabilityIds', cap.id)
    await editApplication(app.id, fd) // should not throw
  })

  it('editPersona publish with no description/type throws', async () => {
    const [persona] = await db.insert(personas).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Persona Pub Test', status: 'draft', visibility: 'org',
    }).returning()
    mockAuth.mockResolvedValue(makeSession(user))
    const fd = new FormData()
    fd.set('name', 'Persona Pub Test')
    fd.set('status', 'published')
    fd.set('visibility', 'org')
    await expect(editPersona(persona.id, fd)).rejects.toThrow(PublishReadinessAcknowledgmentRequiredError)
  })

  it('editObjective publish with no successMetric throws', async () => {
    const [obj] = await db.insert(strategicObjectives).values({
      id: randomUUID(), organizationId: orgId,
      name: 'Obj Pub Test', status: 'draft', visibility: 'org',
    }).returning()
    mockAuth.mockResolvedValue(makeSession(user))
    const fd = new FormData()
    fd.set('name', 'Obj Pub Test')
    fd.set('status', 'published')
    fd.set('visibility', 'org')
    await expect(editObjective(obj.id, fd)).rejects.toThrow(PublishReadinessAcknowledgmentRequiredError)
  })
})
