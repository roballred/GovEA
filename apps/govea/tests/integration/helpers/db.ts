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
import { organizations, users, capabilities, auditLog } from '@/db/schema'
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
export function makeSession(user: TestUser) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
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

/** Convenience: insert a capability row directly for cross-org / setup scenarios. */
export async function insertCapability(orgId: string, name = 'Test Capability') {
  const [cap] = await db
    .insert(capabilities)
    .values({ name, organizationId: orgId, status: 'draft', visibility: 'org' })
    .returning()
  return cap
}
