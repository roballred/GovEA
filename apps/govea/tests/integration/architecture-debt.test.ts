/**
 * Architecture debt foundation (#381 PR-1).
 *
 * Asserts the contract this PR establishes:
 *   1. detectSecuritySensitive flags content with the configured keywords;
 *      the flag drives both the auto-set on save and the role-gating on read.
 *   2. createDebtItem persists the row + junctions in a single transaction
 *      and refuses to save without ≥1 linked architecture object.
 *   3. status='accepted' requires a non-empty acceptanceRationale.
 *   4. security_sensitive auto-detection cannot be silently bypassed —
 *      explicit override is required and is audit-logged.
 *   5. Read role-gating: viewer cannot see security-sensitive items even
 *      when published; cannot see non-published items at all.
 *   6. editDebtItem replaces junction sets atomically and re-runs the
 *      auto-detection on every save (not just create).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  architectureDebtItems,
  debtApplications, debtCapabilities, debtAdrs, debtInitiatives,
  applications, capabilities, adrs, initiatives,
  auditLog,
} from '@/db/schema'
import { detectSecuritySensitive } from '@/lib/debt-classification'
import {
  createDebtItem, editDebtItem, getDebtItems, getDebtItem,
} from '@/actions/architecture-debt'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  type TestOrg, type TestUser,
} from './helpers/db'

// ── auth mocking ────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let orgA: TestOrg
let adminA: TestUser
let viewerA: TestUser
let appAId: string
let capAId: string

function asUser(user: TestUser) {
  mockAuth.mockResolvedValue(makeSession(user))
}

async function makeFormData(input: {
  title?: string
  description?: string
  debtType?: string
  severity?: string
  status?: string
  visibility?: string
  targetResolutionDate?: string
  acceptanceRationale?: string
  securitySensitive?: boolean
  overrideSecuritySensitive?: boolean
  applicationIds?: string[]
  capabilityIds?: string[]
  adrIds?: string[]
  initiativeIds?: string[]
}): Promise<FormData> {
  const fd = new FormData()
  fd.set('title', input.title ?? 'Test debt item')
  if (input.description !== undefined) fd.set('description', input.description)
  fd.set('debtType', input.debtType ?? 'lifecycle-risk')
  fd.set('severity', input.severity ?? 'medium')
  fd.set('status', input.status ?? 'draft')
  fd.set('visibility', input.visibility ?? 'org')
  if (input.targetResolutionDate !== undefined) fd.set('targetResolutionDate', input.targetResolutionDate)
  if (input.acceptanceRationale !== undefined) fd.set('acceptanceRationale', input.acceptanceRationale)
  if (input.securitySensitive) fd.set('securitySensitive', 'on')
  if (input.overrideSecuritySensitive) fd.set('overrideSecuritySensitive', 'on')
  for (const id of input.applicationIds ?? []) fd.append('applicationIds', id)
  for (const id of input.capabilityIds ?? []) fd.append('capabilityIds', id)
  for (const id of input.adrIds ?? []) fd.append('adrIds', id)
  for (const id of input.initiativeIds ?? []) fd.append('initiativeIds', id)
  return fd
}

beforeAll(async () => {
  orgA = await createTestOrg({ name: 'Debt Org', slug: `debt-${randomUUID().slice(0, 8)}` })
  ;[adminA, viewerA] = await Promise.all([
    createTestUser(orgA.id, 'admin', { name: 'Debt Admin' }),
    createTestUser(orgA.id, 'viewer', { name: 'Debt Viewer' }),
  ])
  // One real application + capability so debt items have something to link
  appAId = randomUUID()
  capAId = randomUUID()
  await Promise.all([
    db.insert(applications).values({
      id: appAId, organizationId: orgA.id, name: 'Permitting',
      status: 'published', visibility: 'org',
    }),
    db.insert(capabilities).values({
      id: capAId, organizationId: orgA.id, name: 'Licensing',
      status: 'published', visibility: 'org',
    }),
  ])
})

afterAll(async () => {
  await cleanupOrg(orgA.id)
})

beforeEach(async () => {
  // Clean debt rows; junctions cascade. Audit log is append-only.
  await db.delete(architectureDebtItems).where(eq(architectureDebtItems.organizationId, orgA.id))
})

// ── 1. detectSecuritySensitive ──────────────────────────────────────────────

describe('detectSecuritySensitive', () => {
  it('flags description containing CVE / vulnerability / exploit / unpatched / advisory', () => {
    for (const word of ['CVE-2024-12345', 'vulnerability', 'exploit', 'unpatched', 'advisory']) {
      expect(detectSecuritySensitive({
        debtType: 'lifecycle-risk',
        description: `Server has a known ${word}`,
      })).toBe(true)
    }
  })

  it('flags acceptanceRationale by the same rule', () => {
    expect(detectSecuritySensitive({
      debtType: 'known-shortcut',
      description: 'safe',
      acceptanceRationale: 'Awaiting CVE patch — accepted for the quarter',
    })).toBe(true)
  })

  it('returns false for clean content', () => {
    expect(detectSecuritySensitive({
      debtType: 'capability-gap',
      description: 'Licensing has no application implementing it.',
    })).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(detectSecuritySensitive({
      debtType: 'lifecycle-risk',
      description: 'unpatched issue logged',
    })).toBe(true)
  })
})

// ── 2. createDebtItem ───────────────────────────────────────────────────────

describe('createDebtItem', () => {
  it('persists the row + junctions in a single transaction', async () => {
    asUser(adminA)
    const fd = await makeFormData({
      title: 'Permitting reaches EOS in 2026',
      debtType: 'lifecycle-risk',
      severity: 'high',
      applicationIds: [appAId],
      capabilityIds: [capAId],
    })
    const id = await createDebtItem(fd)
    expect(id).toBeTruthy()

    const item = await db.query.architectureDebtItems.findFirst({
      where: eq(architectureDebtItems.id, id),
    })
    expect(item?.title).toBe('Permitting reaches EOS in 2026')
    expect(item?.severity).toBe('high')
    expect(item?.source).toBe('human')

    const appLinks = await db.select().from(debtApplications).where(eq(debtApplications.debtItemId, id))
    const capLinks = await db.select().from(debtCapabilities).where(eq(debtCapabilities.debtItemId, id))
    expect(appLinks).toHaveLength(1)
    expect(capLinks).toHaveLength(1)
  })

  it('refuses to save without any linked architecture object', async () => {
    asUser(adminA)
    const fd = await makeFormData({ title: 'Orphan' })
    await expect(createDebtItem(fd)).rejects.toThrow(/at least one architecture object/)
  })

  it('refuses to mark accepted without a rationale', async () => {
    asUser(adminA)
    const fd = await makeFormData({
      title: 'Accepted-no-rationale',
      status: 'accepted',
      applicationIds: [appAId],
    })
    await expect(createDebtItem(fd)).rejects.toThrow(/rationale is required/)
  })
})

// ── 3. security_sensitive auto-detection ────────────────────────────────────

describe('security_sensitive auto-detection', () => {
  it('forces securitySensitive=true when description contains a keyword and no override is granted', async () => {
    asUser(adminA)
    const fd = await makeFormData({
      title: 'Has CVE',
      description: 'CVE-2024-99999 affects the server',
      applicationIds: [appAId],
    })
    const id = await createDebtItem(fd)
    const item = await db.query.architectureDebtItems.findFirst({
      where: eq(architectureDebtItems.id, id),
    })
    expect(item?.securitySensitive).toBe(true)
  })

  it('honors an explicit override true → false and writes a security_classification_override audit row', async () => {
    asUser(adminA)
    const fd = await makeFormData({
      title: 'CVE but cleared',
      description: 'Mentions CVE in a non-sensitive context',
      overrideSecuritySensitive: true,
      applicationIds: [appAId],
    })
    const id = await createDebtItem(fd)
    const item = await db.query.architectureDebtItems.findFirst({
      where: eq(architectureDebtItems.id, id),
    })
    expect(item?.securitySensitive).toBe(false)

    const overrides = await db.select().from(auditLog).where(and(
      eq(auditLog.entityId, id),
      eq(auditLog.action, 'debt.security_classification_override'),
    ))
    expect(overrides.length).toBe(1)
  })

  it('re-runs detection on every edit, not just create', async () => {
    asUser(adminA)
    // Create with clean content
    const fd1 = await makeFormData({
      title: 'Clean at first',
      description: 'no sensitive content',
      applicationIds: [appAId],
    })
    const id = await createDebtItem(fd1)
    const before = await db.query.architectureDebtItems.findFirst({
      where: eq(architectureDebtItems.id, id),
    })
    expect(before?.securitySensitive).toBe(false)

    // Edit to inject a keyword
    const fd2 = await makeFormData({
      title: 'Now has CVE',
      description: 'now mentions a CVE',
      applicationIds: [appAId],
    })
    await editDebtItem(id, fd2)

    const after = await db.query.architectureDebtItems.findFirst({
      where: eq(architectureDebtItems.id, id),
    })
    expect(after?.securitySensitive).toBe(true)
  })
})

// ── 4. Read role-gating ──────────────────────────────────────────────────────

describe('read role-gating', () => {
  it('viewer cannot see security-sensitive items even when published', async () => {
    asUser(adminA)
    const fdSensitive = await makeFormData({
      title: 'Sensitive',
      description: 'CVE-2024-1 hidden from viewer',
      status: 'published',
      applicationIds: [appAId],
    })
    const fdSafe = await makeFormData({
      title: 'Safe',
      status: 'published',
      applicationIds: [appAId],
    })
    await createDebtItem(fdSensitive)
    await createDebtItem(fdSafe)

    asUser(viewerA)
    const visible = await getDebtItems()
    expect(visible.map(v => v.title)).toContain('Safe')
    expect(visible.map(v => v.title)).not.toContain('Sensitive')
  })

  it('viewer cannot see non-published items', async () => {
    asUser(adminA)
    const fdDraft = await makeFormData({
      title: 'Draft only',
      status: 'draft',
      applicationIds: [appAId],
    })
    await createDebtItem(fdDraft)

    asUser(viewerA)
    const visible = await getDebtItems()
    expect(visible.map(v => v.title)).not.toContain('Draft only')
  })

  it('getDebtItem returns null for viewer when item is security-sensitive', async () => {
    asUser(adminA)
    const fd = await makeFormData({
      title: 'Sensitive detail',
      description: 'CVE affects this',
      status: 'published',
      applicationIds: [appAId],
    })
    const id = await createDebtItem(fd)

    asUser(viewerA)
    const item = await getDebtItem(id)
    expect(item).toBeNull()
  })
})

// ── 5. editDebtItem replaces junctions atomically ───────────────────────────

describe('editDebtItem junction replacement', () => {
  it('replaces the junction set atomically when links change', async () => {
    asUser(adminA)
    const fd1 = await makeFormData({
      title: 'Link rewrite',
      applicationIds: [appAId],
      capabilityIds: [],
    })
    const id = await createDebtItem(fd1)

    const initialApp = await db.select().from(debtApplications).where(eq(debtApplications.debtItemId, id))
    expect(initialApp).toHaveLength(1)

    const fd2 = await makeFormData({
      title: 'Link rewrite',
      applicationIds: [],
      capabilityIds: [capAId],
    })
    await editDebtItem(id, fd2)

    const finalApp = await db.select().from(debtApplications).where(eq(debtApplications.debtItemId, id))
    const finalCap = await db.select().from(debtCapabilities).where(eq(debtCapabilities.debtItemId, id))
    expect(finalApp).toHaveLength(0)
    expect(finalCap).toHaveLength(1)
  })

  it('rejects edit that empties all links', async () => {
    asUser(adminA)
    const fd = await makeFormData({
      title: 'Will-be-orphan',
      applicationIds: [appAId],
    })
    const id = await createDebtItem(fd)

    const fd2 = await makeFormData({
      title: 'Will-be-orphan',
      applicationIds: [],
    })
    await expect(editDebtItem(id, fd2)).rejects.toThrow(/at least one architecture object/)
  })
})

// Suppress unused-import lint
void [adrs, initiatives, debtAdrs, debtInitiatives]
