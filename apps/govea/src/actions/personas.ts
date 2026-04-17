'use server'

import { db } from '@/db/client'
import { personas, personaTypes, personaTags, tags } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'

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

// ── Persona Types ─────────────────────────────────────────────────────────────

export async function getPersonaTypes(organizationId: string) {
  return db.query.personaTypes.findMany({
    where: (pt, { eq }) => eq(pt.organizationId, organizationId),
    orderBy: (pt, { asc }) => [asc(pt.name)],
  })
}

export async function createPersonaType(name: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const trimmed = name.trim()
  if (!trimmed) throw new Error('Name is required')

  const [pt] = await db.insert(personaTypes).values({
    name: trimmed,
    organizationId: orgId,
  }).onConflictDoNothing().returning()

  if (pt) {
    await writeAuditLog({
      action: 'persona_type.create',
      entityType: 'persona_type',
      entityId: pt.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name: trimmed },
    })
  }
}

export async function deletePersonaType(typeId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.personaTypes.findFirst({
    where: eq(personaTypes.id, typeId),
  })

  await db.delete(personaTypes).where(
    and(eq(personaTypes.id, typeId), eq(personaTypes.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'persona_type.delete',
    entityType: 'persona_type',
    entityId: typeId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name },
  })
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function getTags(organizationId: string) {
  return db.query.tags.findMany({
    where: (t, { eq }) => eq(t.organizationId, organizationId),
    orderBy: (t, { asc }) => [asc(t.name)],
  })
}

export async function createTag(name: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const trimmed = name.trim()
  if (!trimmed) throw new Error('Name is required')

  const [tag] = await db.insert(tags).values({
    name: trimmed,
    organizationId: orgId,
  }).onConflictDoNothing().returning()

  if (tag) {
    await writeAuditLog({
      action: 'tag.create',
      entityType: 'tag',
      entityId: tag.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name: trimmed },
    })
  }
}

export async function deleteTag(tagId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.tags.findFirst({ where: eq(tags.id, tagId) })

  await db.delete(tags).where(
    and(eq(tags.id, tagId), eq(tags.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'tag.delete',
    entityType: 'tag',
    entityId: tagId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name },
  })
}

// ── Personas ──────────────────────────────────────────────────────────────────

export async function getPersona(id: string) {
  return db.query.personas.findFirst({
    where: eq(personas.id, id),
    with: {
      organization: true,
      personaTags: { with: { tag: true } },
    },
  })
}

export async function getPersonas(organizationId: string) {
  const connectedOrgIds = await getConnectedOrgIds(organizationId)

  return db.query.personas.findMany({
    where: (p, { eq, or, and, inArray }) => {
      const base = eq(p.organizationId, organizationId)
      const instanceWide = eq(p.visibility, 'instance')
      if (connectedOrgIds.length === 0) return or(base, instanceWide)
      return or(
        base,
        instanceWide,
        and(
          inArray(p.organizationId, connectedOrgIds),
          inArray(p.visibility, ['connections', 'instance'])
        )
      )
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
