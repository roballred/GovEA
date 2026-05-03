'use server'

import { db } from '@/db/client'
import { customFieldSchemas } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import type { CustomFieldDefinition } from '@/db/schema'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

export async function getCustomFieldSchema(
  organizationId: string,
  entityType: string,
): Promise<CustomFieldDefinition[]> {
  const row = await db.query.customFieldSchemas.findFirst({
    where: and(
      eq(customFieldSchemas.organizationId, organizationId),
      eq(customFieldSchemas.entityType, entityType),
    ),
  })
  return row?.fields ?? []
}

export async function saveCustomFieldSchema(
  entityType: string,
  fields: CustomFieldDefinition[],
): Promise<void> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  await db
    .insert(customFieldSchemas)
    .values({ organizationId: orgId, entityType, fields })
    .onConflictDoUpdate({
      target: [customFieldSchemas.organizationId, customFieldSchemas.entityType],
      set: { fields, updatedAt: new Date() },
    })
}
