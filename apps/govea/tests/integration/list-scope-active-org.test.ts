/**
 * Integration tests: list views default to the active organization (#811)
 *
 * Org-scoped list queries (getCapabilities is the representative case — every
 * entity list shares the same `listScopeFilter` helper) must default to records
 * owned by the caller's active organization. Connected-org and instance-wide
 * records are only included when the caller explicitly requests `federated`
 * scope, and an org-private record from another org is never exposed either way.
 *
 * Coverage:
 *  - default scope → only the active org's records
 *  - federated scope → active org + connected + instance-wide, never another
 *    org's private records
 *  - switching the active organization changes the default result set
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { orgConnections } from '@/db/schema'
import { getCapabilities } from '@/actions/capabilities'
import { getGlossaryTerms } from '@/actions/glossary'
import {
  createTestOrg, createTestUser, cleanupOrg, insertCapability, insertGlossaryTerm, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

/** Session for a given identity with an explicit active organization. */
function sessionAs(user: TestUser, organizationId: string) {
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId, instanceRole: null },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  }
}

describe('list scope defaults to the active organization (#811)', () => {
  let orgA: string
  let orgB: string
  let user: TestUser // member of org A; we simulate switching their active org to B
  let aOwned: string
  let bConnections: string
  let bInstance: string
  let bOrgOnly: string
  let bGlossaryInstance: string

  beforeAll(async () => {
    const [a, b] = await Promise.all([createTestOrg(), createTestOrg()])
    orgA = a.id
    orgB = b.id
    user = await createTestUser(orgA, 'admin')

    // Active connection between A and B (federation discovery only matters at
    // federated scope).
    await db.insert(orgConnections).values({ fromOrgId: orgA, toOrgId: orgB, status: 'active' })

    ;[aOwned, bConnections, bInstance, bOrgOnly] = await Promise.all([
      insertCapability(orgA, { name: 'A-Owned', status: 'published', visibility: 'org' }).then(c => c.id),
      insertCapability(orgB, { name: 'B-Connections', status: 'published', visibility: 'connections' }).then(c => c.id),
      insertCapability(orgB, { name: 'B-Instance', status: 'published', visibility: 'instance' }).then(c => c.id),
      insertCapability(orgB, { name: 'B-OrgOnly', status: 'published', visibility: 'org' }).then(c => c.id),
    ])
    // Glossary is NOT a traceability entity, so it is excluded from the
    // active-org default — it stays federated.
    bGlossaryInstance = (await insertGlossaryTerm(orgB, { status: 'published', visibility: 'instance' })).id
  })

  afterAll(async () => {
    await cleanupOrg(orgA)
    await cleanupOrg(orgB)
  })

  it('default scope returns only the active org\'s records', async () => {
    mockAuth.mockResolvedValue(sessionAs(user, orgA))
    const ids = (await getCapabilities()).map(c => c.id)
    expect(ids).toContain(aOwned)
    expect(ids).not.toContain(bConnections)
    expect(ids).not.toContain(bInstance)
    expect(ids).not.toContain(bOrgOnly)
  })

  it('federated scope adds connected and instance-visible records, never another org\'s private records', async () => {
    mockAuth.mockResolvedValue(sessionAs(user, orgA))
    const ids = (await getCapabilities('federated')).map(c => c.id)
    expect(ids).toContain(aOwned)
    expect(ids).toContain(bConnections) // hidden by default, visible when broadened
    expect(ids).toContain(bInstance)    // hidden by default, visible when broadened
    expect(ids).not.toContain(bOrgOnly) // org-private to B — never exposed
  })

  it('non-traceable lists (glossary) are excluded — they stay federated by default', async () => {
    // Active in org A, no broader scope requested: the capabilities default is
    // org-only (asserted above), but glossary still surfaces org B's
    // instance-wide term because shared vocabulary is not a traceability entity.
    mockAuth.mockResolvedValue(sessionAs(user, orgA))
    const termIds = (await getGlossaryTerms()).map(t => t.id)
    expect(termIds).toContain(bGlossaryInstance)
  })

  it('switching the active organization changes the default list scope', async () => {
    // Same identity, now active in org B: the default list is org B's own
    // records (including its org-private one), and org A's records drop out.
    mockAuth.mockResolvedValue(sessionAs(user, orgB))
    const ids = (await getCapabilities()).map(c => c.id)
    expect(ids).toContain(bOrgOnly)
    expect(ids).toContain(bConnections)
    expect(ids).toContain(bInstance)
    expect(ids).not.toContain(aOwned)
  })
})
