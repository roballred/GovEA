/**
 * Integration tests: auto-flagged lifecycle debt (#381 PR-4).
 *
 * Verifies:
 * - autoFlagLifecycleDebt creates a system-detected lifecycle-risk debt item
 *   when an application has EOL lifecycle status (sunset / decommissioned).
 * - Severity mapping: sunset → high, decommissioned → critical.
 * - Idempotent: a second call does not create a duplicate.
 * - Severity upgrade: calling again with a more-severe status updates the
 *   existing item rather than creating a second one.
 * - Non-EOL statuses (active, planned) produce no debt item.
 * - Org isolation: items are created under the owning org only.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  applications,
  architectureDebtItems,
  debtApplications,
} from '@/db/schema'
import { autoFlagLifecycleDebt } from '@/lib/lifecycle-debt'
import {
  createTestOrg, createTestUser, cleanupOrg,
  type TestOrg,
} from './helpers/db'

let orgA: TestOrg
let orgB: TestOrg
let appId: string
let appName: string

beforeAll(async () => {
  ;[orgA, orgB] = await Promise.all([createTestOrg(), createTestOrg()])
  appName = `Legacy App ${randomUUID().slice(0, 6)}`
  const [app] = await db
    .insert(applications)
    .values({
      id: randomUUID(),
      organizationId: orgA.id,
      name: appName,
      lifecycleStatus: 'active',
      status: 'published',
      visibility: 'org',
    })
    .returning()
  appId = app.id
})

afterAll(async () => {
  await cleanupOrg(orgA.id)
  await cleanupOrg(orgB.id)
})

beforeEach(async () => {
  // Clear system-detected debt between tests for a clean slate.
  await db
    .delete(architectureDebtItems)
    .where(
      and(
        eq(architectureDebtItems.organizationId, orgA.id),
        eq(architectureDebtItems.source, 'system-detected'),
      ),
    )
})

// ── Creates on EOL ───────────────────────────────────────────────────────────

describe('sunset lifecycle status', () => {
  it('creates a system-detected lifecycle-risk debt item with high severity', async () => {
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'sunset',
    })

    const item = await db.query.architectureDebtItems.findFirst({
      where: and(
        eq(architectureDebtItems.organizationId, orgA.id),
        eq(architectureDebtItems.source, 'system-detected'),
      ),
    })

    expect(item).toBeDefined()
    expect(item!.debtType).toBe('lifecycle-risk')
    expect(item!.severity).toBe('high')
    expect(item!.status).toBe('published')
    expect(item!.securitySensitive).toBe(false)
    expect(item!.title).toContain(appName)
    expect(item!.title).toContain('approaching end of support')
  })

  it('creates a debtApplications link to the flagged application', async () => {
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'sunset',
    })

    const item = await db.query.architectureDebtItems.findFirst({
      where: and(
        eq(architectureDebtItems.organizationId, orgA.id),
        eq(architectureDebtItems.source, 'system-detected'),
      ),
    })
    expect(item).toBeDefined()

    const link = await db.query.debtApplications.findFirst({
      where: and(
        eq(debtApplications.debtItemId, item!.id),
        eq(debtApplications.applicationId, appId),
      ),
    })
    expect(link).toBeDefined()
  })
})

describe('decommissioned lifecycle status', () => {
  it('creates a debt item with critical severity', async () => {
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'decommissioned',
    })

    const item = await db.query.architectureDebtItems.findFirst({
      where: and(
        eq(architectureDebtItems.organizationId, orgA.id),
        eq(architectureDebtItems.source, 'system-detected'),
      ),
    })

    expect(item!.severity).toBe('critical')
    expect(item!.title).toContain('past end of support')
  })
})

// ── Idempotency ──────────────────────────────────────────────────────────────

describe('idempotency', () => {
  it('does not create a duplicate when called twice with the same status', async () => {
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'sunset',
    })
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'sunset',
    })

    const count = await db
      .select()
      .from(architectureDebtItems)
      .where(
        and(
          eq(architectureDebtItems.organizationId, orgA.id),
          eq(architectureDebtItems.source, 'system-detected'),
        ),
      )
    expect(count).toHaveLength(1)
  })

  it('upgrades severity from high → critical when status changes to decommissioned', async () => {
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'sunset',
    })
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'decommissioned',
    })

    const items = await db
      .select()
      .from(architectureDebtItems)
      .where(
        and(
          eq(architectureDebtItems.organizationId, orgA.id),
          eq(architectureDebtItems.source, 'system-detected'),
        ),
      )
    expect(items).toHaveLength(1)
    expect(items[0].severity).toBe('critical')
  })

  it('downgrades severity from critical → high when status reverts to sunset', async () => {
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'decommissioned',
    })
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: 'sunset',
    })

    const [item] = await db
      .select()
      .from(architectureDebtItems)
      .where(
        and(
          eq(architectureDebtItems.organizationId, orgA.id),
          eq(architectureDebtItems.source, 'system-detected'),
        ),
      )
    expect(item.severity).toBe('high')
  })
})

// ── Non-EOL statuses ─────────────────────────────────────────────────────────

describe('non-EOL lifecycle statuses', () => {
  it.each(['active', 'planned'])('does not create a debt item for lifecycleStatus="%s"', async (ls) => {
    await autoFlagLifecycleDebt({
      applicationId: appId,
      applicationName: appName,
      organizationId: orgA.id,
      lifecycleStatus: ls,
    })

    const items = await db
      .select()
      .from(architectureDebtItems)
      .where(
        and(
          eq(architectureDebtItems.organizationId, orgA.id),
          eq(architectureDebtItems.source, 'system-detected'),
        ),
      )
    expect(items).toHaveLength(0)
  })
})

// ── Org isolation ─────────────────────────────────────────────────────────────

describe('org isolation', () => {
  it('debt items are created under the owning org only', async () => {
    const appBId = randomUUID()
    await db.insert(applications).values({
      id: appBId,
      organizationId: orgB.id,
      name: 'Org B App',
      lifecycleStatus: 'active',
      status: 'published',
      visibility: 'org',
    })

    await autoFlagLifecycleDebt({
      applicationId: appBId,
      applicationName: 'Org B App',
      organizationId: orgB.id,
      lifecycleStatus: 'decommissioned',
    })

    const orgAItems = await db
      .select()
      .from(architectureDebtItems)
      .where(
        and(
          eq(architectureDebtItems.organizationId, orgA.id),
          eq(architectureDebtItems.source, 'system-detected'),
        ),
      )
    const orgBItems = await db
      .select()
      .from(architectureDebtItems)
      .where(
        and(
          eq(architectureDebtItems.organizationId, orgB.id),
          eq(architectureDebtItems.source, 'system-detected'),
        ),
      )

    expect(orgAItems).toHaveLength(0)
    expect(orgBItems).toHaveLength(1)
    expect(orgBItems[0].severity).toBe('critical')
  })
})
