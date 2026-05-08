/**
 * Integration tests: audit_log append-only enforcement (#417)
 *
 * Verifies that:
 *   - INSERT into audit_log works (the writeAuditLog helper continues to function)
 *   - UPDATE on audit_log is blocked at the DB level by the immutability trigger
 *   - DELETE on audit_log is blocked at the DB level by the immutability trigger
 *   - cleanupOrg still succeeds when there are audit rows referencing the org
 *     (audit_log no longer has FK constraints back to organizations / users, so
 *     dropping an org leaves audit rows holding the historical UUIDs)
 *
 * If these tests fail, check that `pnpm --filter govea db:apply-triggers` was
 * run after the most recent `db:push`. CI runs it automatically.
 */
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { auditLog } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit'
import { createTestOrg, createTestUser, cleanupOrg } from './helpers/db'

describe('audit_log immutability (#417)', () => {
  it('rejects UPDATE on audit_log', async () => {
    const org = await createTestOrg()
    const action = `test.audit.update-blocked.${randomUUID()}`
    try {
      await writeAuditLog(db, {
        action,
        entityType: 'organization',
        entityId: org.id,
        organizationId: org.id,
        after: { test: 'before-update' },
      })

      const [row] = await db.select().from(auditLog).where(eq(auditLog.action, action)).limit(1)
      expect(row).toBeDefined()

      // Drizzle wraps the trigger's RAISE EXCEPTION as "Failed query: …";
      // the canonical append-only text lives on err.cause. Cheapest robust
      // assertion: the call throws AND the row is unchanged after.
      await expect(
        db.update(auditLog)
          .set({ action: `${action}.tampered` })
          .where(eq(auditLog.id, row.id))
      ).rejects.toThrow()

      const [after] = await db.select().from(auditLog).where(eq(auditLog.id, row.id)).limit(1)
      expect(after.action).toBe(action)
    } finally {
      await cleanupOrg(org.id)
    }
  })

  it('rejects DELETE on audit_log', async () => {
    const org = await createTestOrg()
    const action = `test.audit.delete-blocked.${randomUUID()}`
    try {
      await writeAuditLog(db, {
        action,
        entityType: 'organization',
        entityId: org.id,
        organizationId: org.id,
        after: { test: 'before-delete' },
      })

      const [row] = await db.select().from(auditLog).where(eq(auditLog.action, action)).limit(1)
      expect(row).toBeDefined()

      await expect(
        db.delete(auditLog).where(eq(auditLog.id, row.id))
      ).rejects.toThrow()

      const survivors = await db.select().from(auditLog).where(eq(auditLog.id, row.id))
      expect(survivors.length).toBe(1)
    } finally {
      await cleanupOrg(org.id)
    }
  })

  it('surfaces the append-only message on the underlying postgres error', async () => {
    // Defense in depth: confirm the trigger's message is reachable for diagnostics
    // even though Drizzle wraps the top-level error.
    const org = await createTestOrg()
    const action = `test.audit.cause-message.${randomUUID()}`
    try {
      await writeAuditLog(db, {
        action,
        entityType: 'organization',
        entityId: org.id,
        organizationId: org.id,
      })

      const [row] = await db.select().from(auditLog).where(eq(auditLog.action, action)).limit(1)
      let caught: { message?: string; cause?: { message?: string } } | undefined
      try {
        await db.delete(auditLog).where(eq(auditLog.id, row.id))
      } catch (e) {
        caught = e as { message?: string; cause?: { message?: string } }
      }
      expect(caught).toBeDefined()
      const combined = `${caught?.message ?? ''}|${caught?.cause?.message ?? ''}`
      expect(combined).toMatch(/append-only/i)
    } finally {
      await cleanupOrg(org.id)
    }
  })

  it('cleanupOrg succeeds when audit rows reference the deleted org', async () => {
    const org = await createTestOrg()
    const user = await createTestUser(org.id, 'admin')

    const action = `test.audit.cascade-safe.${randomUUID()}`
    await writeAuditLog(db, {
      action,
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
      organizationId: org.id,
    })

    // Org delete should succeed — audit_log has no FK back, so the org row
    // can be dropped without Postgres needing to UPDATE audit_log to NULL it.
    await expect(cleanupOrg(org.id)).resolves.toBeUndefined()

    // The audit row still exists with its original UUID values intact
    const [row] = await db.select().from(auditLog).where(eq(auditLog.action, action)).limit(1)
    expect(row).toBeDefined()
    expect(row!.organizationId).toBe(org.id)
    expect(row!.userId).toBe(user.id)
  })
})
