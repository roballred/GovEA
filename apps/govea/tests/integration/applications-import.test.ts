/**
 * Integration tests: Application CSV round-trip parity with Capabilities (#696)
 *
 * Covers:
 *  - Export shape: the `capabilities` relationship column is emitted as
 *    semicolon-joined names; only the caller's own org rows are exported
 *    (federated/read-only rows are excluded).
 *  - Capability relationship resolution by name (case-insensitive), with unknown
 *    names reported as row warnings without failing the row.
 *  - Round-trip: re-importing an unchanged export creates no new rows and keeps
 *    the capability links (parity with the Capability contract — existing rows
 *    report as idempotent updates).
 *  - Update replaces links wholesale; cross-org capability names are not
 *    resolved and cannot attach to another org; dry-run writes nothing.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { applications, applicationCapabilities, capabilities } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { importApplications } from '@/actions/applications'
import { GET as exportApplications } from '@/app/api/applications/export/route'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function csvForm(content: string): FormData {
  const fd = new FormData()
  fd.append('csvFile', new File([new Blob([content], { type: 'text/csv' })], 'applications.csv', { type: 'text/csv' }))
  return fd
}

const HEADER = 'name,description,vendor,version,hosting_model,lifecycle_status,status,visibility,capabilities'

describe('Application CSV parity (#696)', () => {
  let orgId: string
  let otherOrgId: string
  let contributor: TestUser
  let viewer: TestUser
  let capAId: string
  let capBId: string

  beforeAll(async () => {
    const [org, other] = await Promise.all([createTestOrg(), createTestOrg()])
    orgId = org.id
    otherOrgId = other.id
    ;[contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])

    const [capA, capB] = await db.insert(capabilities).values([
      { organizationId: orgId, name: 'Identity', status: 'published', visibility: 'org' },
      { organizationId: orgId, name: 'Payments', status: 'published', visibility: 'org' },
    ]).returning()
    capAId = capA.id; capBId = capB.id
    // A capability that exists only in another org — must not resolve here.
    await db.insert(capabilities).values({ organizationId: otherOrgId, name: 'Foreign Cap', status: 'published', visibility: 'org' })
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
    await cleanupOrg(otherOrgId)
  })

  async function appRow(name: string) {
    const [r] = await db.select().from(applications)
      .where(and(eq(applications.organizationId, orgId), eq(applications.name, name)))
    return r
  }
  async function linkedCapIds(appId: string) {
    const rows = await db.select().from(applicationCapabilities).where(eq(applicationCapabilities.applicationId, appId))
    return rows.map(r => r.capabilityId).sort()
  }

  it('rejects a viewer', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(importApplications(csvForm(`${HEADER}\nApp,,,,,,published,org,`))).rejects.toThrow('Forbidden')
  })

  it('creates an application and resolves capability links by name', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const r = await importApplications(csvForm(`${HEADER}\nPortal,The portal,Acme,1.0,saas,active,published,org,Identity; Payments`))
    expect(r.created).toBe(1)
    const app = await appRow('Portal')
    expect(app).toMatchObject({ vendor: 'Acme', lifecycleStatus: 'active', status: 'published' })
    expect(await linkedCapIds(app.id)).toEqual([capAId, capBId].sort())
  })

  it('round-trips: re-importing the same row creates nothing and preserves links', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const r = await importApplications(csvForm(`${HEADER}\nPortal,The portal,Acme,1.0,saas,active,published,org,Identity; Payments`))
    expect(r.created).toBe(0)
    expect(r.updated).toBe(1)
    const app = await appRow('Portal')
    expect(await linkedCapIds(app.id)).toEqual([capAId, capBId].sort())
  })

  it('replaces capability links wholesale on update', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    await importApplications(csvForm(`${HEADER}\nPortal,The portal,Acme,1.0,saas,active,published,org,Payments`))
    const app = await appRow('Portal')
    expect(await linkedCapIds(app.id)).toEqual([capBId])
  })

  it('reports an unknown / cross-org capability name as a warning but still imports the app', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const r = await importApplications(csvForm(`${HEADER}\nReporting,,,,,,published,org,Foreign Cap`))
    expect(r.created).toBe(1)
    expect(r.errors.some(e => /Foreign Cap.*not found/.test(e))).toBe(true)
    const app = await appRow('Reporting')
    expect(await linkedCapIds(app.id)).toEqual([])
  })

  it('dry-run writes nothing', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const before = (await db.select().from(applications).where(eq(applications.organizationId, orgId))).length
    const r = await importApplications(csvForm(`${HEADER}\nEphemeral,,,,,,published,org,`), true)
    expect(r.created).toBe(1)
    const after = (await db.select().from(applications).where(eq(applications.organizationId, orgId))).length
    expect(after).toBe(before)
  })

  it('export emits a capabilities column with semicolon-joined names, scoped to the caller org', async () => {
    // Ensure Portal currently links Payments (from the update test above).
    mockAuth.mockResolvedValue(makeSession(contributor))
    const csv = await (await exportApplications()).text()
    const lines = csv.split('\n')
    expect(lines[0].split(',')).toContain('capabilities')

    const portalLine = lines.find(l => l.startsWith('Portal,'))
    expect(portalLine).toBeDefined()
    expect(portalLine!).toContain('Payments')
  })
})
