/**
 * Integration tests: getApplicationImpactAnalysis (#578)
 *
 * Covers the five computational concerns that make this view non-trivial:
 *
 *   - Orphan candidates: a capability is flagged as orphan only when NO
 *     other non-decommissioned app supports it.
 *   - Replacement detection: an initiative that has impact=retire on the
 *     source app AND impact=build on another app sharing a capability
 *     surfaces as a replacement candidate.
 *   - Coverage-sharers: other live apps serving the same capabilities
 *     show up, but apps already classified as replacements don't appear
 *     in both lists.
 *   - Services: appear via the capability bridge.
 *   - Recent changes: include the app, linked caps, linked initiatives,
 *     linked ADRs; respect the 30-day window.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  applications, applicationCapabilities, capabilities, initiatives,
  initiativeApplications, adrs, adrApplications, services, serviceCapabilities,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { writeAuditLog } from '@/lib/audit'
import { getApplicationImpactAnalysis } from '@/actions/impact-analysis'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

async function seedApp(orgId: string, name: string, lifecycle: 'active' | 'planned' | 'sunset' | 'decommissioned' = 'active') {
  const [row] = await db.insert(applications).values({
    id: randomUUID(), organizationId: orgId, name,
    lifecycleStatus: lifecycle, status: 'published', visibility: 'org',
  }).returning()
  return row.id
}

async function seedCap(orgId: string, name: string) {
  const [row] = await db.insert(capabilities).values({
    id: randomUUID(), organizationId: orgId, name,
    status: 'published', visibility: 'org',
  }).returning()
  return row.id
}

async function linkAppCap(appId: string, capId: string) {
  await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
}

async function seedInitiative(orgId: string, name: string, status: 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled' = 'active') {
  const [row] = await db.insert(initiatives).values({
    id: randomUUID(), organizationId: orgId, name, status, visibility: 'org',
  }).returning()
  return row.id
}

async function linkInitApp(initId: string, appId: string, impact: string) {
  await db.insert(initiativeApplications).values({ initiativeId: initId, applicationId: appId, impact })
}

async function seedAdr(orgId: string, number: string, title: string) {
  const [row] = await db.insert(adrs).values({
    id: randomUUID(), organizationId: orgId, number, title,
    status: 'accepted', visibility: 'org',
  }).returning()
  return row.id
}

async function seedService(orgId: string, name: string) {
  const [row] = await db.insert(services).values({
    id: randomUUID(), organizationId: orgId, name,
    status: 'published', visibility: 'org',
  }).returning()
  return row.id
}

describe('getApplicationImpactAnalysis (#578)', () => {
  let orgId: string
  let admin: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    admin = await createTestUser(orgId, 'admin')
    mockAuth.mockResolvedValue(makeSession(admin))
  })

  afterAll(() => cleanupOrg(orgId))

  it('returns null for an unknown application id', async () => {
    expect(await getApplicationImpactAnalysis(randomUUID())).toBeNull()
  })

  it('returns null for an application in another org', async () => {
    const otherOrg = await createTestOrg()
    try {
      const foreignAppId = await seedApp(otherOrg.id, 'Foreign App')
      expect(await getApplicationImpactAnalysis(foreignAppId)).toBeNull()
    } finally {
      await cleanupOrg(otherOrg.id)
    }
  })

  it('flags a capability as an orphan candidate when only this app supports it', async () => {
    const capId = await seedCap(orgId, 'Solo Capability')
    const appId = await seedApp(orgId, 'Solo App')
    await linkAppCap(appId, capId)

    const analysis = await getApplicationImpactAnalysis(appId)
    expect(analysis).toBeDefined()
    expect(analysis!.capabilities).toHaveLength(1)
    expect(analysis!.capabilities[0]).toMatchObject({
      name: 'Solo Capability',
      otherSupportingAppCount: 0,
      isOrphanCandidate: true,
    })
    expect(analysis!.summary.orphanCount).toBe(1)
  })

  it('does NOT flag a capability when another live app also supports it', async () => {
    const capId = await seedCap(orgId, 'Shared Capability')
    const sourceApp = await seedApp(orgId, 'Shared App Source')
    const otherApp = await seedApp(orgId, 'Shared App Other', 'active')
    await linkAppCap(sourceApp, capId)
    await linkAppCap(otherApp, capId)

    const analysis = await getApplicationImpactAnalysis(sourceApp)
    expect(analysis!.capabilities[0].otherSupportingAppCount).toBe(1)
    expect(analysis!.capabilities[0].isOrphanCandidate).toBe(false)
  })

  it('ignores decommissioned other-apps when computing orphans', async () => {
    const capId = await seedCap(orgId, 'Decom-Other Capability')
    const sourceApp = await seedApp(orgId, 'Decom-Other Source')
    const decomApp = await seedApp(orgId, 'Decom-Other Old', 'decommissioned')
    await linkAppCap(sourceApp, capId)
    await linkAppCap(decomApp, capId)

    const analysis = await getApplicationImpactAnalysis(sourceApp)
    // The decommissioned app doesn't count; this is an orphan candidate.
    expect(analysis!.capabilities[0].otherSupportingAppCount).toBe(0)
    expect(analysis!.capabilities[0].isOrphanCandidate).toBe(true)
  })

  it('detects a replacement when an initiative retires this app and builds another for a shared capability', async () => {
    const capId = await seedCap(orgId, 'Replaced Capability')
    const legacyApp = await seedApp(orgId, 'Legacy App')
    const newApp = await seedApp(orgId, 'New App')
    await linkAppCap(legacyApp, capId)
    await linkAppCap(newApp, capId)

    const initId = await seedInitiative(orgId, 'Migration Initiative', 'active')
    await linkInitApp(initId, legacyApp, 'retire')
    await linkInitApp(initId, newApp, 'build')

    const analysis = await getApplicationImpactAnalysis(legacyApp)
    expect(analysis!.replacements).toHaveLength(1)
    expect(analysis!.replacements[0]).toMatchObject({
      initiativeName: 'Migration Initiative',
      replacementAppName: 'New App',
      capabilityName: 'Replaced Capability',
    })
    expect(analysis!.summary.replacementInProgress).toBe(true)
  })

  it('does not double-list a replacement app under coverage-sharers', async () => {
    // Continues from the previous test's fixture set — the New App that is a
    // replacement should NOT also appear in coverage-sharers for legacyApp.
    const legacyApp = (await db.query.applications.findFirst({
      where: and(eq(applications.organizationId, orgId), eq(applications.name, 'Legacy App')),
    }))!.id

    const analysis = await getApplicationImpactAnalysis(legacyApp)
    expect(analysis!.coverageSharers.find(s => s.name === 'New App')).toBeUndefined()
  })

  it('surfaces services routed through linked capabilities', async () => {
    const capId = await seedCap(orgId, 'Service-Bearing Capability')
    const appId = await seedApp(orgId, 'Service-Bearing App')
    await linkAppCap(appId, capId)

    const svcId = await seedService(orgId, 'Resident Permit Lookup')
    await db.insert(serviceCapabilities).values({ serviceId: svcId, capabilityId: capId })

    const analysis = await getApplicationImpactAnalysis(appId)
    expect(analysis!.services).toHaveLength(1)
    expect(analysis!.services[0]).toMatchObject({
      name: 'Resident Permit Lookup',
      viaCapabilities: [{ name: 'Service-Bearing Capability' }],
    })
    expect(analysis!.summary.serviceCount).toBe(1)
  })

  it('lists referencing ADRs', async () => {
    const appId = await seedApp(orgId, 'ADR-Linked App')
    const adrId = await seedAdr(orgId, 'TEST-ADR-001', 'Authentication for ADR-Linked App')
    await db.insert(adrApplications).values({ adrId, applicationId: appId })

    const analysis = await getApplicationImpactAnalysis(appId)
    expect(analysis!.adrs).toHaveLength(1)
    expect(analysis!.adrs[0].title).toBe('Authentication for ADR-Linked App')
  })

  it('returns initiatives touching this app with their impact label', async () => {
    const appId = await seedApp(orgId, 'Initiative-Touched App')
    const initId = await seedInitiative(orgId, 'Future Improvement', 'proposed')
    await linkInitApp(initId, appId, 'improve')

    const analysis = await getApplicationImpactAnalysis(appId)
    expect(analysis!.initiatives).toHaveLength(1)
    expect(analysis!.initiatives[0]).toMatchObject({
      name: 'Future Improvement',
      impact: 'improve',
      status: 'proposed',
    })
  })

  it('hides proposed initiatives from viewer-role callers (status gate parity)', async () => {
    // Re-use the previous fixture by name (proposed initiative on Initiative-Touched App).
    const viewer = await createTestUser(orgId, 'viewer')
    const appId = (await db.query.applications.findFirst({
      where: and(eq(applications.organizationId, orgId), eq(applications.name, 'Initiative-Touched App')),
    }))!.id

    mockAuth.mockResolvedValue(makeSession(viewer))
    try {
      const analysis = await getApplicationImpactAnalysis(appId)
      expect(analysis!.initiatives.find(i => i.name === 'Future Improvement')).toBeUndefined()
    } finally {
      mockAuth.mockResolvedValue(makeSession(admin))
    }
  })

  it('includes recent audit events for this app and linked entities within the 30-day window', async () => {
    const appId = await seedApp(orgId, 'Auditable App')
    const capId = await seedCap(orgId, 'Auditable Capability')
    await linkAppCap(appId, capId)

    // Write one audit event on the app itself, and one on the linked capability.
    await writeAuditLog(db, {
      action: 'application.edit', entityType: 'application', entityId: appId,
      userId: admin.id, organizationId: orgId, after: { name: 'Auditable App' },
    })
    await writeAuditLog(db, {
      action: 'capability.edit', entityType: 'capability', entityId: capId,
      userId: admin.id, organizationId: orgId, after: { name: 'Auditable Capability' },
    })

    const analysis = await getApplicationImpactAnalysis(appId)
    const actions = analysis!.recentChanges.map(c => c.action).sort()
    expect(actions).toContain('application.edit')
    expect(actions).toContain('capability.edit')
    expect(analysis!.summary.recentChangeCount).toBeGreaterThanOrEqual(2)
  })
})
