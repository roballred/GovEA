'use server'

import { db } from '@/db/client'
import { valueStreams, valueStreamStages, valueStreamStageCapabilities } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'

async function requireContributor() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user as any)) throw new Error('Forbidden')
  return session
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user as any)) throw new Error('Forbidden')
  return session
}

// ── Value Streams ─────────────────────────────────────────────────────────────

export async function getValueStreams(organizationId: string) {
  return db.query.valueStreams.findMany({
    where: (vs, { eq }) => eq(vs.organizationId, organizationId),
    orderBy: (vs, { asc }) => [asc(vs.name)],
    with: {
      stages: {
        orderBy: (s, { asc }) => [asc(s.order)],
        with: {
          stageCapabilities: {
            with: { capability: true },
          },
        },
      },
    },
  })
}

export async function getValueStream(id: string) {
  return db.query.valueStreams.findFirst({
    where: (vs, { eq }) => eq(vs.id, id),
    with: {
      stages: {
        orderBy: (s, { asc }) => [asc(s.order)],
        with: {
          stageCapabilities: {
            with: { capability: true },
          },
        },
      },
    },
  })
}

export async function createValueStream(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const valueItem = (formData.get('valueItem') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'

  const [vs] = await db.insert(valueStreams).values({
    name,
    description,
    valueItem,
    status,
    visibility,
    organizationId: orgId,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  }).returning()

  await writeAuditLog({
    action: 'value_stream.create',
    entityType: 'value_stream',
    entityId: vs.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, status },
  })
}

export async function editValueStream(valueStreamId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const valueItem = (formData.get('valueItem') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'

  const before = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, valueStreamId) })

  await db.update(valueStreams).set({
    name,
    description,
    valueItem,
    status,
    visibility,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).where(and(eq(valueStreams.id, valueStreamId), eq(valueStreams.organizationId, orgId)))

  await writeAuditLog({
    action: 'value_stream.edit',
    entityType: 'value_stream',
    entityId: valueStreamId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name, status: before?.status },
    after: { name, status },
  })
}

export async function deleteValueStream(valueStreamId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, valueStreamId) })

  await db.delete(valueStreams).where(
    and(eq(valueStreams.id, valueStreamId), eq(valueStreams.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'value_stream.delete',
    entityType: 'value_stream',
    entityId: valueStreamId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name },
  })
}

// ── Stages ────────────────────────────────────────────────────────────────────

export async function addStage(valueStreamId: string, name: string, description: string) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  // Verify the value stream belongs to this org
  const vs = await db.query.valueStreams.findFirst({
    where: and(eq(valueStreams.id, valueStreamId), eq(valueStreams.organizationId, orgId)),
  })
  if (!vs) throw new Error('Value stream not found')

  // Next order = current max + 1
  const existing = await db.query.valueStreamStages.findMany({
    where: eq(valueStreamStages.valueStreamId, valueStreamId),
  })
  const nextOrder = existing.length > 0 ? Math.max(...existing.map(s => s.order)) + 1 : 0

  await db.insert(valueStreamStages).values({
    valueStreamId,
    name: name.trim(),
    description: description.trim() || null,
    order: nextOrder,
  })
}

export async function editStage(stageId: string, name: string, description: string) {
  const session = await requireContributor()

  await db.update(valueStreamStages).set({
    name: name.trim(),
    description: description.trim() || null,
  }).where(eq(valueStreamStages.id, stageId))
}

export async function deleteStage(stageId: string) {
  await requireContributor()
  await db.delete(valueStreamStages).where(eq(valueStreamStages.id, stageId))
}

export async function moveStage(stageId: string, direction: 'up' | 'down') {
  await requireContributor()

  const stage = await db.query.valueStreamStages.findFirst({
    where: eq(valueStreamStages.id, stageId),
  })
  if (!stage) return

  const siblings = await db.query.valueStreamStages.findMany({
    where: eq(valueStreamStages.valueStreamId, stage.valueStreamId),
    orderBy: (s, { asc }) => [asc(s.order)],
  })

  const idx = siblings.findIndex(s => s.id === stageId)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= siblings.length) return

  const swapStage = siblings[swapIdx]

  await db.update(valueStreamStages)
    .set({ order: swapStage.order })
    .where(eq(valueStreamStages.id, stageId))

  await db.update(valueStreamStages)
    .set({ order: stage.order })
    .where(eq(valueStreamStages.id, swapStage.id))
}

// ── Stage Capabilities ────────────────────────────────────────────────────────

export async function addCapabilityToStage(stageId: string, capabilityId: string) {
  await requireContributor()
  await db.insert(valueStreamStageCapabilities)
    .values({ stageId, capabilityId })
    .onConflictDoNothing()
}

export async function removeCapabilityFromStage(stageId: string, capabilityId: string) {
  await requireContributor()
  await db.delete(valueStreamStageCapabilities).where(
    and(
      eq(valueStreamStageCapabilities.stageId, stageId),
      eq(valueStreamStageCapabilities.capabilityId, capabilityId)
    )
  )
}
