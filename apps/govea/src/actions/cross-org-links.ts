'use server'

import { db } from '@/db/client'
import { capabilities, crossOrgLinks, personas } from '@/db/schema'
import { and, eq, inArray, or } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { canEdit, isAdmin } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import { canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
import { revalidatePath } from 'next/cache'

export type CrossOrgEntityType = 'capability' | 'persona'
export type CrossOrgLinkType = 'implements' | 'extends' | 'maps_to'

export interface CrossOrgTargetOption {
  id: string
  name: string
  organizationName: string
  visibility: 'connections' | 'instance'
}

export interface CrossOrgLinkItem {
  id: string
  linkType: CrossOrgLinkType
  status: 'pending' | 'active' | 'rejected'
  rejectionReason: string | null
  flaggedForReview: boolean
  flagReason: string | null
  peerId: string
  peerName: string
  peerHref: string
  peerOrganizationName: string
}

export interface CrossOrgLinkContext {
  approved: CrossOrgLinkItem[]
  inboundPending: CrossOrgLinkItem[]
  outboundPending: CrossOrgLinkItem[]
  outboundRejected: CrossOrgLinkItem[]
  availableTargets: CrossOrgTargetOption[]
}

type FederatedEntity = NonNullable<Awaited<ReturnType<typeof getEntity>>>

async function requireContributor() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) throw new Error('Forbidden')
  return session
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

async function getEntity(type: CrossOrgEntityType, id: string) {
  if (type === 'capability') {
    const capability = await db.query.capabilities.findFirst({
      where: eq(capabilities.id, id),
      with: { organization: true },
    })
    if (!capability) return null
    return {
      id: capability.id,
      type,
      name: capability.name,
      organizationId: capability.organizationId,
      organizationName: capability.organization?.name ?? 'Unknown org',
      visibility: capability.visibility,
      href: `/capabilities/${capability.id}`,
    }
  }

  const persona = await db.query.personas.findFirst({
    where: eq(personas.id, id),
    with: { organization: true },
  })
  if (!persona) return null
  return {
    id: persona.id,
    type,
    name: persona.name,
    organizationId: persona.organizationId,
    organizationName: persona.organization?.name ?? 'Unknown org',
    visibility: persona.visibility,
    href: `/personas/${persona.id}`,
  }
}

async function getEntities(type: CrossOrgEntityType, ids: string[]) {
  if (ids.length === 0) return new Map<string, FederatedEntity>()

  if (type === 'capability') {
    const results = await db.query.capabilities.findMany({
      where: inArray(capabilities.id, ids),
      with: { organization: true },
    })
    return new Map(results.map(capability => [capability.id, {
      id: capability.id,
      type,
      name: capability.name,
      organizationId: capability.organizationId,
      organizationName: capability.organization?.name ?? 'Unknown org',
      visibility: capability.visibility,
      href: `/capabilities/${capability.id}`,
    }]))
  }

  const results = await db.query.personas.findMany({
    where: inArray(personas.id, ids),
    with: { organization: true },
  })
  return new Map(results.map(persona => [persona.id, {
    id: persona.id,
    type,
    name: persona.name,
    organizationId: persona.organizationId,
    organizationName: persona.organization?.name ?? 'Unknown org',
    visibility: persona.visibility,
    href: `/personas/${persona.id}`,
  }]))
}

async function revalidateLinkPaths(sourceType: CrossOrgEntityType, sourceId: string, targetId: string) {
  // Cross-org links are only allowed within the same entity type today, so both paths
  // can be derived from the source type.
  revalidatePath(sourceType === 'capability' ? `/capabilities/${sourceId}` : `/personas/${sourceId}`)
  revalidatePath(sourceType === 'capability' ? `/capabilities/${targetId}` : `/personas/${targetId}`)
}

export async function getCrossOrgLinkContext(type: CrossOrgEntityType, entityId: string): Promise<CrossOrgLinkContext> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const callerOrgId = session.user.organizationId!
  const entity = await getEntity(type, entityId)
  if (!entity) {
    return {
      approved: [],
      inboundPending: [],
      outboundPending: [],
      outboundRejected: [],
      availableTargets: [],
    }
  }

  const links = await db.query.crossOrgLinks.findMany({
    where: or(
      and(eq(crossOrgLinks.sourceEntityType, type), eq(crossOrgLinks.sourceEntityId, entityId)),
      and(eq(crossOrgLinks.targetEntityType, type), eq(crossOrgLinks.targetEntityId, entityId)),
    ),
    orderBy: (l, { desc }) => [desc(l.updatedAt)],
  })

  const approved: CrossOrgLinkItem[] = []
  const inboundPending: CrossOrgLinkItem[] = []
  const outboundPending: CrossOrgLinkItem[] = []
  const outboundRejected: CrossOrgLinkItem[] = []
  const peerIds = Array.from(new Set(links.map(link =>
    link.sourceEntityType === type && link.sourceEntityId === entityId
      ? link.targetEntityId
      : link.sourceEntityId
  )))
  const peersById = await getEntities(type, peerIds)
  const connectedOrgIds = new Set(await getConnectedOrgIds(callerOrgId))

  function canReadWithContext(organizationId: string | null | undefined, visibility: CrossOrgTargetOption['visibility'] | 'org' | null | undefined) {
    if (!organizationId || !visibility) return false
    if (organizationId === callerOrgId) return true
    if (visibility === 'instance') return true
    return visibility === 'connections' && connectedOrgIds.has(organizationId)
  }

  for (const link of links) {
    const outbound = link.sourceEntityType === type && link.sourceEntityId === entityId
    const peerId = outbound ? link.targetEntityId : link.sourceEntityId
    const peer = peersById.get(peerId)
    if (!peer) continue

    const visible = canReadWithContext(peer.organizationId, peer.visibility)
    // Inbound links (pending or active) bypass the visibility check on the
    // target side — the target org needs to see who is requesting and what
    // they have approved. Without the active-side bypass, approving a link
    // whose source has been dropped back to org-private would silently
    // hide it (#536). New requests are validated up-front to require the
    // source be ≥ connections; the bypass here is a safety net for
    // historical state and for visibility drops after approval.
    const isInbound = !outbound
    const isInboundPendingOrActive = isInbound && (link.status === 'pending' || link.status === 'active')
    if (!visible && peer.organizationId !== callerOrgId && !isInboundPendingOrActive) continue

    const item: CrossOrgLinkItem = {
      id: link.id,
      linkType: link.linkType,
      status: link.status,
      rejectionReason: link.rejectionReason,
      flaggedForReview: link.flaggedForReview,
      flagReason: link.flagReason,
      peerId: peer.id,
      peerName: peer.name,
      peerHref: peer.href,
      peerOrganizationName: peer.organizationName,
    }

    if (link.status === 'active') approved.push(item)
    if (link.status === 'pending' && outbound) outboundPending.push(item)
    if (link.status === 'pending' && !outbound) inboundPending.push(item)
    if (link.status === 'rejected' && outbound) outboundRejected.push(item)
  }

  const availableTargetsRaw = type === 'capability'
    ? await db.query.capabilities.findMany({
        where: (c, { ne, inArray }) => and(
          ne(c.organizationId, callerOrgId),
          inArray(c.visibility, ['connections', 'instance'])
        ),
        with: { organization: true },
        orderBy: (c, { asc }) => [asc(c.name)],
      })
    : await db.query.personas.findMany({
        where: (p, { ne, inArray }) => and(
          ne(p.organizationId, callerOrgId),
          inArray(p.visibility, ['connections', 'instance'])
        ),
        with: { organization: true },
        orderBy: (p, { asc }) => [asc(p.name)],
      })

  const existingTargetIds = new Set(
    links
      .filter(link =>
        link.sourceEntityType === type &&
        link.sourceEntityId === entityId &&
        link.status !== 'rejected'
      )
      .map(link => link.targetEntityId)
  )

  const availableTargets: CrossOrgTargetOption[] = []
  for (const target of availableTargetsRaw) {
    const visible = canReadWithContext(target.organizationId, target.visibility)
    if (!visible || existingTargetIds.has(target.id)) continue
    if (target.visibility !== 'connections' && target.visibility !== 'instance') continue
    availableTargets.push({
      id: target.id,
      name: target.name,
      organizationName: target.organization?.name ?? 'Unknown org',
      visibility: target.visibility,
    })
  }

  return { approved, inboundPending, outboundPending, outboundRejected, availableTargets }
}

// Note: flagLinksForVisibilityDrop and clearLinksFlag previously lived here as
// exported 'use server' functions. They are now internal helpers in
// lib/cross-org-link-helpers.ts so they cannot be reached as RPC endpoints. See #412.

export async function requestCrossOrgLink(
  type: CrossOrgEntityType,
  sourceEntityId: string,
  targetEntityId: string,
  linkType: CrossOrgLinkType,
) {
  const session = await requireContributor()
  const source = await getEntity(type, sourceEntityId)
  const target = await getEntity(type, targetEntityId)
  if (!source || !target) throw new Error('Content not found')
  if (source.organizationId !== session.user.organizationId) throw new Error('Forbidden')
  if (target.organizationId === session.user.organizationId) throw new Error('Use local relationships for same-org links')

  // Source must be published at connections or instance visibility before
  // federating. An org-private source would become invisible to the target
  // after approval, breaking the federation feedback loop (#536).
  if (source.visibility !== 'connections' && source.visibility !== 'instance') {
    throw new Error('Source must be published at connections or instance visibility before linking.')
  }

  const targetVisible = await canReadFederatedEntity(target.organizationId, target.visibility, session.user.organizationId!)
  if (!targetVisible) throw new Error('Target is not visible through the current federation rules')

  const existing = await db.query.crossOrgLinks.findFirst({
    where: and(
      eq(crossOrgLinks.sourceEntityType, type),
      eq(crossOrgLinks.sourceEntityId, sourceEntityId),
      eq(crossOrgLinks.targetEntityType, type),
      eq(crossOrgLinks.targetEntityId, targetEntityId),
    ),
  })

  if (existing?.status === 'pending' || existing?.status === 'active') {
    throw new Error('A cross-org link already exists or is awaiting approval')
  }

  await db.transaction(async (tx) => {
    let auditLinkId = existing?.id ?? null

    if (existing?.status === 'rejected') {
      await tx.update(crossOrgLinks).set({
        linkType,
        status: 'pending',
        rejectionReason: null,
        updatedAt: new Date(),
      }).where(eq(crossOrgLinks.id, existing.id))
    } else {
      const [created] = await tx.insert(crossOrgLinks).values({
        sourceOrgId: source.organizationId,
        sourceEntityType: type,
        sourceEntityId,
        targetOrgId: target.organizationId,
        targetEntityType: type,
        targetEntityId,
        linkType,
        status: 'pending',
        createdBy: session.user.id,
      }).returning()
      auditLinkId = created.id
    }

    await writeAuditLog(tx, {
      action: 'cross_org_link.request',
      entityType: 'cross_org_link',
      entityId: auditLinkId ?? undefined,
      userId: session.user.id,
      organizationId: source.organizationId,
      after: { sourceEntityId, targetEntityId, linkType, targetOrgId: target.organizationId, type },
    })
  })

  await revalidateLinkPaths(type, sourceEntityId, targetEntityId)
}

export async function approveCrossOrgLink(linkId: string) {
  const session = await requireAdmin()
  const link = await db.query.crossOrgLinks.findFirst({
    where: and(eq(crossOrgLinks.id, linkId), eq(crossOrgLinks.targetOrgId, session.user.organizationId!)),
  })
  if (!link) throw new Error('Cross-org link not found or not authorized')
  if (link.status !== 'pending') throw new Error('Only pending links can be approved')

  await db.transaction(async (tx) => {
    await tx.update(crossOrgLinks).set({
      status: 'active',
      rejectionReason: null,
      updatedAt: new Date(),
    }).where(eq(crossOrgLinks.id, linkId))

    await writeAuditLog(tx, {
      action: 'cross_org_link.approve',
      entityType: 'cross_org_link',
      entityId: linkId,
      userId: session.user.id,
      organizationId: session.user.organizationId!,
      after: { sourceEntityId: link.sourceEntityId, targetEntityId: link.targetEntityId, type: link.sourceEntityType },
    })
  })

  await revalidateLinkPaths(link.sourceEntityType as CrossOrgEntityType, link.sourceEntityId, link.targetEntityId)
}

export async function rejectCrossOrgLink(linkId: string, reason?: string) {
  const session = await requireAdmin()
  const link = await db.query.crossOrgLinks.findFirst({
    where: and(eq(crossOrgLinks.id, linkId), eq(crossOrgLinks.targetOrgId, session.user.organizationId!)),
  })
  if (!link) throw new Error('Cross-org link not found or not authorized')
  if (link.status !== 'pending') throw new Error('Only pending links can be rejected')

  await db.transaction(async (tx) => {
    await tx.update(crossOrgLinks).set({
      status: 'rejected',
      rejectionReason: reason?.trim() ? reason.trim() : null,
      updatedAt: new Date(),
    }).where(eq(crossOrgLinks.id, linkId))

    await writeAuditLog(tx, {
      action: 'cross_org_link.reject',
      entityType: 'cross_org_link',
      entityId: linkId,
      userId: session.user.id,
      organizationId: session.user.organizationId!,
      after: { sourceEntityId: link.sourceEntityId, targetEntityId: link.targetEntityId, type: link.sourceEntityType },
    })
  })

  await revalidateLinkPaths(link.sourceEntityType as CrossOrgEntityType, link.sourceEntityId, link.targetEntityId)
}

export async function withdrawCrossOrgLink(linkId: string) {
  const session = await requireContributor()
  const link = await db.query.crossOrgLinks.findFirst({
    where: and(eq(crossOrgLinks.id, linkId), eq(crossOrgLinks.sourceOrgId, session.user.organizationId!)),
  })
  if (!link) throw new Error('Cross-org link not found or not authorized')

  await db.transaction(async (tx) => {
    await tx.delete(crossOrgLinks).where(eq(crossOrgLinks.id, linkId))

    await writeAuditLog(tx, {
      action: 'cross_org_link.withdraw',
      entityType: 'cross_org_link',
      entityId: linkId,
      userId: session.user.id,
      organizationId: session.user.organizationId!,
      before: { sourceEntityId: link.sourceEntityId, targetEntityId: link.targetEntityId, status: link.status },
    })
  })

  await revalidateLinkPaths(link.sourceEntityType as CrossOrgEntityType, link.sourceEntityId, link.targetEntityId)
}

export async function revokeCrossOrgLink(linkId: string) {
  const session = await requireAdmin()
  const link = await db.query.crossOrgLinks.findFirst({
    where: and(eq(crossOrgLinks.id, linkId), eq(crossOrgLinks.targetOrgId, session.user.organizationId!)),
  })
  if (!link) throw new Error('Cross-org link not found or not authorized')
  if (link.status !== 'active') throw new Error('Only active links can be revoked')

  await db.transaction(async (tx) => {
    await tx.delete(crossOrgLinks).where(eq(crossOrgLinks.id, linkId))

    await writeAuditLog(tx, {
      action: 'cross_org_link.revoke',
      entityType: 'cross_org_link',
      entityId: linkId,
      userId: session.user.id,
      organizationId: session.user.organizationId!,
      before: { sourceEntityId: link.sourceEntityId, targetEntityId: link.targetEntityId, status: link.status, type: link.sourceEntityType },
    })
  })

  await revalidateLinkPaths(link.sourceEntityType as CrossOrgEntityType, link.sourceEntityId, link.targetEntityId)
}

// Note: removeLinksForConnection previously lived here as an exported 'use server'
// function with no auth check. It is now an internal helper in
// lib/cross-org-link-helpers.ts that requires the caller to pass actor identity
// (so audit rows are not anonymous). See #412.
