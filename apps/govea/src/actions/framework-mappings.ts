'use server'

import { db } from '@/db/client'
import { frameworkMappings, type TogafDomain, TOGAF_DOMAINS } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'
import { writeAuditLog } from '@/lib/audit'

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getFrameworkMappings(entityType: string, entityId: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return db.query.frameworkMappings.findMany({
    where: and(
      eq(frameworkMappings.organizationId, session.user.organizationId!),
      eq(frameworkMappings.entityType, entityType),
      eq(frameworkMappings.entityId, entityId),
    ),
    orderBy: (t, { asc }) => [asc(t.conceptLabel)],
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function addFrameworkMapping(
  entityType: string,
  entityId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) throw new Error('Forbidden')

  const conceptLabel = formData.get('conceptLabel') as string
  const rationale    = (formData.get('rationale') as string | null) || null

  if (!TOGAF_DOMAINS.includes(conceptLabel as TogafDomain)) {
    throw new Error('Invalid concept label')
  }

  const orgId = session.user.organizationId!

  const [row] = await db
    .insert(frameworkMappings)
    .values({
      organizationId: orgId,
      entityType,
      entityId,
      framework: 'togaf',
      conceptLabel,
      rationale,
      createdBy: session.user.id,
    })
    .returning()

  await writeAuditLog({
    action: 'framework_mapping.add',
    entityType,
    entityId,
    userId: session.user.id,
    organizationId: orgId,
    after: { conceptLabel, rationale },
  })

  revalidatePath(`/${entityType === 'capability' ? 'capabilities' : entityType}/${entityId}`)
  revalidatePath('/reports/togaf/application-landscape')
  return { id: row.id }
}

export async function removeFrameworkMapping(mappingId: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) throw new Error('Forbidden')

  const orgId = session.user.organizationId!

  const [row] = await db
    .delete(frameworkMappings)
    .where(and(
      eq(frameworkMappings.id, mappingId),
      eq(frameworkMappings.organizationId, orgId),  // org boundary
    ))
    .returning()

  if (!row) throw new Error('Not found')

  await writeAuditLog({
    action: 'framework_mapping.remove',
    entityType: row.entityType,
    entityId: row.entityId,
    userId: session.user.id,
    organizationId: orgId,
    before: { conceptLabel: row.conceptLabel, rationale: row.rationale },
  })

  revalidatePath(`/${row.entityType === 'capability' ? 'capabilities' : row.entityType}/${row.entityId}`)
  revalidatePath('/reports/togaf/application-landscape')
}
