/**
 * Completeness signals (#380 PR-3).
 *
 * Asserts:
 *   - getCategorizedSignals returns counts that match what we seeded for
 *     stale / unpublished / incomplete-relationship cases.
 *   - getMostNeededActions:
 *       - returns at most 5 items
 *       - is deterministic given identical inputs
 *       - applies the publishedButStale > incompleteRelationship > unpublished
 *         priority via rankingWeights from settings
 *       - dedupes a single entity that hits multiple buckets to its highest
 *         scoring reason
 *   - getDomainRagBuckets buckets per `domainTargets` correctly
 *     (green ≥ target, amber within 15 below, red >15 below, neutral if no
 *     target).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  capabilities, applications, personas,
  applicationCapabilities, capabilityPersonas,
  organizations,
  DEFAULT_COMPLETENESS_SETTINGS,
} from '@/db/schema'
import {
  getCategorizedSignals,
  getMostNeededActions,
  getDomainRagBuckets,
} from '@/lib/completeness-signals'
import { createTestOrg, cleanupOrg, type TestOrg } from './helpers/db'

const STALE_DAYS = 90
const PAST_STALE = new Date(Date.now() - (STALE_DAYS + 5) * 24 * 60 * 60 * 1000)

let org: TestOrg

beforeAll(async () => {
  org = await createTestOrg({ name: 'Signals Org', slug: `sig-${randomUUID().slice(0, 8)}` })
  await db.update(organizations)
    .set({ completenessSettings: DEFAULT_COMPLETENESS_SETTINGS })
    .where(eq(organizations.id, org.id))
})

afterAll(async () => {
  await cleanupOrg(org.id)
})

beforeEach(async () => {
  // Clean slate inside the org between tests
  await db.delete(applicationCapabilities)
  await db.delete(capabilityPersonas)
  await db.delete(capabilities).where(eq(capabilities.organizationId, org.id))
  await db.delete(applications).where(eq(applications.organizationId, org.id))
  await db.delete(personas).where(eq(personas.organizationId, org.id))
})

// ── Helpers ──────────────────────────────────────────────────────────────────

async function insertCap(name: string, opts: {
  status?: 'draft' | 'published' | 'archived'
  domain?: string
  updatedAt?: Date
} = {}) {
  const id = randomUUID()
  await db.insert(capabilities).values({
    id,
    organizationId: org.id,
    name,
    domain: opts.domain ?? null,
    status: opts.status ?? 'published',
    visibility: 'org',
    updatedAt: opts.updatedAt ?? new Date(),
  })
  return id
}

async function insertApp(name: string, opts: { status?: 'draft' | 'published'; updatedAt?: Date } = {}) {
  const id = randomUUID()
  await db.insert(applications).values({
    id,
    organizationId: org.id,
    name,
    status: opts.status ?? 'published',
    visibility: 'org',
    updatedAt: opts.updatedAt ?? new Date(),
  })
  return id
}

async function insertPersona(name: string, opts: { status?: 'draft' | 'published'; updatedAt?: Date } = {}) {
  const id = randomUUID()
  await db.insert(personas).values({
    id,
    organizationId: org.id,
    name,
    status: opts.status ?? 'published',
    visibility: 'org',
    updatedAt: opts.updatedAt ?? new Date(),
  })
  return id
}

// ── getCategorizedSignals ────────────────────────────────────────────────────

describe('getCategorizedSignals', () => {
  it('counts stale published items past the staleness window', async () => {
    await insertCap('Fresh', { updatedAt: new Date() })
    await insertCap('Stale-1', { updatedAt: PAST_STALE })
    await insertCap('Stale-2', { updatedAt: PAST_STALE })
    await insertApp('Stale-App', { updatedAt: PAST_STALE })

    const signals = await getCategorizedSignals(org.id)
    expect(signals.stale).toBe(3)
  })

  it('counts unpublished drafts', async () => {
    await insertCap('Draft-Cap', { status: 'draft' })
    await insertCap('Published-Cap', { status: 'published' })
    await insertApp('Draft-App', { status: 'draft' })
    await insertPersona('Draft-Persona', { status: 'draft' })

    const signals = await getCategorizedSignals(org.id)
    expect(signals.unpublished).toBe(3)
  })

  it('counts capabilities with missing application or persona links', async () => {
    const cap1 = await insertCap('Cap-Linked')
    const cap2 = await insertCap('Cap-NoApp')      // missing app link
    const cap3 = await insertCap('Cap-NoPersona')  // missing persona link
    const _cap4 = await insertCap('Cap-NeitherLink') // missing both
    const app = await insertApp('App-1')
    const persona = await insertPersona('Persona-1')

    // Cap1: linked to both
    await db.insert(applicationCapabilities).values({ applicationId: app, capabilityId: cap1 })
    await db.insert(capabilityPersonas).values({ capabilityId: cap1, personaId: persona })
    // Cap2: only persona
    await db.insert(capabilityPersonas).values({ capabilityId: cap2, personaId: persona })
    // Cap3: only app
    await db.insert(applicationCapabilities).values({ applicationId: app, capabilityId: cap3 })
    // Cap4: no links

    const signals = await getCategorizedSignals(org.id)
    // Cap2 contributes via the no-app side; Cap3 via the no-persona side;
    // Cap4 contributes to both. Total = 1 (no-app: Cap2 + Cap4 = 2) + (no-persona: Cap3 + Cap4 = 2) = 4
    expect(signals.incompleteRelationships).toBe(4)
  })

  it('returns zeros for an empty org', async () => {
    const signals = await getCategorizedSignals(org.id)
    expect(signals).toEqual({ stale: 0, unpublished: 0, incompleteRelationships: 0, openDebt: 0 })
  })
})

// ── getMostNeededActions ─────────────────────────────────────────────────────

describe('getMostNeededActions', () => {
  it('returns at most 5 items', async () => {
    for (let i = 0; i < 10; i++) {
      await insertCap(`Stale-${i}`, { updatedAt: PAST_STALE })
    }
    const actions = await getMostNeededActions(org.id)
    expect(actions.length).toBe(5)
  })

  it('is deterministic for identical inputs', async () => {
    await insertCap('A', { status: 'draft' })
    await insertCap('B', { status: 'draft' })
    await insertCap('C', { updatedAt: PAST_STALE })

    const a = await getMostNeededActions(org.id)
    const b = await getMostNeededActions(org.id)
    expect(a.map(x => x.key)).toEqual(b.map(x => x.key))
  })

  it('ranks publishedButStale (weight 3) above unpublished (weight 1)', async () => {
    await insertCap('Z-Stale', { updatedAt: PAST_STALE })
    await insertCap('A-Draft', { status: 'draft' })

    const actions = await getMostNeededActions(org.id)
    expect(actions[0].name).toBe('Z-Stale')
    expect(actions[0].reason).toBe('publishedButStale')
    expect(actions[1].name).toBe('A-Draft')
    expect(actions[1].reason).toBe('unpublished')
  })

  it('ranks incompleteRelationship (weight 2) above unpublished (weight 1)', async () => {
    const cap = await insertCap('Z-NoLinks') // published but no links → incomplete
    await insertCap('A-Draft', { status: 'draft' })

    const actions = await getMostNeededActions(org.id)
    // Z-NoLinks has the higher score
    expect(actions[0].entityId).toBe(cap)
    expect(actions[0].reason).toBe('incompleteRelationship')
  })

  it('dedupes one item to its highest-scoring reason', async () => {
    // A capability that is BOTH published-but-stale AND missing relationships
    // — should only appear once, with the higher-scoring reason
    await insertCap('Multi', { updatedAt: PAST_STALE }) // published, no links
    const actions = await getMostNeededActions(org.id)
    const multiActions = actions.filter(a => a.name === 'Multi')
    expect(multiActions).toHaveLength(1)
    expect(multiActions[0].reason).toBe('publishedButStale') // weight 3 > weight 2
  })

  it('sorts ties alphabetically by entityType then name', async () => {
    // Two stale items with the same score, different entityTypes
    await insertCap('Z-Cap', { updatedAt: PAST_STALE })
    await insertApp('A-App', { updatedAt: PAST_STALE })

    const actions = await getMostNeededActions(org.id)
    // application < capability alphabetically, so A-App ranks first on tie
    expect(actions[0].entityType).toBe('application')
    expect(actions[1].entityType).toBe('capability')
  })
})

// ── getDomainRagBuckets ──────────────────────────────────────────────────────

describe('getDomainRagBuckets', () => {
  beforeEach(async () => {
    // Set domain targets: 'cms' = 60, 'ea' = 80, 'finance' has no target
    await db.update(organizations)
      .set({
        completenessSettings: {
          ...DEFAULT_COMPLETENESS_SETTINGS,
          domainTargets: { cms: 60, ea: 80 },
        },
      })
      .where(eq(organizations.id, org.id))
  })

  it('green when published-rate ≥ target', async () => {
    await insertCap('A', { domain: 'cms', status: 'published' })
    await insertCap('B', { domain: 'cms', status: 'published' })
    await insertCap('C', { domain: 'cms', status: 'draft' })
    // 2/3 ≈ 67% ≥ 60 → green

    const buckets = await getDomainRagBuckets(org.id)
    const cms = buckets.find(b => b.domain === 'cms')
    expect(cms?.bucket).toBe('green')
    expect(cms?.publishedPct).toBe(67)
  })

  it('amber when within 15 points below target', async () => {
    await insertCap('A', { domain: 'ea', status: 'published' })
    await insertCap('B', { domain: 'ea', status: 'published' })
    await insertCap('C', { domain: 'ea', status: 'draft' })
    // 2/3 ≈ 67%; target 80 → 13 below → amber

    const buckets = await getDomainRagBuckets(org.id)
    expect(buckets.find(b => b.domain === 'ea')?.bucket).toBe('amber')
  })

  it('red when more than 15 points below target', async () => {
    await insertCap('A', { domain: 'ea', status: 'draft' })
    await insertCap('B', { domain: 'ea', status: 'draft' })
    await insertCap('C', { domain: 'ea', status: 'draft' })
    // 0/3 = 0%; target 80 → 80 below → red

    const buckets = await getDomainRagBuckets(org.id)
    expect(buckets.find(b => b.domain === 'ea')?.bucket).toBe('red')
  })

  it('neutral when no target is set for the domain', async () => {
    await insertCap('A', { domain: 'finance', status: 'published' })
    const buckets = await getDomainRagBuckets(org.id)
    expect(buckets.find(b => b.domain === 'finance')?.bucket).toBe('neutral')
  })
})
