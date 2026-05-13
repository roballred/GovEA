'use server'

import { db } from '@/db/client'
import {
  dataEntities, dataAttributes, dataLinks, dataBusinessKeys,
  dataEntityOwners, dataAttributeOwners, dataLinkOwners, dataBusinessKeyOwners,
  type DataEntity, type DataAttribute, type DataLink, type DataBusinessKey,
  type PhysicalAttributeType, type PhysicalLinkType,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { canReadFederatedEntity } from '@/lib/federation'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── Auth gates ──────────────────────────────────────────────────────────────

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

type WorkflowStatus = 'draft' | 'published' | 'archived'
type Visibility = 'org' | 'connections' | 'instance'

// ── Common form parsing ─────────────────────────────────────────────────────

interface CommonFormFields {
  name: string
  description: string | null
  status: WorkflowStatus
  visibility: Visibility
  serverName: string | null
  databaseName: string | null
  schemaName: string | null
  ownerPersonaIds: string[]
}

function parseCommon(formData: FormData): CommonFormFields {
  const ownerPersonaIds = (formData.getAll('ownerPersonaIds') as string[])
    .filter(v => typeof v === 'string' && v.length > 0)
  return {
    name: ((formData.get('name') as string) ?? '').trim(),
    description: ((formData.get('description') as string) ?? '').trim() || null,
    status: ((formData.get('status') as string) ?? 'draft') as WorkflowStatus,
    visibility: ((formData.get('visibility') as string) ?? 'org') as Visibility,
    serverName: ((formData.get('serverName') as string) ?? '').trim() || null,
    databaseName: ((formData.get('databaseName') as string) ?? '').trim() || null,
    schemaName: ((formData.get('schemaName') as string) ?? '').trim() || null,
    ownerPersonaIds,
  }
}

class ValidationError extends Error {}

function validateName(name: string): void {
  if (!name) throw new ValidationError('Name is required')
}

// ── Entity ──────────────────────────────────────────────────────────────────

interface EntityFormInput extends CommonFormFields {
  physicalHubTableName: string | null
}

function parseEntityForm(formData: FormData): EntityFormInput {
  return {
    ...parseCommon(formData),
    physicalHubTableName:
      ((formData.get('physicalHubTableName') as string) ?? '').trim() || null,
  }
}

export async function createDataEntity(formData: FormData): Promise<string> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseEntityForm(formData)
  validateName(input.name)

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(dataEntities).values({
      organizationId: orgId,
      name: input.name,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      physicalHubTableName: input.physicalHubTableName,
      serverName: input.serverName,
      databaseName: input.databaseName,
      schemaName: input.schemaName,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning({ id: dataEntities.id })

    if (input.ownerPersonaIds.length) {
      await tx.insert(dataEntityOwners).values(
        input.ownerPersonaIds.map(personaId => ({ dataEntityId: row.id, personaId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'data_entity.create',
      entityType: 'data_entity',
      entityId: row.id,
      userId: session.user.id,
      organizationId: orgId,
      after: {
        name: input.name, status: input.status, visibility: input.visibility,
        physicalHubTableName: input.physicalHubTableName,
        ownerCount: input.ownerPersonaIds.length,
      },
    })
    return row.id
  })

  revalidatePath('/data/entities')
  return id
}

export async function editDataEntity(entityId: string, formData: FormData): Promise<void> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseEntityForm(formData)
  validateName(input.name)

  const before = await db.query.dataEntities.findFirst({
    where: and(eq(dataEntities.id, entityId), eq(dataEntities.organizationId, orgId)),
  })
  if (!before) throw new Error('Not found')

  await db.transaction(async (tx) => {
    await tx.update(dataEntities).set({
      name: input.name,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      physicalHubTableName: input.physicalHubTableName,
      serverName: input.serverName,
      databaseName: input.databaseName,
      schemaName: input.schemaName,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(eq(dataEntities.id, entityId))

    await tx.delete(dataEntityOwners).where(eq(dataEntityOwners.dataEntityId, entityId))
    if (input.ownerPersonaIds.length) {
      await tx.insert(dataEntityOwners).values(
        input.ownerPersonaIds.map(personaId => ({ dataEntityId: entityId, personaId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'data_entity.update',
      entityType: 'data_entity',
      entityId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before.name, status: before.status, visibility: before.visibility },
      after: {
        name: input.name, status: input.status, visibility: input.visibility,
        ownerCount: input.ownerPersonaIds.length,
      },
    })
  })

  revalidatePath(`/data/entities/${entityId}`)
  revalidatePath('/data/entities')
}

export async function deleteDataEntity(entityId: string): Promise<void> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!
  const before = await db.query.dataEntities.findFirst({
    where: and(eq(dataEntities.id, entityId), eq(dataEntities.organizationId, orgId)),
  })
  if (!before) throw new Error('Not found')

  await db.transaction(async (tx) => {
    await tx.delete(dataEntities).where(eq(dataEntities.id, entityId))
    await writeAuditLog(tx, {
      action: 'data_entity.delete',
      entityType: 'data_entity',
      entityId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before.name, status: before.status },
    })
  })

  revalidatePath('/data/entities')
}

export async function getDataEntities() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const role = session.user.role

  const rows = await db.select().from(dataEntities)
    .where(eq(dataEntities.organizationId, orgId))
    .orderBy(dataEntities.name)
  return rows.filter(r => role !== 'viewer' || r.status === 'published')
}

export async function getDataEntity(id: string): Promise<
  (DataEntity & { ownerPersonaIds: string[] }) | null
> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.dataEntities.findFirst({ where: eq(dataEntities.id, id) })
  if (!row) return null

  const visible = await canReadFederatedEntity(
    row.organizationId, row.visibility, session.user.organizationId!,
  )
  if (!visible) return null
  if (session.user.role === 'viewer' && row.status !== 'published') return null

  const owners = await db
    .select({ id: dataEntityOwners.personaId })
    .from(dataEntityOwners)
    .where(eq(dataEntityOwners.dataEntityId, id))

  return { ...row, ownerPersonaIds: owners.map(o => o.id) }
}

// ── Attribute ───────────────────────────────────────────────────────────────

interface AttributeFormInput extends CommonFormFields {
  physicalSatelliteTableName: string | null
  physicalAttributeType: PhysicalAttributeType | null
}

function parseAttributeForm(formData: FormData): AttributeFormInput {
  const rawType = (formData.get('physicalAttributeType') as string) ?? ''
  return {
    ...parseCommon(formData),
    physicalSatelliteTableName:
      ((formData.get('physicalSatelliteTableName') as string) ?? '').trim() || null,
    physicalAttributeType: rawType
      ? (rawType as PhysicalAttributeType)
      : null,
  }
}

export async function createDataAttribute(formData: FormData): Promise<string> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseAttributeForm(formData)
  validateName(input.name)

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(dataAttributes).values({
      organizationId: orgId,
      name: input.name,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      physicalSatelliteTableName: input.physicalSatelliteTableName,
      serverName: input.serverName,
      databaseName: input.databaseName,
      schemaName: input.schemaName,
      physicalAttributeType: input.physicalAttributeType,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning({ id: dataAttributes.id })

    if (input.ownerPersonaIds.length) {
      await tx.insert(dataAttributeOwners).values(
        input.ownerPersonaIds.map(personaId => ({ dataAttributeId: row.id, personaId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'data_attribute.create',
      entityType: 'data_attribute',
      entityId: row.id,
      userId: session.user.id,
      organizationId: orgId,
      after: {
        name: input.name, status: input.status,
        physicalAttributeType: input.physicalAttributeType,
        ownerCount: input.ownerPersonaIds.length,
      },
    })
    return row.id
  })

  revalidatePath('/data/attributes')
  return id
}

export async function editDataAttribute(attributeId: string, formData: FormData): Promise<void> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseAttributeForm(formData)
  validateName(input.name)

  const before = await db.query.dataAttributes.findFirst({
    where: and(eq(dataAttributes.id, attributeId), eq(dataAttributes.organizationId, orgId)),
  })
  if (!before) throw new Error('Not found')

  await db.transaction(async (tx) => {
    await tx.update(dataAttributes).set({
      name: input.name,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      physicalSatelliteTableName: input.physicalSatelliteTableName,
      serverName: input.serverName,
      databaseName: input.databaseName,
      schemaName: input.schemaName,
      physicalAttributeType: input.physicalAttributeType,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(eq(dataAttributes.id, attributeId))

    await tx.delete(dataAttributeOwners).where(eq(dataAttributeOwners.dataAttributeId, attributeId))
    if (input.ownerPersonaIds.length) {
      await tx.insert(dataAttributeOwners).values(
        input.ownerPersonaIds.map(personaId => ({ dataAttributeId: attributeId, personaId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'data_attribute.update',
      entityType: 'data_attribute',
      entityId: attributeId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before.name, status: before.status, physicalAttributeType: before.physicalAttributeType },
      after: {
        name: input.name, status: input.status,
        physicalAttributeType: input.physicalAttributeType,
        ownerCount: input.ownerPersonaIds.length,
      },
    })
  })

  revalidatePath(`/data/attributes/${attributeId}`)
  revalidatePath('/data/attributes')
}

export async function deleteDataAttribute(attributeId: string): Promise<void> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!
  const before = await db.query.dataAttributes.findFirst({
    where: and(eq(dataAttributes.id, attributeId), eq(dataAttributes.organizationId, orgId)),
  })
  if (!before) throw new Error('Not found')

  await db.transaction(async (tx) => {
    await tx.delete(dataAttributes).where(eq(dataAttributes.id, attributeId))
    await writeAuditLog(tx, {
      action: 'data_attribute.delete',
      entityType: 'data_attribute',
      entityId: attributeId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before.name, status: before.status },
    })
  })

  revalidatePath('/data/attributes')
}

export async function getDataAttributes() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const role = session.user.role

  const rows = await db.select().from(dataAttributes)
    .where(eq(dataAttributes.organizationId, orgId))
    .orderBy(dataAttributes.name)
  return rows.filter(r => role !== 'viewer' || r.status === 'published')
}

export async function getDataAttribute(id: string): Promise<
  (DataAttribute & { ownerPersonaIds: string[] }) | null
> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.dataAttributes.findFirst({ where: eq(dataAttributes.id, id) })
  if (!row) return null

  const visible = await canReadFederatedEntity(
    row.organizationId, row.visibility, session.user.organizationId!,
  )
  if (!visible) return null
  if (session.user.role === 'viewer' && row.status !== 'published') return null

  const owners = await db
    .select({ id: dataAttributeOwners.personaId })
    .from(dataAttributeOwners)
    .where(eq(dataAttributeOwners.dataAttributeId, id))

  return { ...row, ownerPersonaIds: owners.map(o => o.id) }
}

// ── Link ────────────────────────────────────────────────────────────────────

interface LinkFormInput extends CommonFormFields {
  physicalLinkTableName: string | null
  physicalLinkType: PhysicalLinkType | null
}

function parseLinkForm(formData: FormData): LinkFormInput {
  const rawType = (formData.get('physicalLinkType') as string) ?? ''
  return {
    ...parseCommon(formData),
    physicalLinkTableName:
      ((formData.get('physicalLinkTableName') as string) ?? '').trim() || null,
    physicalLinkType: rawType
      ? (rawType as PhysicalLinkType)
      : null,
  }
}

export async function createDataLink(formData: FormData): Promise<string> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseLinkForm(formData)
  validateName(input.name)

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(dataLinks).values({
      organizationId: orgId,
      name: input.name,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      physicalLinkTableName: input.physicalLinkTableName,
      serverName: input.serverName,
      databaseName: input.databaseName,
      schemaName: input.schemaName,
      physicalLinkType: input.physicalLinkType,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning({ id: dataLinks.id })

    if (input.ownerPersonaIds.length) {
      await tx.insert(dataLinkOwners).values(
        input.ownerPersonaIds.map(personaId => ({ dataLinkId: row.id, personaId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'data_link.create',
      entityType: 'data_link',
      entityId: row.id,
      userId: session.user.id,
      organizationId: orgId,
      after: {
        name: input.name, status: input.status,
        physicalLinkType: input.physicalLinkType,
        ownerCount: input.ownerPersonaIds.length,
      },
    })
    return row.id
  })

  revalidatePath('/data/links')
  return id
}

export async function editDataLink(linkId: string, formData: FormData): Promise<void> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseLinkForm(formData)
  validateName(input.name)

  const before = await db.query.dataLinks.findFirst({
    where: and(eq(dataLinks.id, linkId), eq(dataLinks.organizationId, orgId)),
  })
  if (!before) throw new Error('Not found')

  await db.transaction(async (tx) => {
    await tx.update(dataLinks).set({
      name: input.name,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      physicalLinkTableName: input.physicalLinkTableName,
      serverName: input.serverName,
      databaseName: input.databaseName,
      schemaName: input.schemaName,
      physicalLinkType: input.physicalLinkType,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(eq(dataLinks.id, linkId))

    await tx.delete(dataLinkOwners).where(eq(dataLinkOwners.dataLinkId, linkId))
    if (input.ownerPersonaIds.length) {
      await tx.insert(dataLinkOwners).values(
        input.ownerPersonaIds.map(personaId => ({ dataLinkId: linkId, personaId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'data_link.update',
      entityType: 'data_link',
      entityId: linkId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before.name, status: before.status, physicalLinkType: before.physicalLinkType },
      after: {
        name: input.name, status: input.status,
        physicalLinkType: input.physicalLinkType,
        ownerCount: input.ownerPersonaIds.length,
      },
    })
  })

  revalidatePath(`/data/links/${linkId}`)
  revalidatePath('/data/links')
}

export async function deleteDataLink(linkId: string): Promise<void> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!
  const before = await db.query.dataLinks.findFirst({
    where: and(eq(dataLinks.id, linkId), eq(dataLinks.organizationId, orgId)),
  })
  if (!before) throw new Error('Not found')

  await db.transaction(async (tx) => {
    await tx.delete(dataLinks).where(eq(dataLinks.id, linkId))
    await writeAuditLog(tx, {
      action: 'data_link.delete',
      entityType: 'data_link',
      entityId: linkId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before.name, status: before.status },
    })
  })

  revalidatePath('/data/links')
}

export async function getDataLinks() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const role = session.user.role

  const rows = await db.select().from(dataLinks)
    .where(eq(dataLinks.organizationId, orgId))
    .orderBy(dataLinks.name)
  return rows.filter(r => role !== 'viewer' || r.status === 'published')
}

export async function getDataLink(id: string): Promise<
  (DataLink & { ownerPersonaIds: string[] }) | null
> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.dataLinks.findFirst({ where: eq(dataLinks.id, id) })
  if (!row) return null

  const visible = await canReadFederatedEntity(
    row.organizationId, row.visibility, session.user.organizationId!,
  )
  if (!visible) return null
  if (session.user.role === 'viewer' && row.status !== 'published') return null

  const owners = await db
    .select({ id: dataLinkOwners.personaId })
    .from(dataLinkOwners)
    .where(eq(dataLinkOwners.dataLinkId, id))

  return { ...row, ownerPersonaIds: owners.map(o => o.id) }
}

// ── BusinessKey ─────────────────────────────────────────────────────────────

interface BusinessKeyFormInput extends CommonFormFields {
  dataType: string | null
  owningDataEntityId: string
}

function parseBusinessKeyForm(formData: FormData): BusinessKeyFormInput {
  return {
    ...parseCommon(formData),
    dataType: ((formData.get('dataType') as string) ?? '').trim() || null,
    owningDataEntityId: ((formData.get('owningDataEntityId') as string) ?? '').trim(),
  }
}

function validateBusinessKey(input: BusinessKeyFormInput): void {
  validateName(input.name)
  if (!input.owningDataEntityId) {
    throw new ValidationError('Owning entity is required — a business key must instantiate an entity')
  }
}

export async function createDataBusinessKey(formData: FormData): Promise<string> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseBusinessKeyForm(formData)
  validateBusinessKey(input)

  // Confirm the owning entity belongs to the caller's org. Prevents
  // attaching a BK to an entity in another org via a guessed UUID.
  const owningEntity = await db.query.dataEntities.findFirst({
    where: and(
      eq(dataEntities.id, input.owningDataEntityId),
      eq(dataEntities.organizationId, orgId),
    ),
  })
  if (!owningEntity) throw new ValidationError('Owning entity not found in this organization')

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(dataBusinessKeys).values({
      organizationId: orgId,
      name: input.name,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      dataType: input.dataType,
      owningDataEntityId: input.owningDataEntityId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning({ id: dataBusinessKeys.id })

    if (input.ownerPersonaIds.length) {
      await tx.insert(dataBusinessKeyOwners).values(
        input.ownerPersonaIds.map(personaId => ({ dataBusinessKeyId: row.id, personaId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'data_business_key.create',
      entityType: 'data_business_key',
      entityId: row.id,
      userId: session.user.id,
      organizationId: orgId,
      after: {
        name: input.name, status: input.status,
        owningDataEntityId: input.owningDataEntityId,
        ownerCount: input.ownerPersonaIds.length,
      },
    })
    return row.id
  })

  revalidatePath('/data/business-keys')
  revalidatePath(`/data/entities/${input.owningDataEntityId}`)
  return id
}

export async function editDataBusinessKey(bkId: string, formData: FormData): Promise<void> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseBusinessKeyForm(formData)
  validateBusinessKey(input)

  const before = await db.query.dataBusinessKeys.findFirst({
    where: and(eq(dataBusinessKeys.id, bkId), eq(dataBusinessKeys.organizationId, orgId)),
  })
  if (!before) throw new Error('Not found')

  // Same cross-org guard on edit — owningDataEntityId may have been changed.
  const owningEntity = await db.query.dataEntities.findFirst({
    where: and(
      eq(dataEntities.id, input.owningDataEntityId),
      eq(dataEntities.organizationId, orgId),
    ),
  })
  if (!owningEntity) throw new ValidationError('Owning entity not found in this organization')

  await db.transaction(async (tx) => {
    await tx.update(dataBusinessKeys).set({
      name: input.name,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      dataType: input.dataType,
      owningDataEntityId: input.owningDataEntityId,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(eq(dataBusinessKeys.id, bkId))

    await tx.delete(dataBusinessKeyOwners).where(eq(dataBusinessKeyOwners.dataBusinessKeyId, bkId))
    if (input.ownerPersonaIds.length) {
      await tx.insert(dataBusinessKeyOwners).values(
        input.ownerPersonaIds.map(personaId => ({ dataBusinessKeyId: bkId, personaId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'data_business_key.update',
      entityType: 'data_business_key',
      entityId: bkId,
      userId: session.user.id,
      organizationId: orgId,
      before: {
        name: before.name, status: before.status,
        owningDataEntityId: before.owningDataEntityId,
      },
      after: {
        name: input.name, status: input.status,
        owningDataEntityId: input.owningDataEntityId,
        ownerCount: input.ownerPersonaIds.length,
      },
    })
  })

  revalidatePath(`/data/business-keys/${bkId}`)
  revalidatePath('/data/business-keys')
}

export async function deleteDataBusinessKey(bkId: string): Promise<void> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!
  const before = await db.query.dataBusinessKeys.findFirst({
    where: and(eq(dataBusinessKeys.id, bkId), eq(dataBusinessKeys.organizationId, orgId)),
  })
  if (!before) throw new Error('Not found')

  await db.transaction(async (tx) => {
    await tx.delete(dataBusinessKeys).where(eq(dataBusinessKeys.id, bkId))
    await writeAuditLog(tx, {
      action: 'data_business_key.delete',
      entityType: 'data_business_key',
      entityId: bkId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before.name, status: before.status },
    })
  })

  revalidatePath('/data/business-keys')
}

export async function getDataBusinessKeys() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const role = session.user.role

  const rows = await db.select().from(dataBusinessKeys)
    .where(eq(dataBusinessKeys.organizationId, orgId))
    .orderBy(dataBusinessKeys.name)
  return rows.filter(r => role !== 'viewer' || r.status === 'published')
}

export async function getDataBusinessKey(id: string): Promise<
  (DataBusinessKey & { ownerPersonaIds: string[] }) | null
> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.dataBusinessKeys.findFirst({ where: eq(dataBusinessKeys.id, id) })
  if (!row) return null

  const visible = await canReadFederatedEntity(
    row.organizationId, row.visibility, session.user.organizationId!,
  )
  if (!visible) return null
  if (session.user.role === 'viewer' && row.status !== 'published') return null

  const owners = await db
    .select({ id: dataBusinessKeyOwners.personaId })
    .from(dataBusinessKeyOwners)
    .where(eq(dataBusinessKeyOwners.dataBusinessKeyId, id))

  return { ...row, ownerPersonaIds: owners.map(o => o.id) }
}
