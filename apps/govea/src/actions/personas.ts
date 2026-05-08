'use server'

import { db } from '@/db/client'
import { personas, personaTags } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { flagLinksForVisibilityDrop, clearLinksFlag } from '@/lib/cross-org-link-helpers'

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

// ── Personas ──────────────────────────────────────────────────────────────────

export async function getPersona(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const persona = await db.query.personas.findFirst({
    where: eq(personas.id, id),
    with: {
      organization: true,
      personaTags: { with: { tag: true } },
      capabilityPersonas: { with: { capability: true } },
      valueStreamPersonas: { with: { valueStream: true } },
    },
  })

  if (!persona) return null
  const visible = await canReadFederatedEntity(persona.organizationId, persona.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && persona.status !== 'published') return null
  return persona
}

export async function getPersonas() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = await getConnectedOrgIds(organizationId)

  return db.query.personas.findMany({
    where: (p, { eq, or, and, inArray }) => {
      const base = eq(p.organizationId, organizationId)
      const instanceWide = eq(p.visibility, 'instance')
      const statusFilter = isViewer ? eq(p.status, 'published') : undefined
      const orgFilter = connectedOrgIds.length === 0
        ? or(base, instanceWide)
        : or(base, instanceWide, and(inArray(p.organizationId, connectedOrgIds), inArray(p.visibility, ['connections', 'instance'])))
      return statusFilter ? and(orgFilter, statusFilter) : orgFilter
    },
    orderBy: (p, { asc }) => [asc(p.name)],
    with: {
      organization: true,
      personaTags: {
        with: { tag: true },
      },
    },
  })
}

export async function createPersona(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const type = (formData.get('type') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const tagIds = formData.getAll('tagIds') as string[]

  const [persona] = await db.insert(personas).values({
    name,
    description,
    type,
    status,
    visibility,
    organizationId: orgId,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  }).returning()

  if (tagIds.length > 0) {
    await db.insert(personaTags).values(
      tagIds.map(tagId => ({ personaId: persona.id, tagId }))
    )
  }

  await writeAuditLog({
    action: 'persona.create',
    entityType: 'persona',
    entityId: persona.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, description, type, status, tagIds },
  })
}

export async function editPersona(personaId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const type = (formData.get('type') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const tagIds = formData.getAll('tagIds') as string[]

  const before = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(before?.organizationId, orgId)

  await db.update(personas).set({
    name,
    description,
    type,
    status,
    visibility,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).where(and(eq(personas.id, personaId), eq(personas.organizationId, orgId)))

  // Replace junction rows
  await db.delete(personaTags).where(eq(personaTags.personaId, personaId))
  if (tagIds.length > 0) {
    await db.insert(personaTags).values(
      tagIds.map(tagId => ({ personaId, tagId }))
    )
  }

  await writeAuditLog({
    action: 'persona.edit',
    entityType: 'persona',
    entityId: personaId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name, description: before?.description, type: before?.type, status: before?.status },
    after: { name, description, type, status, tagIds },
  })

  // Flag or clear cross-org links when visibility changes.
  const prevVis = before?.visibility
  const visDropped = (prevVis === 'connections' || prevVis === 'instance') && visibility === 'org'
  const visRaised = prevVis === 'org' && (visibility === 'connections' || visibility === 'instance')
  if (visDropped) await flagLinksForVisibilityDrop('persona', personaId, `"${name}" visibility was restricted to org-only — this link may no longer be accessible to the other org`)
  if (visRaised)  await clearLinksFlag('persona', personaId)
}

export async function deletePersona(personaId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(before?.organizationId, orgId)

  await db.delete(personas).where(
    and(eq(personas.id, personaId), eq(personas.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'persona.delete',
    entityType: 'persona',
    entityId: personaId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name },
  })
}

export async function markPersonaReviewed(personaId: string, _formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const record = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(record?.organizationId, orgId)

  const now = new Date()
  await db.update(personas).set({
    lastReviewedBy: session.user.id,
    lastReviewedAt: now,
  }).where(and(eq(personas.id, personaId), eq(personas.organizationId, orgId)))

  await writeAuditLog({
    action: 'persona.reviewed',
    entityType: 'persona',
    entityId: personaId,
    userId: session.user.id,
    organizationId: orgId,
    after: { lastReviewedAt: now.toISOString() },
  })

  revalidatePath(`/personas/${personaId}`)
}
