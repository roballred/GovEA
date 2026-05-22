'use server'

import { db } from '@/db/client'
import { subscriptions, notifications, capabilities, applications, adrs, users } from '@/db/schema'
import { and, eq, desc, isNull, inArray, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Subscription + change-notification surface (#581).
 *
 * Three concerns, kept in one module so the upstream hook callers
 * (capability / application / ADR edit actions) can wire the
 * notification fan-out with a single import:
 *
 *   - subscribe / unsubscribe / isSubscribed — per-object opt-in.
 *     The unique index (user_id, entity_type, entity_id) makes
 *     subscribe() idempotent.
 *
 *   - notifySubscribers — enqueues notification rows for every
 *     non-actor subscriber when an architecture object changes.
 *     Called from inside the source action's transaction so a DB
 *     failure rolls the original mutation back too.
 *
 *   - getMyNotifications / markRead / markAllRead — the
 *     /notifications page surface for recipients.
 *
 * Per-domain subscriptions and email delivery are explicit follow-ups:
 *   - domain scope requires the domain-owner attribution column on
 *     each architecture object (separate PR alongside #581's
 *     overwrite-protection half).
 *   - email delivery rides on top of the in-app inbox once the
 *     nodemailer transport lands (the #528 follow-up).
 */

export type NotifiableEntityType = 'capability' | 'application' | 'adr'

export async function subscribe(entityType: NotifiableEntityType, entityId: string): Promise<void> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = session.user.id
  const orgId = session.user.organizationId!

  // Idempotent — ON CONFLICT lets us treat this as a toggle without
  // racing the unique index.
  await db.insert(subscriptions).values({
    organizationId: orgId, userId, entityType, entityId,
  }).onConflictDoNothing({
    target: [subscriptions.userId, subscriptions.entityType, subscriptions.entityId],
  })

  revalidatePath(hrefFor(entityType, entityId))
  revalidatePath('/notifications')
}

export async function unsubscribe(entityType: NotifiableEntityType, entityId: string): Promise<void> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = session.user.id

  await db.delete(subscriptions).where(and(
    eq(subscriptions.userId, userId),
    eq(subscriptions.entityType, entityType),
    eq(subscriptions.entityId, entityId),
  ))

  revalidatePath(hrefFor(entityType, entityId))
  revalidatePath('/notifications')
}

export async function isSubscribed(entityType: NotifiableEntityType, entityId: string): Promise<boolean> {
  const session = await auth()
  if (!session?.user) return false
  const row = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, session.user.id),
      eq(subscriptions.entityType, entityType),
      eq(subscriptions.entityId, entityId),
    ),
    columns: { id: true },
  })
  return row !== undefined
}

/**
 * Owner-overwrite notification (#581 follow-up bridge).
 *
 * Sibling to `notifySubscribers`, called from inside an edit action's
 * transaction. When a non-owner edits an architecture object that has
 * a `domainOwnerUserId`, this writes a notification row for the owner
 * with a distinct `*.edit_by_non_owner` action label.
 *
 * Distinct from `notifySubscribers` for two reasons:
 *   - Owner notifications fire regardless of whether the owner subscribed.
 *     The persona walk's pain ("changes happen with no signal to the
 *     domain owner") is specifically about the owner not having to
 *     opt-in to be told their record was touched.
 *   - The action label is different so the inbox UI / future email
 *     digest could weight owner-overwrite differently from a generic
 *     subscriber-fan-out — an owner-overwrite is structurally more
 *     attention-worthy.
 *
 * No-ops when the owner field is null or the owner is the actor.
 */
export async function notifyDomainOwner(
  tx: Pick<typeof db, 'insert'>,
  params: {
    organizationId: string
    entityType: NotifiableEntityType
    entityId: string
    action: string // e.g. 'capability.edit_by_non_owner'
    actorUserId: string
    ownerUserId: string | null | undefined
    summary: string
  },
): Promise<number> {
  if (!params.ownerUserId || params.ownerUserId === params.actorUserId) return 0
  await tx.insert(notifications).values({
    organizationId: params.organizationId,
    userId: params.ownerUserId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorUserId: params.actorUserId,
    summary: params.summary,
  })
  revalidatePath('/notifications')
  return 1
}

/**
 * Fan-out helper called from inside an edit action's transaction.
 *
 * The caller passes the tx so this insert participates in the same
 * commit / rollback as the underlying mutation. Notification rows are
 * created for every subscriber other than the actor. If the actor
 * isn't subscribed they don't get a notification of their own change.
 *
 * `summary` is the plain-language one-liner shown in the inbox row.
 * Callers should write it from the recipient's perspective: "Alice
 * Admin updated Online Permitting" rather than the action verb alone.
 */
export async function notifySubscribers(
  tx: Pick<typeof db, 'insert' | 'select'>,
  params: {
    organizationId: string
    entityType: NotifiableEntityType
    entityId: string
    action: string
    actorUserId: string
    summary: string
  },
): Promise<number> {
  const subs = await tx.select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(and(
      eq(subscriptions.entityType, params.entityType),
      eq(subscriptions.entityId, params.entityId),
    ))
  const recipients = subs.map(s => s.userId).filter(u => u !== params.actorUserId)
  if (recipients.length === 0) return 0

  await tx.insert(notifications).values(
    recipients.map(userId => ({
      organizationId: params.organizationId,
      userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorUserId: params.actorUserId,
      summary: params.summary,
    })),
  )
  // The caller-side server action revalidates its own detail path; we also
  // ping /notifications so a recipient with an open tab sees the new row
  // on their next navigation. (The nav badge picks up the count via the
  // layout, which is re-fetched on every render.)
  revalidatePath('/notifications')
  return recipients.length
}

export type NotificationRow = {
  id: string
  entityType: string
  entityId: string | null
  entityName: string | null
  href: string | null
  action: string
  actorEmail: string | null
  actorName: string | null
  summary: string
  readAt: Date | null
  createdAt: Date
}

/**
 * Returns the caller's notifications joined with the actor's name + the
 * target entity's name (when readable). Unread first, then most-recent.
 */
export async function getMyNotifications(limit = 100): Promise<NotificationRow[]> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = session.user.id
  const orgId = session.user.organizationId!

  const rows = await db
    .select({
      n: notifications,
      actor: users,
    })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.actorUserId))
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.organizationId, orgId),
    ))
    .orderBy(
      sql`${notifications.readAt} IS NULL DESC`,
      desc(notifications.createdAt),
    )
    .limit(limit)

  // Hydrate target entity names + hrefs in batched per-type lookups so
  // the inbox renders "Online Permitting" rather than "<uuid>".
  const capIds = rows.filter(r => r.n.entityType === 'capability').map(r => r.n.entityId).filter((x): x is string => !!x)
  const appIds = rows.filter(r => r.n.entityType === 'application').map(r => r.n.entityId).filter((x): x is string => !!x)
  const adrIds = rows.filter(r => r.n.entityType === 'adr').map(r => r.n.entityId).filter((x): x is string => !!x)

  const [capNames, appNames, adrNames] = await Promise.all([
    capIds.length > 0
      ? db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities).where(inArray(capabilities.id, capIds))
      : Promise.resolve([]),
    appIds.length > 0
      ? db.select({ id: applications.id, name: applications.name }).from(applications).where(inArray(applications.id, appIds))
      : Promise.resolve([]),
    adrIds.length > 0
      ? db.select({ id: adrs.id, title: adrs.title }).from(adrs).where(inArray(adrs.id, adrIds))
      : Promise.resolve([]),
  ])
  const nameByEntity = new Map<string, string>()
  for (const c of capNames) nameByEntity.set('capability:' + c.id, c.name)
  for (const a of appNames) nameByEntity.set('application:' + a.id, a.name)
  for (const a of adrNames) nameByEntity.set('adr:' + a.id, a.title)

  return rows.map(r => {
    const entityName = r.n.entityId ? nameByEntity.get(`${r.n.entityType}:${r.n.entityId}`) ?? null : null
    const href = r.n.entityId ? hrefFor(r.n.entityType, r.n.entityId) : null
    return {
      id: r.n.id,
      entityType: r.n.entityType,
      entityId: r.n.entityId,
      entityName,
      href,
      action: r.n.action,
      actorEmail: r.actor?.email ?? null,
      actorName: r.actor?.name ?? null,
      summary: r.n.summary,
      readAt: r.n.readAt,
      createdAt: r.n.createdAt,
    }
  })
}

export async function getMyUnreadCount(): Promise<number> {
  const session = await auth()
  if (!session?.user) return 0
  const rows = await db.select({ id: notifications.id })
    .from(notifications)
    .where(and(
      eq(notifications.userId, session.user.id),
      isNull(notifications.readAt),
    ))
    .limit(1000)
  return rows.length
}

export type SubscriptionRow = {
  entityType: string
  entityId: string
  entityName: string | null
  href: string | null
  createdAt: Date
}

export async function getMySubscriptions(): Promise<SubscriptionRow[]> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = session.user.id

  const rows = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))

  // Same per-type name hydration as getMyNotifications, but for the
  // /notifications subscription panel.
  const capIds = rows.filter(r => r.entityType === 'capability').map(r => r.entityId)
  const appIds = rows.filter(r => r.entityType === 'application').map(r => r.entityId)
  const adrIds = rows.filter(r => r.entityType === 'adr').map(r => r.entityId)
  const [capNames, appNames, adrNames] = await Promise.all([
    capIds.length > 0
      ? db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities).where(inArray(capabilities.id, capIds))
      : Promise.resolve([]),
    appIds.length > 0
      ? db.select({ id: applications.id, name: applications.name }).from(applications).where(inArray(applications.id, appIds))
      : Promise.resolve([]),
    adrIds.length > 0
      ? db.select({ id: adrs.id, title: adrs.title }).from(adrs).where(inArray(adrs.id, adrIds))
      : Promise.resolve([]),
  ])
  const nameByEntity = new Map<string, string>()
  for (const c of capNames) nameByEntity.set('capability:' + c.id, c.name)
  for (const a of appNames) nameByEntity.set('application:' + a.id, a.name)
  for (const a of adrNames) nameByEntity.set('adr:' + a.id, a.title)

  return rows.map(r => ({
    entityType: r.entityType,
    entityId: r.entityId,
    entityName: nameByEntity.get(`${r.entityType}:${r.entityId}`) ?? null,
    href: hrefFor(r.entityType, r.entityId),
    createdAt: r.createdAt,
  }))
}

/**
 * Detail-page route for the three notifiable entity types. Centralised so a
 * future addition (or a typo fix — see #550 for the same naive-plural trap)
 * has one place to change.
 */
function hrefFor(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'adr':         return `/adrs/${entityId}`
    case 'capability':  return `/capabilities/${entityId}`
    case 'application': return `/applications/${entityId}`
    default:            return `/${entityType}s/${entityId}` // fall-through for future types
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Caller can only mark their own notification read.
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, session.user.id),
    ))

  revalidatePath('/notifications')
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.userId, session.user.id),
      isNull(notifications.readAt),
    ))

  revalidatePath('/notifications')
}
