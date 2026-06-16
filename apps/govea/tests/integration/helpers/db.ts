/**
 * Test factory helpers and direct-DB query utilities.
 *
 * Each test suite should:
 *   - Call createTestOrg() in beforeAll to get an isolated org
 *   - Call createTestUser() to build users with the roles under test
 *   - Call cleanupOrg(orgId) in afterAll — cascades to all related rows
 *
 * Isolation is by organizationId; tests never touch the dev seed orgs.
 */
import { db } from '@/db/client'
import {
  organizations, users, capabilities, initiatives, adrs, auditLog,
  personas, applications, strategicObjectives, principles, valueStreams, services,
  glossaryTerms, strategies, strategyGoals, goals,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TestOrg {
  id: string
  name: string
  slug: string
}

export interface TestUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'contributor' | 'viewer'
  organizationId: string
}

// ── Factories ─────────────────────────────────────────────────────────────────

export async function createTestOrg(
  overrides?: Partial<{ name: string; slug: string }>,
): Promise<TestOrg> {
  const suffix = randomUUID().slice(0, 8)
  const name = overrides?.name ?? `Test Org ${suffix}`
  const slug = overrides?.slug ?? `test-org-${suffix}`

  const [org] = await db
    .insert(organizations)
    .values({ id: randomUUID(), name, slug, theme: 'govea', enabledModules: {} })
    .returning()

  return { id: org.id, name: org.name, slug: org.slug }
}

export async function createTestUser(
  orgId: string,
  role: 'admin' | 'contributor' | 'viewer' = 'viewer',
  overrides?: Partial<{ email: string; name: string }>,
): Promise<TestUser> {
  const suffix = randomUUID().slice(0, 8)
  const email = overrides?.email ?? `test-${suffix}@test.example`
  const name = overrides?.name ?? `Test User ${suffix}`
  const passwordHash = await bcrypt.hash('test-password', 10)

  const [user] = await db
    .insert(users)
    .values({ id: randomUUID(), organizationId: orgId, email, name, role, passwordHash, isActive: 'true' })
    .returning()

  return {
    id: user.id,
    email: user.email!,
    name: user.name!,
    role: user.role,
    organizationId: user.organizationId!,
  }
}

/** Deletes the test org and all its data (cascade). */
export async function cleanupOrg(orgId: string): Promise<void> {
  await db.delete(organizations).where(eq(organizations.id, orgId))
}

// ── Session builder ───────────────────────────────────────────────────────────

/** Build the session shape that auth() returns, matching the JWT payload. */
export function makeSession(user: TestUser, overrides?: { instanceRole?: 'instance_admin' | null }) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      instanceRole: overrides?.instanceRole ?? null,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  }
}

// ── Direct DB query helpers for assertions ────────────────────────────────────

export async function findOrg(orgId: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  })
}

export async function findUser(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  })
}

export async function getCapabilitiesForOrg(orgId: string) {
  return db.select().from(capabilities).where(eq(capabilities.organizationId, orgId))
}

/** Returns audit log entries for an org, optionally filtered by action name. */
export async function getAuditLogs(orgId: string, action?: string) {
  const rows = await db
    .select()
    .from(auditLog)
    .where(
      action
        ? and(eq(auditLog.organizationId, orgId), eq(auditLog.action, action))
        : eq(auditLog.organizationId, orgId),
    )
  return rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

/** Returns all audit log entries for a specific entity (e.g. a capability id). */
export async function getAuditLogsForEntity(entityId: string) {
  return db.select().from(auditLog).where(eq(auditLog.entityId, entityId))
}

export async function getInitiativesForOrg(orgId: string) {
  return db.select().from(initiatives).where(eq(initiatives.organizationId, orgId))
}

export async function getStrategiesForOrg(orgId: string) {
  return db.select().from(strategies).where(eq(strategies.organizationId, orgId))
}

/** Insert a strategy row directly — used to seed specific statuses for tests. */
export async function insertStrategy(
  orgId: string,
  overrides: {
    name?: string
    status?: 'proposed' | 'active' | 'achieved' | 'abandoned'
    visibility?: 'org' | 'connections' | 'instance'
  } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(strategies)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Strategy ${suffix}`,
      status: overrides.status ?? 'proposed',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert a goal row directly. */
export async function insertGoal(
  orgId: string,
  overrides: { name?: string; status?: 'draft' | 'published' | 'archived' } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(goals)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Goal ${suffix}`,
      status: overrides.status ?? 'draft',
    })
    .returning()
  return row
}

/** Link a strategy to a goal it pursues (strategy_goals junction). */
export async function linkStrategyGoalRow(strategyId: string, goalId: string) {
  await db.insert(strategyGoals).values({ strategyId, goalId }).onConflictDoNothing()
}

/** Convenience: insert a capability row directly for cross-org / setup scenarios. */
export async function insertCapability(
  orgId: string,
  overrides: { name?: string; status?: 'draft' | 'published' | 'archived'; visibility?: 'org' | 'connections' | 'instance' } | string = {},
) {
  // Accept legacy string signature for backward compat
  const opts = typeof overrides === 'string' ? { name: overrides } : overrides
  const suffix = randomUUID().slice(0, 8)
  const [cap] = await db
    .insert(capabilities)
    .values({
      name: opts.name ?? `Test Capability ${suffix}`,
      organizationId: orgId,
      status: opts.status ?? 'draft',
      visibility: opts.visibility ?? 'org',
    })
    .returning()
  return cap
}

/** Insert an ADR directly — used by viewer-visibility tests to seed specific statuses. */
export async function insertAdr(
  orgId: string,
  overrides: {
    number?: string
    title?: string
    status?: 'proposed' | 'accepted' | 'deprecated' | 'superseded'
    visibility?: 'org' | 'connections' | 'instance'
  } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(adrs)
    .values({
      organizationId: orgId,
      number: overrides.number ?? `ADR-T-${suffix}`,
      title: overrides.title ?? `Test ADR ${suffix}`,
      status: overrides.status ?? 'proposed',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert a persona row directly — used by viewer-visibility tests. */
export async function insertPersona(
  orgId: string,
  overrides: { name?: string; status?: 'draft' | 'published' | 'archived'; visibility?: 'org' | 'connections' | 'instance' } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(personas)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Persona ${suffix}`,
      status: overrides.status ?? 'draft',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert an application row directly — used by viewer-visibility tests. */
export async function insertApplication(
  orgId: string,
  overrides: { name?: string; status?: 'draft' | 'published' | 'archived'; visibility?: 'org' | 'connections' | 'instance' } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(applications)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Application ${suffix}`,
      status: overrides.status ?? 'draft',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert a strategic objective row directly — used by viewer-visibility tests. */
export async function insertObjective(
  orgId: string,
  overrides: { name?: string; status?: 'draft' | 'published' | 'archived'; visibility?: 'org' | 'connections' | 'instance' } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(strategicObjectives)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Objective ${suffix}`,
      status: overrides.status ?? 'draft',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert a principle row directly — used by viewer-visibility tests. */
export async function insertPrinciple(
  orgId: string,
  overrides: { name?: string; status?: 'draft' | 'published' | 'archived'; visibility?: 'org' | 'connections' | 'instance' } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(principles)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Principle ${suffix}`,
      rationale: '',
      implications: '',
      status: overrides.status ?? 'draft',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert a value stream row directly — used by viewer-visibility tests. */
export async function insertValueStream(
  orgId: string,
  overrides: { name?: string; status?: 'draft' | 'published' | 'archived'; visibility?: 'org' | 'connections' | 'instance' } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(valueStreams)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Value Stream ${suffix}`,
      status: overrides.status ?? 'draft',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert a service row directly — used by viewer-visibility tests. */
export async function insertService(
  orgId: string,
  overrides: { name?: string; status?: 'draft' | 'published' | 'archived'; visibility?: 'org' | 'connections' | 'instance' } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(services)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Service ${suffix}`,
      channels: [],
      status: overrides.status ?? 'draft',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert an initiative directly — used by viewer-visibility tests to seed specific statuses. */
export async function insertInitiative(
  orgId: string,
  overrides: {
    name?: string
    status?: 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled'
    visibility?: 'org' | 'connections' | 'instance'
  } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(initiatives)
    .values({
      organizationId: orgId,
      name: overrides.name ?? `Test Initiative ${suffix}`,
      status: overrides.status ?? 'proposed',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}

/** Insert a glossary term directly — used by viewer-visibility tests. */
export async function insertGlossaryTerm(
  orgId: string,
  overrides: {
    term?: string
    status?: 'draft' | 'published' | 'archived'
    visibility?: 'org' | 'connections' | 'instance'
  } = {},
) {
  const suffix = randomUUID().slice(0, 8)
  const [row] = await db
    .insert(glossaryTerms)
    .values({
      organizationId: orgId,
      term: overrides.term ?? `Test Term ${suffix}`,
      definition: 'Test definition',
      status: overrides.status ?? 'draft',
      visibility: overrides.visibility ?? 'org',
    })
    .returning()
  return row
}
