/**
 * Integration tests: transactional audit writes (#416)
 *
 * Verifies the central correctness property of the issue: when an audit-log
 * insert fails inside a transaction, the companion mutation rolls back. There
 * is no orphaned data — either both the change and its audit row land, or
 * neither does.
 *
 * The previous fail-silent pattern (try { writeAuditLog } catch { console.error })
 * is gone; this test exists to make sure the new pattern actually delivers the
 * atomicity it advertises.
 *
 * The rollback is forced by inserting an audit row with a NULL `action` value,
 * which violates the table's NOT NULL constraint. We use raw SQL because the
 * Drizzle types correctly forbid NULL on a notNull column — the constraint
 * violation is exactly the simulated "audit-write failure" we need.
 */
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { organizations, capabilities, auditLog } from '@/db/schema'
import { writeAuditLog } from '@/lib/audit'
import { createTestOrg, cleanupOrg } from './helpers/db'

describe('audit writes are transactional with their mutation (#416)', () => {
  it('mutation rolls back when the audit insert fails', async () => {
    const org = await createTestOrg()
    const capName = `TxRollbackTest-${randomUUID().slice(0, 8)}`

    // Wrap a real mutation + a deliberately-broken audit in a transaction.
    // The audit insert violates the NOT NULL constraint on `action`, so the
    // whole transaction must roll back. After it throws, the capability row
    // should NOT exist.
    let threw = false
    try {
      await db.transaction(async (tx) => {
        await tx.insert(capabilities).values({
          name: capName,
          organizationId: org.id,
          status: 'draft',
          visibility: 'org',
        })

        // Force the audit insert to fail. NULL violates NOT NULL on action.
        await tx.execute(sql`
          INSERT INTO audit_log (organization_id, user_id, action, entity_type)
          VALUES (${org.id}, NULL, NULL, 'capability')
        `)
      })
    } catch {
      threw = true
    }

    try {
      expect(threw).toBe(true)

      // The capability must not exist — rollback worked
      const survivors = await db.select().from(capabilities)
        .where(eq(capabilities.name, capName))
      expect(survivors.length).toBe(0)
    } finally {
      await cleanupOrg(org.id)
    }
  })

  it('audit row never appears when its companion mutation fails', async () => {
    // Inverse of the first test: prove the audit row is also rolled back when
    // the mutation fails. This catches the "what if the application caught
    // the error and still wrote the audit row" anti-pattern.
    const org = await createTestOrg()
    const auditAction = `test.audit.tx-rollback.${randomUUID()}`

    let threw = false
    try {
      await db.transaction(async (tx) => {
        // Audit write succeeds...
        await writeAuditLog(tx, {
          action: auditAction,
          entityType: 'capability',
          organizationId: org.id,
          after: { test: 'should-not-survive' },
        })

        // ...but the mutation fails. Insert into a non-existent column
        // forces a SQL error.
        await tx.execute(sql`
          INSERT INTO capabilities (id, name, organization_id, nonexistent_column)
          VALUES (${randomUUID()}, 'should-fail', ${org.id}, 'oops')
        `)
      })
    } catch {
      threw = true
    }

    try {
      expect(threw).toBe(true)

      // The audit row must not exist — rollback rolled back the audit too
      const auditRows = await db.select().from(auditLog)
        .where(eq(auditLog.action, auditAction))
      expect(auditRows.length).toBe(0)
    } finally {
      await cleanupOrg(org.id)
    }
  })

  it('happy path: mutation and audit both commit together', async () => {
    // Sanity check that the transactional pattern still allows successful writes.
    const org = await createTestOrg()
    const capName = `TxHappyPath-${randomUUID().slice(0, 8)}`
    const auditAction = `test.audit.tx-happy.${randomUUID()}`

    try {
      await db.transaction(async (tx) => {
        await tx.insert(capabilities).values({
          name: capName,
          organizationId: org.id,
          status: 'draft',
          visibility: 'org',
        })

        await writeAuditLog(tx, {
          action: auditAction,
          entityType: 'capability',
          organizationId: org.id,
          after: { name: capName },
        })
      })

      const caps = await db.select().from(capabilities)
        .where(eq(capabilities.name, capName))
      expect(caps.length).toBe(1)

      const audits = await db.select().from(auditLog)
        .where(eq(auditLog.action, auditAction))
      expect(audits.length).toBe(1)
    } finally {
      await cleanupOrg(org.id)
    }
  })
})

describe('writeAuditLog API surface (#416)', () => {
  // The new signature requires a tx-or-db handle as the first argument. We
  // can't directly assert "no caller forgot to pass it" at runtime, but the
  // refactor relies on TypeScript's compile-time check for that guarantee.
  // This test just verifies the happy-path top-level usage (writeAuditLog(db, ...))
  // continues to work for pure-audit events that have no companion mutation.

  it('accepts the top-level db client for pure-audit events', async () => {
    const org = await createTestOrg()
    const auditAction = `test.audit.api.${randomUUID()}`

    try {
      await writeAuditLog(db, {
        action: auditAction,
        entityType: 'auth',
        organizationId: org.id,
        metadata: { kind: 'login' },
      })

      const rows = await db.select().from(auditLog)
        .where(eq(auditLog.action, auditAction))
      expect(rows.length).toBe(1)
    } finally {
      await cleanupOrg(org.id)
    }
  })
})

describe('no swallowed-error pattern remains (#416)', () => {
  // Defense-in-depth check on the helper itself: if writeAuditLog still had
  // the old try/catch, this would silently succeed. With the new signature
  // it surfaces the underlying error, which is what we want.
  it('writeAuditLog throws when its insert fails', async () => {
    let caught: unknown
    try {
      await writeAuditLog(db, {
        // Empty action violates NOT NULL via Postgres rejecting empty string?
        // No — empty string is valid for text. Use a non-existent
        // organization_id constraint? audit_log no longer has FK on org_id.
        // Easiest forced failure: pass an entityId that's not a valid UUID.
        action: 'test',
        entityType: 'test',
        entityId: 'not-a-uuid',
      })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeDefined()
  })
})
