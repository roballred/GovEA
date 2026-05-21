/**
 * Integration tests: subscriptions + change notifications (#581)
 *
 * Covers:
 *   - subscribe / unsubscribe / isSubscribed (idempotent)
 *   - notifySubscribers fans out to everyone EXCEPT the actor
 *   - Actor self-subscriptions don't generate a notification for the actor
 *   - notifications appear in getMyNotifications in unread-first order
 *   - mark-read / mark-all-read transitions
 *   - capability.edit fires the fan-out end-to-end through the real
 *     edit action (proves the hook is wired, not just the helper)
 *   - getMyUnreadCount tracks unread → read
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  notifications, subscriptions, capabilities,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  subscribe, unsubscribe, isSubscribed, notifySubscribers,
  getMyNotifications, getMySubscriptions, getMyUnreadCount,
  markNotificationRead, markAllNotificationsRead,
} from '@/actions/notifications'
import { editCapability } from '@/actions/capabilities'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

async function seedCap(orgId: string, name: string) {
  const [row] = await db.insert(capabilities).values({
    id: randomUUID(), organizationId: orgId, name,
    status: 'draft', visibility: 'org',
  }).returning()
  return row.id
}

describe('subscriptions + notifications (#581)', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let watcher: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, watcher] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'contributor'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  // ── Subscription primitive ────────────────────────────────────────────────

  it('subscribe is idempotent — re-subscribing does not duplicate', async () => {
    const capId = await seedCap(orgId, 'Sub Idempotent Cap')
    mockAuth.mockResolvedValue(makeSession(watcher))

    expect(await isSubscribed('capability', capId)).toBe(false)
    await subscribe('capability', capId)
    expect(await isSubscribed('capability', capId)).toBe(true)
    await subscribe('capability', capId) // again
    expect(await isSubscribed('capability', capId)).toBe(true)

    const rows = await db.select().from(subscriptions).where(and(
      eq(subscriptions.userId, watcher.id),
      eq(subscriptions.entityType, 'capability'),
      eq(subscriptions.entityId, capId),
    ))
    expect(rows).toHaveLength(1)
  })

  it('unsubscribe removes the subscription', async () => {
    const capId = await seedCap(orgId, 'Unsub Cap')
    mockAuth.mockResolvedValue(makeSession(watcher))
    await subscribe('capability', capId)
    await unsubscribe('capability', capId)
    expect(await isSubscribed('capability', capId)).toBe(false)
  })

  // ── Fan-out helper ────────────────────────────────────────────────────────

  it('notifySubscribers fans out to subscribers except the actor', async () => {
    const capId = await seedCap(orgId, 'Fanout Cap')
    // Three users subscribe: admin, contributor, watcher.
    for (const u of [admin, contributor, watcher]) {
      mockAuth.mockResolvedValue(makeSession(u))
      await subscribe('capability', capId)
    }
    // Admin is the actor; contributor + watcher should be notified.
    await notifySubscribers(db, {
      organizationId: orgId,
      entityType: 'capability', entityId: capId,
      action: 'capability.edit', actorUserId: admin.id,
      summary: 'Admin Test updated Fanout Cap',
    })
    const rows = await db.select({ userId: notifications.userId, summary: notifications.summary })
      .from(notifications)
      .where(and(eq(notifications.entityId, capId), eq(notifications.action, 'capability.edit')))
    const recipientIds = rows.map(r => r.userId).sort()
    expect(recipientIds).toEqual([contributor.id, watcher.id].sort())
    expect(recipientIds).not.toContain(admin.id)
    expect(rows[0].summary).toBe('Admin Test updated Fanout Cap')
  })

  // ── Wired end-to-end through editCapability ────────────────────────────────

  it('editCapability fires notifications to subscribers (hook is wired)', async () => {
    const capId = await seedCap(orgId, 'E2E Hook Cap')
    mockAuth.mockResolvedValue(makeSession(watcher))
    await subscribe('capability', capId)

    // Switch to admin and edit the capability.
    mockAuth.mockResolvedValue(makeSession(admin))
    const fd = new FormData()
    fd.set('name', 'E2E Hook Cap renamed')
    fd.set('status', 'draft')
    fd.set('visibility', 'org')
    await editCapability(capId, fd)

    const rows = await db.select().from(notifications).where(and(
      eq(notifications.entityId, capId),
      eq(notifications.userId, watcher.id),
      eq(notifications.action, 'capability.edit'),
    ))
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })

  // ── Inbox / unread / mark-read ────────────────────────────────────────────

  it('getMyNotifications shows unread first, then most-recent', async () => {
    mockAuth.mockResolvedValue(makeSession(watcher))
    const items = await getMyNotifications()
    // Earlier tests seeded multiple notifications for watcher. The list is
    // non-empty; unread items (most or all) lead the list.
    expect(items.length).toBeGreaterThan(0)
    // No read items at the top of the list while any unread remain.
    const firstReadIdx = items.findIndex(i => i.readAt !== null)
    const lastUnreadIdx = items.map(i => i.readAt === null).lastIndexOf(true)
    if (firstReadIdx >= 0 && lastUnreadIdx >= 0) {
      expect(firstReadIdx).toBeGreaterThan(lastUnreadIdx)
    }
  })

  it('getMyUnreadCount tracks mark-read transitions', async () => {
    mockAuth.mockResolvedValue(makeSession(watcher))
    const before = await getMyUnreadCount()
    expect(before).toBeGreaterThan(0)

    const [first] = await getMyNotifications(1)
    expect(first.readAt).toBeNull()
    await markNotificationRead(first.id)

    const after = await getMyUnreadCount()
    expect(after).toBe(before - 1)
  })

  it('markAllNotificationsRead clears the unread count to zero', async () => {
    mockAuth.mockResolvedValue(makeSession(watcher))
    await markAllNotificationsRead()
    expect(await getMyUnreadCount()).toBe(0)
  })

  // ── User scope guard: the recipient can only mark THEIR own notification read ─

  it('markNotificationRead does not affect another user\'s notifications', async () => {
    const capId = await seedCap(orgId, 'Scope Guard Cap')
    mockAuth.mockResolvedValue(makeSession(contributor))
    await subscribe('capability', capId)
    await notifySubscribers(db, {
      organizationId: orgId,
      entityType: 'capability', entityId: capId,
      action: 'capability.edit', actorUserId: admin.id,
      summary: 'Admin updated Scope Guard Cap',
    })
    // Find the notification we just created for contributor.
    const [contribNote] = await db.select().from(notifications)
      .where(and(eq(notifications.entityId, capId), eq(notifications.userId, contributor.id)))

    // watcher tries to mark contributor's notification read — should be a no-op.
    mockAuth.mockResolvedValue(makeSession(watcher))
    await markNotificationRead(contribNote.id)

    const [unchanged] = await db.select().from(notifications).where(eq(notifications.id, contribNote.id))
    expect(unchanged.readAt).toBeNull()
  })

  // ── Subscription listing ──────────────────────────────────────────────────

  it('getMySubscriptions returns the caller\'s subscriptions with entity names', async () => {
    mockAuth.mockResolvedValue(makeSession(watcher))
    const subs = await getMySubscriptions()
    // Watcher subscribed to multiple capabilities across the test suite.
    expect(subs.length).toBeGreaterThan(0)
    expect(subs.every(s => s.entityType === 'capability')).toBe(true)
    expect(subs.every(s => s.href?.startsWith('/capabilities/'))).toBe(true)
    expect(subs.some(s => s.entityName !== null)).toBe(true)
  })
})
