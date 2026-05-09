/**
 * Regression test: read actions ignore caller-supplied parameters and source
 * orgId / role from the session (#422).
 *
 * Locks in the contract established by #411–#414: every read server action
 * derives `organizationId` from the authenticated session, never from
 * caller-controlled input. A future change that reintroduces a
 * caller-supplied `organizationId` parameter will break compilation here
 * (because these tests call the actions with their declared signatures);
 * a change that *honors* a sneaky caller-supplied value while still
 * scoping by session orgId will be caught by the cross-tenant assertions
 * below.
 *
 * Specifically asserts:
 *   - getUsers — Org A admin sees only Org A users; passwordHash is NEVER
 *     present in the response shape; non-admins are rejected
 *   - getCapabilities — Org A user sees only Org A's private capabilities;
 *     Org B's private capabilities are absent
 *   - getOtherOrganizations — admin can list other orgs; viewer is rejected
 *   - getConnections — Org A user sees only connections involving Org A;
 *     a connection between Org B and Org C is invisible
 *   - getTaxonomyTerms — Org A user sees only Org A's terms (representative
 *     of the broader taxonomy.ts pattern)
 *
 * If you add a new read action that returns org-scoped data, add a
 * cross-tenant scoping case here. This file is the canonical pattern.
 *
 * Capability: iam-tenant-isolation, iam-role-based-access-control
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  capabilities,
  orgConnections,
  taxonomyTerms,
} from '@/db/schema'
import { getUsers } from '@/actions/users'
import { getCapabilities } from '@/actions/capabilities'
import { getConnections, getOtherOrganizations } from '@/actions/connections'
import { getTaxonomyTerms } from '@/actions/taxonomy'
import {
  createTestOrg,
  createTestUser,
  cleanupOrg,
  makeSession,
  type TestOrg,
  type TestUser,
} from '../helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let orgA: TestOrg
let orgB: TestOrg
let orgC: TestOrg
let adminA: TestUser
let viewerA: TestUser
let adminB: TestUser
// Track ad-hoc rows for cleanup
let connectionAB: string
let connectionBC: string

beforeAll(async () => {
  ;[orgA, orgB, orgC] = await Promise.all([
    createTestOrg({ name: 'Iso Org A', slug: `iso-a-${randomUUID().slice(0, 8)}` }),
    createTestOrg({ name: 'Iso Org B', slug: `iso-b-${randomUUID().slice(0, 8)}` }),
    createTestOrg({ name: 'Iso Org C', slug: `iso-c-${randomUUID().slice(0, 8)}` }),
  ])

  ;[adminA, viewerA, adminB] = await Promise.all([
    createTestUser(orgA.id, 'admin', { name: 'Iso Admin A' }),
    createTestUser(orgA.id, 'viewer', { name: 'Iso Viewer A' }),
    createTestUser(orgB.id, 'admin', { name: 'Iso Admin B' }),
  ])

  // Capabilities (private to each org, default visibility='org')
  await db.insert(capabilities).values([
    { id: randomUUID(), organizationId: orgA.id, name: 'A-Private-Cap', status: 'published', visibility: 'org' },
    { id: randomUUID(), organizationId: orgB.id, name: 'B-Private-Cap', status: 'published', visibility: 'org' },
  ])

  // Taxonomy terms — one root per org so we can assert no cross-tenant leakage
  await db.insert(taxonomyTerms).values([
    { id: randomUUID(), organizationId: orgA.id, name: 'A-Term', slug: `a-term-${randomUUID().slice(0, 8)}`, domain: 'principle' },
    { id: randomUUID(), organizationId: orgB.id, name: 'B-Term', slug: `b-term-${randomUUID().slice(0, 8)}`, domain: 'principle' },
  ])

  // Connections: A↔B (caller's org is involved); B↔C (caller's org is NOT involved)
  const [connAB] = await db.insert(orgConnections).values({
    fromOrgId: orgA.id,
    toOrgId: orgB.id,
    status: 'active',
  }).returning()
  connectionAB = connAB.id

  const [connBC] = await db.insert(orgConnections).values({
    fromOrgId: orgB.id,
    toOrgId: orgC.id,
    status: 'active',
  }).returning()
  connectionBC = connBC.id
})

afterAll(async () => {
  // Connections reference orgs by FK; delete them first so org cleanup can cascade cleanly.
  await db.delete(orgConnections).where(inArray(orgConnections.id, [connectionAB, connectionBC]))

  await Promise.all([
    cleanupOrg(orgA.id),
    cleanupOrg(orgB.id),
    cleanupOrg(orgC.id),
  ])
})

function asUser(user: TestUser, instanceRole: 'instance_admin' | null = null) {
  mockAuth.mockResolvedValue(makeSession(user, { instanceRole }))
}

// ── getUsers ────────────────────────────────────────────────────────────────

describe('getUsers — tenant isolation + secret hygiene', () => {
  it('returns only the caller orgs users (Org A admin sees no Org B users)', async () => {
    asUser(adminA)
    const rows = await getUsers()
    const ids = rows.map(u => u.id)
    expect(ids).toContain(adminA.id)
    expect(ids).toContain(viewerA.id)
    expect(ids).not.toContain(adminB.id)
  })

  it('NEVER returns passwordHash in the response shape', async () => {
    asUser(adminA)
    const rows = await getUsers()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(Object.keys(row)).not.toContain('passwordHash')
      // Defense in depth: even an accidentally-spread row should not carry it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((row as any).passwordHash).toBeUndefined()
    }
  })

  it('rejects non-admin callers (Forbidden)', async () => {
    asUser(viewerA)
    await expect(getUsers()).rejects.toThrow('Forbidden')
  })
})

// ── getCapabilities ────────────────────────────────────────────────────────

describe('getCapabilities — tenant isolation', () => {
  it('returns Org A capabilities and not Org B private capabilities', async () => {
    asUser(adminA)
    const rows = await getCapabilities()
    const names = rows.map(c => c.name)
    expect(names).toContain('A-Private-Cap')
    expect(names).not.toContain('B-Private-Cap')
  })

  it('Org B admin does not see Org A private capabilities', async () => {
    asUser(adminB)
    const rows = await getCapabilities()
    const names = rows.map(c => c.name)
    expect(names).toContain('B-Private-Cap')
    expect(names).not.toContain('A-Private-Cap')
  })

  it('every returned row is scoped to a permitted org (own / connected / instance-wide)', async () => {
    asUser(adminA)
    const rows = await getCapabilities()
    // A↔B is a connection; A may legitimately see B's `connections` or `instance`
    // visibility caps — but never B's `org`-scoped private caps.
    for (const row of rows) {
      if (row.organizationId !== orgA.id) {
        expect(['connections', 'instance']).toContain(row.visibility)
      }
    }
  })
})

// ── getOtherOrganizations ─────────────────────────────────────────────────

describe('getOtherOrganizations — admin gate', () => {
  it('admin sees other orgs (excluding their own)', async () => {
    asUser(adminA)
    const rows = await getOtherOrganizations()
    const ids = rows.map(o => o.id)
    expect(ids).not.toContain(orgA.id)
    expect(ids).toContain(orgB.id)
    expect(ids).toContain(orgC.id)
  })

  it('viewer is rejected (Forbidden)', async () => {
    asUser(viewerA)
    await expect(getOtherOrganizations()).rejects.toThrow('Forbidden')
  })
})

// ── getConnections ─────────────────────────────────────────────────────────

describe('getConnections — tenant isolation', () => {
  it('Org A user sees A↔B but not B↔C', async () => {
    asUser(adminA)
    const rows = await getConnections()
    const ids = rows.map(c => c.id)
    expect(ids).toContain(connectionAB)
    expect(ids).not.toContain(connectionBC)
  })

  it('Org C user sees B↔C but not A↔B', async () => {
    // Make a viewer for orgC so we can also confirm anonymous-ish callers
    // see scoped data (getConnections has no role check beyond auth presence)
    const viewerC = await createTestUser(orgC.id, 'viewer', { name: 'Iso Viewer C' })
    try {
      asUser(viewerC)
      const rows = await getConnections()
      const ids = rows.map(c => c.id)
      expect(ids).toContain(connectionBC)
      expect(ids).not.toContain(connectionAB)
    } finally {
      // Inline cleanup so we don't leak a user across the suite
      const { eq } = await import('drizzle-orm')
      const { users } = await import('@/db/schema')
      await db.delete(users).where(eq(users.id, viewerC.id))
    }
  })
})

// ── getTaxonomyTerms (representative taxonomy.ts pattern) ─────────────────

describe('getTaxonomyTerms — tenant isolation', () => {
  it('Org A sees A-Term and not B-Term', async () => {
    asUser(adminA)
    const rows = await getTaxonomyTerms()
    const names = rows.map(t => t.name)
    expect(names).toContain('A-Term')
    expect(names).not.toContain('B-Term')
  })

  it('Org B sees B-Term and not A-Term', async () => {
    asUser(adminB)
    const rows = await getTaxonomyTerms()
    const names = rows.map(t => t.name)
    expect(names).toContain('B-Term')
    expect(names).not.toContain('A-Term')
  })
})
