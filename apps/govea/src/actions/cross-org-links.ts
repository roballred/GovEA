'use server'

import { db } from '@/db/client'
import { capabilities, crossOrgLinks, personas } from '@/db/schema'
import { and, eq, or } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { canEdit, isAdmin } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import { canReadFederatedEntity } from '@/lib/federation'
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

async function revalidateLinkPaths(sourceType: CrossOrgEntityType, sourceId: string, targetId: string) {
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

  for (const link of links) {
    const outbound = link.sourceEntityType === type && link.sourceEntityId === entityId
    const peerId = outbound ? link.targetEntityId : link.sourceEntityId
    const peer = await getEntity(type, peerId)
    if (!peer) continue

    const visible = await canReadFederatedEntity(peer.organizationId, peer.visibility, callerOrgId)
    if (!visible && peer.organizationId !== callerOrgId) continue

    const item: CrossOrgLinkItem = {
      id: link.id,
      linkType: link.linkType,
      status: link.status,
      rejectionReason: link.rejectionReason,
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
    const visible = await canReadFederatedEntity(target.organizationId, target.visibility, callerOrgId)
    if (!visible || existingTargetIds.has(target.id)) continue
    availableTargets.push({
      id: target.id,
      name: target.name,
      organizationName: target.organization?.name ?? 'Unknown org',
      visibility: target.visibility,
    })
  }

  return { approved, inboundPending, outboundPending, outboundRejected, availableTargets }
}

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

  let auditLinkId = existing?.id ?? null

  if (existing?.status === 'rejected') {
    await db.update(crossOrgLinks).set({
      linkType,
      status: 'pending',
      rejectionReason: null,
      updatedAt: new Date(),
    }).where(eq(crossOrgLinks.id, existing.id))
  } else {
    const [created] = await db.insert(crossOrgLinks).values({
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

  await writeAuditLog({
    action: 'cross_org_link.request',
    entityType: 'cross_org_link',
    entityId: auditLinkId,
    userId: session.user.id,
    organizationId: source.organizationId,
    after: { sourceEntityId, targetEntityId, linkType, targetOrgId: target.organizationId, type },
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

  const source = await getEntity(link.sourceEntityType as CrossOrgEntityType, link.sourceEntityId)
  const target = await getEntity(link.targetEntityType as CrossOrgEntityType, link.targetEntityId)
  if (!source || !target) throw new Error('Cross-org link points to missing content')

  const sourceVisible = await canReadFederatedEntity(source.organizationId, source.visibility, session.user.organizationId!)
  if (!sourceVisible) throw new Error('Source content is no longer visible under the current federation rules')

  await db.update(crossOrgLinks).set({
    status: 'active',
    rejectionReason: null,
    updatedAt: new Date(),
  }).where(eq(crossOrgLinks.id, linkId))

  await writeAuditLog({
    action: 'cross_org_link.approve',
    entityType: 'cross_org_link',
    entityId: linkId,
    userId: session.user.id,
    organizationId: session.user.organizationId!,
    after: { sourceEntityId: link.sourceEntityId, targetEntityId: link.targetEntityId, type: link.sourceEntityType },
  })

  await revalidateLinkPaths(link.sourceEntityType as CrossOrgEntityType, link.sourceEntityId, link.targetEntityId)
}

export async function rejectCrossOrgLink(linkId: string) {
  const session = await requireAdmin()
  const link = await db.query.crossOrgLinks.findFirst({
    where: and(eq(crossOrgLinks.id, linkId), eq(crossOrgLinks.targetOrgId, session.user.organizationId!)),
  })
  if (!link) throw new Error('Cross-org link not found or not authorized')

  await db.update(crossOrgLinks).set({
    status: 'rejected',
    updatedAt: new Date(),
  }).where(eq(crossOrgLinks.id, linkId))

  await writeAuditLog({
    action: 'cross_org_link.reject',
    entityType: 'cross_org_link',
    entityId: linkId,
    userId: session.user.id,
    organizationId: session.user.organizationId!,
    after: { sourceEntityId: link.sourceEntityId, targetEntityId: link.targetEntityId, type: link.sourceEntityType },
  })

  await revalidateLinkPaths(link.sourceEntityType as CrossOrgEntityType, link.sourceEntityId, link.targetEntityId)
}

export async function withdrawCrossOrgLink(linkId: string) {
  const session = await requireContributor()
  const link = await db.query.crossOrgLinks.findFirst({
    where: and(eq(crossOrgLinks.id, linkId), eq(crossOrgLinks.sourceOrgId, session.user.organizationId!)),
  })
  if (!link) throw new Error('Cross-org link not found or not authorized')

  await db.delete(crossOrgLinks).where(eq(crossOrgLinks.id, linkId))

  await writeAuditLog({
    action: 'cross_org_link.withdraw',
    entityType: 'cross_org_link',
    entityId: linkId,
    userId: session.user.id,
    organizationId: session.user.organizationId!,
    before: { sourceEntityId: link.sourceEntityId, targetEntityId: link.targetEntityId, status: link.status },
  })

  await revalidateLinkPaths(link.sourceEntityType as CrossOrgEntityType, link.sourceEntityId, link.targetEntityId)
}

export async function removeLinksForConnection(orgAId: string, orgBId: string) {
  await db.delete(crossOrgLinks).where(
    or(
      and(eq(crossOrgLinks.sourceOrgId, orgAId), eq(crossOrgLinks.targetOrgId, orgBId)),
      and(eq(crossOrgLinks.sourceOrgId, orgBId), eq(crossOrgLinks.targetOrgId, orgAId)),
    )
  )
}
