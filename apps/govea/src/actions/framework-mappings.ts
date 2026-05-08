'use server'

import { db } from '@/db/client'
import { frameworkMappings, type TogafDomain, TOGAF_DOMAINS } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'
import { writeAuditLog } from '@/lib/audit'
import { assertEntityInOrg, type EntityKind } from '@/lib/federation'

// entityType strings that addFrameworkMapping accepts must map to a known EntityKind
// so we can verify the target belongs to the caller's org. Reject anything else.
const FRAMEWORK_TARGET_KINDS: Record<string, EntityKind> = {
  capability: 'capability',
  application: 'application',
  service: 'service',
  initiative: 'initiative',
  objective: 'objective',
  adr: 'adr',
  principle: 'principle',
  persona: 'persona',
  goal: 'goal',
  value_stream: 'value_stream',
}

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

  // Verify the target entity belongs to the caller's org. Reject any entityType
  // we do not recognize so attacker-controlled rationale text cannot be attached
  // to a foreign or untyped record (#415).
  const targetKind = FRAMEWORK_TARGET_KINDS[entityType]
  if (!targetKind) throw new Error('Invalid entity type')
  await assertEntityInOrg(targetKind, entityId, orgId)

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
